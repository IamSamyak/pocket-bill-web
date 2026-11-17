
import {
  doc,
  runTransaction,
  serverTimestamp,
  Timestamp,
  type DocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";

import { db } from "../firebase";

export interface BillPurchaseItem {
  categoryId: string;
  batchId: string;
  inventoryId: string;
  rate: number;
  quantity: number;
  discount: number;
  size: string;
}

export type PaymentMethod = "cash" | "upi" | "card";

export interface CreateBillInput {
  customerName: string;
  mobileNumber: string;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  purchaseList: BillPurchaseItem[];
}

export interface CreatedBill {
  receiptId: string;
  totalAmount: number;
  amountPaid: number;
  paid: boolean;
  billDate: Date;
}

interface InventoryDeduction {
  batchId: string;
  itemId: string;
  quantity: number;
}

function calculateItemTotal(item: BillPurchaseItem): number {
  const grossAmount = item.rate * item.quantity;

  const discountAmount = Math.floor(
    (grossAmount * item.discount) / 100
  );

  return grossAmount - discountAmount;
}

function isInventoryTracked(item: BillPurchaseItem): boolean {
  const batchId = item.batchId.trim();
  const inventoryId = item.inventoryId.trim();

  return (
    batchId !== "" &&
    inventoryId !== "" &&
    batchId !== "NA" &&
    inventoryId !== "NA"
  );
}

function getReceiptDatePart(date: Date): string {
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}${month}${day}`;
}

function validateBill(input: CreateBillInput): void {
  if (!input.purchaseList.length) {
    throw new Error("Please add at least one item.");
  }

  for (const item of input.purchaseList) {
    if (!Number.isFinite(item.rate) || item.rate < 0) {
      throw new Error("Invalid item rate.");
    }

    if (
      !Number.isInteger(item.quantity) ||
      item.quantity <= 0
    ) {
      throw new Error(
        "Item quantity must be a positive whole number."
      );
    }

    if (
      !Number.isFinite(item.discount) ||
      item.discount < 0 ||
      item.discount > 100
    ) {
      throw new Error("Invalid item discount.");
    }
  }

  if (!Number.isFinite(input.amountPaid)) {
    throw new Error("Invalid amount paid.");
  }
}

function aggregateInventoryDeductions(
  purchaseList: BillPurchaseItem[]
): InventoryDeduction[] {
  const deductions = new Map<string, InventoryDeduction>();

  for (const item of purchaseList) {
    if (!isInventoryTracked(item)) {
      continue;
    }

    const batchId = item.batchId.trim();
    const itemId = item.inventoryId.trim();

    const key = JSON.stringify([batchId, itemId]);

    const existing = deductions.get(key);

    if (existing) {
      existing.quantity += item.quantity;
    } else {
      deductions.set(key, {
        batchId,
        itemId,
        quantity: item.quantity,
      });
    }
  }

  return Array.from(deductions.values());
}

export async function createBill(
  input: CreateBillInput
): Promise<CreatedBill> {
  validateBill(input);

  const now = new Date();
  const datePart = getReceiptDatePart(now);

  const counterRef = doc(
    db,
    "counters",
    `receipts_${datePart}`
  );

  const deductions = aggregateInventoryDeductions(
    input.purchaseList
  );

  const batchRefs = new Map(
    deductions.map((deduction) => [
      deduction.batchId,
      doc(db, "inventory_batches", deduction.batchId),
    ])
  );

  const totalAmount = input.purchaseList.reduce(
    (total, item) => total + calculateItemTotal(item),
    0
  );

  const amountPaid = Math.min(
    Math.max(0, Math.trunc(input.amountPaid)),
    totalAmount
  );

  const paid = amountPaid >= totalAmount;

  const purchaseList = input.purchaseList.map((item) => ({
    productCategoryId: item.categoryId,
    batchId: item.batchId,
    inventoryId: item.inventoryId,
    rate: item.rate,
    quantity: item.quantity,
    discount: item.discount,
    size: item.size,
    total: calculateItemTotal(item),
  }));

  return runTransaction(db, async (transaction) => {
    // ----------------------------------------
    // 1. READ PHASE
    // All transaction reads happen before writes.
    // ----------------------------------------

    const counterSnapshot = await transaction.get(counterRef);

    const batchSnapshots = new Map<
      string,
      DocumentSnapshot<DocumentData>
    >();

    for (const [batchId, batchRef] of batchRefs) {
      const snapshot = await transaction.get(batchRef);
      batchSnapshots.set(batchId, snapshot);
    }

    // ----------------------------------------
    // 2. GENERATE RECEIPT ID
    // Format: YYMMDD + 4-digit counter
    // ----------------------------------------

    const currentCount = Number(
      counterSnapshot.data()?.count ?? 0
    );

    const newCount = currentCount + 1;

    const receiptId = `${datePart}${String(newCount).padStart(4, "0")}`;

    const finalBillRef = doc(db, "bills", receiptId);

    // ----------------------------------------
    // 3. VALIDATE INVENTORY
    // ----------------------------------------


    const updatedBatches = new Map<
      string,
      Record<string, Record<string, unknown>>
    >()

    for (const deduction of deductions) {
      const batchSnapshot = batchSnapshots.get(deduction.batchId)

      if (!batchSnapshot?.exists()) {
        throw new Error(
          `Inventory batch ${deduction.batchId} was not found.`,
        )
      }

      // Reuse already-modified items when processing
      // another product belonging to the same batch.
      let items = updatedBatches.get(deduction.batchId)

      if (!items) {
        const batchData = batchSnapshot.data()

        items = {
          ...((batchData.items ?? {}) as Record<
            string,
            Record<string, unknown>
          >),
        }
      }

      const inventoryItem = items[deduction.itemId]

      if (!inventoryItem) {
        throw new Error(
          `Inventory item ${deduction.itemId} was not found in batch ${deduction.batchId}.`,
        )
      }

      const quantity = Number(inventoryItem.quantity ?? 0)
      const soldQuantity = Number(inventoryItem.soldQuantity ?? 0)
      const availableQuantity = quantity - soldQuantity

      if (deduction.quantity > availableQuantity) {
        throw new Error(
          `Insufficient stock for inventory item ${deduction.itemId}. Available: ${availableQuantity}, requested: ${deduction.quantity}.`,
        )
      }

      items[deduction.itemId] = {
        ...inventoryItem,
        soldQuantity: soldQuantity + deduction.quantity,
      }

      updatedBatches.set(deduction.batchId, items)
    }


    // ----------------------------------------
    // 4. WRITE PHASE
    // ----------------------------------------

    // Update daily receipt counter.
    transaction.set(counterRef, {
      count: newCount,
    });

    // Save bill using the existing Flutter schema.
    transaction.set(finalBillRef, {
      receiptId,
      customerName: input.customerName.trim() || "Unknown",
      mobileNumber: input.mobileNumber.trim(),
      billDate: Timestamp.fromDate(now),
      paymentMethod: input.paymentMethod,
      totalAmount,
      amountPaid,
      paid,
      purchaseList,
      timestamp: serverTimestamp(),
    });

    // Deduct inventory.
    for (const [batchId, updatedItems] of updatedBatches) {
      transaction.update(batchRefs.get(batchId)!, {
        items: updatedItems,
      });
    }

    // ----------------------------------------
    // 5. RETURN RESULT
    // ----------------------------------------

    return {
      receiptId,
      totalAmount,
      amountPaid,
      paid,
      billDate: now,
    };
  });
}
