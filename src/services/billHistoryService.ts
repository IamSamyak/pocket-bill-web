
import {
  collection,
  getDocs,
  orderBy,
  query,
  Timestamp,
  where,
} from 'firebase/firestore'

import { db } from '../firebase'

export interface HistoryBillItem {
  productCategoryId: string
  batchId: string
  inventoryId: string
  rate: number
  quantity: number
  discount: number
  size: string
  total: number
}

export interface HistoryBill {
  receiptId: string
  customerName: string
  mobileNumber: string
  billDate: Date
  paymentMethod: string
  totalAmount: number
  amountPaid: number
  paid: boolean
  purchaseList: HistoryBillItem[]
}

export async function getTodaysBills(): Promise<HistoryBill[]> {
  const now = new Date()

  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  )

  const startOfTomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  )

  const billsQuery = query(
    collection(db, 'bills'),
    where('billDate', '>=', Timestamp.fromDate(startOfDay)),
    where('billDate', '<', Timestamp.fromDate(startOfTomorrow)),
    orderBy('billDate', 'desc'),
  )

  const snapshot = await getDocs(billsQuery)

  return snapshot.docs.map((document) => {
    const data = document.data()

    const purchaseList: HistoryBillItem[] = Array.isArray(
      data.purchaseList,
    )
      ? data.purchaseList.map((item: Record<string, unknown>) => ({
          productCategoryId: String(item.productCategoryId ?? ''),
          batchId: String(item.batchId ?? 'NA'),
          inventoryId: String(item.inventoryId ?? 'NA'),
          rate: Number(item.rate ?? 0),
          quantity: Number(item.quantity ?? 0),
          discount: Number(item.discount ?? 0),
          size: String(item.size ?? 'NA'),
          total: Number(item.total ?? 0),
        }))
      : []

    const totalAmount = Number(data.totalAmount ?? 0)
    const amountPaid = Number(data.amountPaid ?? 0)

    return {
      receiptId: String(data.receiptId ?? document.id),
      customerName: String(data.customerName ?? ''),
      mobileNumber: String(data.mobileNumber ?? ''),
      billDate: data.billDate?.toDate
        ? data.billDate.toDate()
        : new Date(),
      paymentMethod: String(data.paymentMethod ?? 'cash'),
      totalAmount,
      amountPaid,
      paid: amountPaid >= totalAmount,
      purchaseList,
    }
  })
}
