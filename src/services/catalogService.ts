
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export interface Category {
  id: string;
  label: string;
  discount: number;
  tag: string | null;
  isFavorite: boolean;
}

export interface InventoryProduct {
  id: string;
  batchId: string;
  batchTitle: string;
  dealerId: string;
  categoryId: string;
  categoryName: string;
  size: string;
  quantity: number;
  soldQuantity: number;
  availableQuantity: number;
  costRate: number;
  sellingRate: number;
  discount: number;
}

export interface CatalogData {
  categories: Category[];
  products: InventoryProduct[];
}

export async function getCatalog(): Promise<CatalogData> {
  const [categorySnapshot, batchSnapshot] = await Promise.all([
    getDocs(collection(db, "categories")),
    getDocs(collection(db, "inventory_batches")),
  ]);

  const categories: Category[] = categorySnapshot.docs.map((doc) => {
    const data = doc.data();

    return {
      id: doc.id,
      label: data.label ?? "Unknown",
      discount: Number(data.discount ?? 0),
      tag: data.tag ?? null,
      isFavorite: data.isFavorite === true,
    };
  });

  const categoryMap = new Map(
    categories.map((category) => [category.id, category])
  );

  const products: InventoryProduct[] = [];

  batchSnapshot.docs.forEach((batchDoc) => {
    const batch = batchDoc.data();
    const items = batch.items ?? {};
    const dealerId = String(batch.dealerId ?? "NA");

    Object.entries(items).forEach(([itemId, rawItem]) => {
      const item = rawItem as Record<string, unknown>;

      const categoryId = String(item.categoryId ?? "");
      const category = categoryMap.get(categoryId);

      const quantity = Number(item.quantity ?? 0);
      const soldQuantity = Number(item.soldQuantity ?? 0);
      const availableQuantity = quantity - soldQuantity;

      // Keep zero-stock products so QR scans can distinguish
      // an existing product from an invalid QR code.
      products.push({
        id: itemId,
        batchId: batchDoc.id,
        batchTitle: String(batch.title ?? ""),
        dealerId,
        categoryId,
        categoryName: category?.label ?? "Unknown Category",
        size: String(item.size ?? ""),
        quantity,
        soldQuantity,
        availableQuantity,
        costRate: Number(item.costRate ?? 0),
        sellingRate: Number(item.sellingRate ?? 0),
        discount: category?.discount ?? 0,
      });
    });
  });

  return { categories, products };
}
