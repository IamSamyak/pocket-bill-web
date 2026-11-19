
import {
  collection,
  getDocs,
  orderBy,
  query,
} from 'firebase/firestore'

import { db } from '../firebase'

export interface CollectionBill {
  receiptId: string
  customerName: string
  mobileNumber: string
  billDate: Date
  totalAmount: number
  amountPaid: number
  outstandingAmount: number
}

export async function getUnpaidBills(): Promise<CollectionBill[]> {
  const billsQuery = query(
    collection(db, 'bills'),
    orderBy('billDate', 'desc'),
  )

  const snapshot = await getDocs(billsQuery)

  const unpaidBills = snapshot.docs
    .map((document) => {
      const data = document.data()

      const totalAmount = Number(data.totalAmount ?? 0)

      // Preserve compatibility with older bills that may not
      // have an amountPaid field.
      const amountPaid = data.amountPaid != null
        ? Number(data.amountPaid)
        : data.paid === true
          ? totalAmount
          : 0

      const outstandingAmount = Math.max(
        0,
        totalAmount - amountPaid,
      )

      const billDate = data.billDate?.toDate
        ? data.billDate.toDate()
        : new Date(0)

      return {
        receiptId: String(data.receiptId ?? document.id),
        customerName: String(data.customerName ?? 'Unknown'),
        mobileNumber: String(data.mobileNumber ?? ''),
        billDate,
        totalAmount,
        amountPaid,
        outstandingAmount,
      }
    })
    .filter((bill) => bill.outstandingAmount > 0)
    .sort((a, b) => b.billDate.getTime() - a.billDate.getTime())

  return unpaidBills
}
