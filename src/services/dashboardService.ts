
import {
  collection,
  getDocs,
  orderBy,
  query,
  Timestamp,
  where,
} from 'firebase/firestore'

import { db } from '../firebase'

export interface DashboardBillItem {
  productCategoryId: string
  quantity: number
  size: string
  total: number
}

export interface DashboardBill {
  receiptId: string
  billDate: Date
  paymentMethod: string
  totalAmount: number
  amountPaid: number
  purchaseList: DashboardBillItem[]
}

export interface SalesMetrics {
  totalSales: number
  collected: number
  outstanding: number
  billCount: number
  unitsSold: number
  averageBillValue: number
}

export interface PaymentBreakdown {
  paymentMethod: string
  amount: number
}

export interface CategorySales {
  categoryId: string
  quantity: number
  amount: number
}

export interface DailySales {
  date: string
  sales: number
}

export interface DashboardData {
  overview: SalesMetrics
  previousOverview: SalesMetrics
  today: SalesMetrics
  paymentBreakdown: PaymentBreakdown[]
  topCategories: CategorySales[]
  salesTrend: DailySales[]
}

function getStartOfDay(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  )
}

function getMetrics(bills: DashboardBill[]): SalesMetrics {
  const totalSales = bills.reduce(
    (sum, bill) => sum + bill.totalAmount,
    0,
  )

  const collected = bills.reduce(
    (sum, bill) => sum + bill.amountPaid,
    0,
  )

  const outstanding = bills.reduce(
    (sum, bill) =>
      sum + Math.max(0, bill.totalAmount - bill.amountPaid),
    0,
  )

  const unitsSold = bills.reduce(
    (sum, bill) =>
      sum +
      bill.purchaseList.reduce(
        (itemSum, item) => itemSum + item.quantity,
        0,
      ),
    0,
  )

  return {
    totalSales,
    collected,
    outstanding,
    billCount: bills.length,
    unitsSold,
    averageBillValue:
      bills.length > 0 ? totalSales / bills.length : 0,
  }
}

export async function getDashboardData(): Promise<DashboardData> {
  const todayStart = getStartOfDay(new Date())
  const tomorrowStart = new Date(todayStart)
  tomorrowStart.setDate(tomorrowStart.getDate() + 1)

  // Current 7 calendar days, including today.
  const currentPeriodStart = new Date(todayStart)
  currentPeriodStart.setDate(currentPeriodStart.getDate() - 6)

  // Previous 7 calendar days.
  const previousPeriodStart = new Date(currentPeriodStart)
  previousPeriodStart.setDate(previousPeriodStart.getDate() - 7)

  // Fetch both 7-day periods and today in one query.
  const billsQuery = query(
    collection(db, 'bills'),
    where(
      'billDate',
      '>=',
      Timestamp.fromDate(previousPeriodStart),
    ),
    where(
      'billDate',
      '<',
      Timestamp.fromDate(tomorrowStart),
    ),
    orderBy('billDate', 'desc'),
  )

  const snapshot = await getDocs(billsQuery)

  const bills: DashboardBill[] = snapshot.docs.map((document) => {
    const data = document.data()

    const purchaseList: DashboardBillItem[] = Array.isArray(
      data.purchaseList,
    )
      ? data.purchaseList.map(
          (item: Record<string, unknown>) => ({
            productCategoryId: String(
              item.productCategoryId ?? '',
            ),
            quantity: Math.max(0, Number(item.quantity ?? 0)),
            size: String(item.size ?? ''),
            total: Number(item.total ?? 0),
          }),
        )
      : []

    return {
      receiptId: String(data.receiptId ?? document.id),
      billDate: data.billDate?.toDate
        ? data.billDate.toDate()
        : new Date(),
      paymentMethod: String(
        data.paymentMethod ?? 'unknown',
      ).trim().toLowerCase(),
      totalAmount: Number(data.totalAmount ?? 0),
      amountPaid: Number(data.amountPaid ?? 0),
      purchaseList,
    }
  })

  const currentPeriodBills = bills.filter(
    (bill) => bill.billDate >= currentPeriodStart,
  )

  const previousPeriodBills = bills.filter(
    (bill) =>
      bill.billDate >= previousPeriodStart &&
      bill.billDate < currentPeriodStart,
  )

  const todayBills = bills.filter(
    (bill) => bill.billDate >= todayStart,
  )

  // Payment mode breakdown uses actual collected amounts.
  // Assumes one payment method per bill.
  const paymentMap = new Map<string, number>()

  todayBills.forEach((bill) => {
    const method = bill.paymentMethod || 'unknown'

    paymentMap.set(
      method,
      (paymentMap.get(method) ?? 0) + bill.amountPaid,
    )
  })

  const paymentBreakdown: PaymentBreakdown[] = Array.from(
    paymentMap,
    ([paymentMethod, amount]) => ({
      paymentMethod,
      amount,
    }),
  )
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount)

  // Today's category-wise sales.
  const categoryMap = new Map<
    string,
    { quantity: number; amount: number }
  >()

  todayBills.forEach((bill) => {
    bill.purchaseList.forEach((item) => {
      const categoryId = item.productCategoryId || 'unknown'
      const existing = categoryMap.get(categoryId) ?? {
        quantity: 0,
        amount: 0,
      }

      categoryMap.set(categoryId, {
        quantity: existing.quantity + item.quantity,
        amount: existing.amount + item.total,
      })
    })
  })

  const topCategories: CategorySales[] = Array.from(
    categoryMap,
    ([categoryId, values]) => ({
      categoryId,
      ...values,
    }),
  ).sort((a, b) => b.amount - a.amount)

  // Daily sales trend for the current 7-day period.
  const dailyMap = new Map<string, number>()

  for (let i = 0; i < 7; i++) {
    const date = new Date(currentPeriodStart)
    date.setDate(date.getDate() + i)

    const dateKey = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-')

    dailyMap.set(dateKey, 0)
  }

  currentPeriodBills.forEach((bill) => {
    const date = bill.billDate
    const dateKey = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-')

    dailyMap.set(
      dateKey,
      (dailyMap.get(dateKey) ?? 0) + bill.totalAmount,
    )
  })

  const salesTrend: DailySales[] = Array.from(
    dailyMap,
    ([date, sales]) => ({ date, sales }),
  )

  return {
    overview: getMetrics(currentPeriodBills),
    previousOverview: getMetrics(previousPeriodBills),
    today: getMetrics(todayBills),
    paymentBreakdown,
    topCategories,
    salesTrend,
  }
}
