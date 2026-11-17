
import { jsPDF } from 'jspdf'
import type { HistoryBill } from './billHistoryService'
import type { ShopDetail } from './shopProfileService'

const PAGE_WIDTH = 80
const MARGIN = 5
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

const money = (value: number) =>
  Number(value || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })

const formatDate = (date: Date) =>
  date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

const formatTime = (date: Date) =>
  date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

function itemTotal(
  item: HistoryBill['purchaseList'][number],
) {
  if (Number.isFinite(item.total) && item.total >= 0) {
    return item.total
  }

  const gross = item.rate * item.quantity

  return Math.max(
    0,
    gross - Math.floor((gross * item.discount) / 100),
  )
}

export function generateBillPdf(
  bill: HistoryBill,
  shop: ShopDetail,
  getCategoryName: (categoryId: string) => string,
): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [PAGE_WIDTH, 200],
    compress: true,
  })

  const columnWidths = [23, 8, 10, 8, 21]
  const columnX = [
    MARGIN,
    MARGIN + columnWidths[0],
    MARGIN + columnWidths[0] + columnWidths[1],
    MARGIN + columnWidths[0] + columnWidths[1] + columnWidths[2],
    MARGIN + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3],
  ]

  const itemRows = bill.purchaseList.map((item) => {
    const label = getCategoryName(item.productCategoryId)
    const lines = doc.splitTextToSize(label, columnWidths[0] - 1)

    return {
      item,
      labelLines: lines as string[],
      amount: itemTotal(item),
      height: Math.max(7, (lines as string[]).length * 3.2 + 4),
    }
  })

  const subtotal = bill.purchaseList.reduce(
    (sum, item) => sum + item.rate * item.quantity,
    0,
  )

  const totalDiscount = bill.purchaseList.reduce(
    (sum, item) =>
      sum + item.rate * item.quantity - itemTotal(item),
    0,
  )

  const calculatedGrandTotal = bill.purchaseList.reduce(
    (sum, item) => sum + itemTotal(item),
    0,
  )

  // Use the saved bill total as the source of truth.
  const grandTotal = bill.totalAmount ?? calculatedGrandTotal

  // Calculate the complete receipt height before drawing.
  const shopNameLines = doc.splitTextToSize(
    shop.shopName || 'Shop',
    CONTENT_WIDTH,
  ) as string[]

  const addressLines = doc.splitTextToSize(
    shop.address || '',
    CONTENT_WIDTH,
  ) as string[]

  const mobileNumbers = [
    shop.mobileNumber,
    shop.alternateMobileNumber,
  ]
    .filter((number) => number?.trim())
    .join(', ')

  const mobileLines = doc.splitTextToSize(
    `Phone: ${mobileNumbers}`,
    CONTENT_WIDTH,
  ) as string[]

  const customerLines = bill.customerName.trim()
    ? (doc.splitTextToSize(
        `Customer: ${bill.customerName}`,
        CONTENT_WIDTH,
      ) as string[])
    : []

  const headerHeight =
    10 +
    shopNameLines.length * 6 +
    addressLines.length * 3.5 +
    mobileLines.length * 3.5 +
    12 +
    7 +
    customerLines.length * 3.5 +
    6 +
    9

  const tableHeight =
    8 + itemRows.reduce((sum, row) => sum + row.height, 0)

  const summaryHeight = 35
  const footerHeight = 19
  const pageHeight =
    headerHeight + tableHeight + summaryHeight + footerHeight + 12

  // Recreate with the exact dynamic page height.
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [PAGE_WIDTH, pageHeight],
    compress: true,
  })

  let y = 10

  // Shop name.
  pdf.setTextColor(35, 35, 35)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(15)

  pdf.text(shopNameLines, PAGE_WIDTH / 2, y, {
    align: 'center',
  })

  y += shopNameLines.length * 6 + 1

  // Shop address.
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7.5)

  if (addressLines.length > 0) {
    pdf.text(addressLines, PAGE_WIDTH / 2, y, {
      align: 'center',
    })

    y += addressLines.length * 3.5
  }

  if (mobileLines.length > 0 && mobileNumbers) {
    pdf.text(mobileLines, PAGE_WIDTH / 2, y, {
      align: 'center',
    })

    y += mobileLines.length * 3.5
  }

  y += 3

  // Receipt heading.
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.text('RECEIPT', PAGE_WIDTH / 2, y, {
    align: 'center',
  })

  y += 6

  // Receipt details.
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)

  pdf.text(`Receipt #: ${bill.receiptId}`, MARGIN, y)
  pdf.text(`Bill Date: ${formatDate(bill.billDate)}`, PAGE_WIDTH - MARGIN, y, {
    align: 'right',
  })

  y += 4

  if (customerLines.length > 0) {
    pdf.text(customerLines, MARGIN, y)
    y += customerLines.length * 3.5
  }

  pdf.text(
    `Bill Time: ${formatTime(bill.billDate)}`,
    PAGE_WIDTH / 2,
    y,
    { align: 'center' },
  )

  y += 6

  // Table header.
  pdf.setDrawColor(80, 80, 80)
  pdf.setLineWidth(0.2)
  pdf.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)

  y += 4

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(6.5)

  pdf.text('ITEM', columnX[0], y)
  pdf.text('QTY', columnX[1] + columnWidths[1] / 2, y, {
    align: 'center',
  })
  pdf.text('RATE', columnX[2] + columnWidths[2], y, {
    align: 'right',
  })
  pdf.text('DIS', columnX[3] + columnWidths[3], y, {
    align: 'right',
  })
  pdf.text('AMOUNT', columnX[4] + columnWidths[4], y, {
    align: 'right',
  })

  y += 2
  pdf.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)

  // Item rows.
  for (const row of itemRows) {
    y += 4

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(6.5)

    pdf.text(row.labelLines, columnX[0], y)

    pdf.text(
      String(row.item.quantity),
      columnX[1] + columnWidths[1] / 2,
      y,
      { align: 'center' },
    )

    pdf.text(
      money(row.item.rate),
      columnX[2] + columnWidths[2],
      y,
      { align: 'right' },
    )

    pdf.text(
      `${row.item.discount}%`,
      columnX[3] + columnWidths[3],
      y,
      { align: 'right' },
    )

    pdf.text(
      money(row.amount),
      columnX[4] + columnWidths[4],
      y,
      { align: 'right' },
    )

    y += Math.max(3, (row.labelLines.length - 1) * 3.2)

    pdf.setDrawColor(190, 190, 190)
    pdf.setLineWidth(0.1)
    pdf.line(MARGIN, y + 1, PAGE_WIDTH - MARGIN, y + 1)

    y += 2
  }

  y += 3

  // Items summary.
  pdf.setDrawColor(80, 80, 80)
  pdf.setLineWidth(0.2)
  pdf.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)

  y += 5

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)

  pdf.text('Items Total', MARGIN + 1, y)
  pdf.text(money(subtotal), PAGE_WIDTH - MARGIN - 1, y, {
    align: 'right',
  })

  y += 5

  pdf.text('Total Discount', MARGIN + 1, y)
  pdf.text(money(totalDiscount), PAGE_WIDTH - MARGIN - 1, y, {
    align: 'right',
  })

  y += 3

  // Grand total.
  pdf.setLineWidth(0.2)
  pdf.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)

  y += 6

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)

  pdf.text('Grand Total', MARGIN + 1, y)
  pdf.text(money(grandTotal), PAGE_WIDTH - MARGIN - 1, y, {
    align: 'right',
  })

  y += 3
  pdf.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)

  // Footer.
  y += 8

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8)

  pdf.text('THANK YOU FOR SHOPPING!', PAGE_WIDTH / 2, y, {
    align: 'center',
  })

  y += 4

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(6.5)

  const exchangeLines = pdf.splitTextToSize(
    'Items can be exchanged within 3 days (No returns).',
    CONTENT_WIDTH,
  )

  pdf.text(exchangeLines, PAGE_WIDTH / 2, y, {
    align: 'center',
  })

  return pdf.output('blob')
}
