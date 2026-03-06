import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { formatDate, formatCurrency, MONTHS } from './helpers'

// ============================================================
// RAMZAN EID REPORT
// ============================================================
export function generateRamzanPDF(ramzanYear, contributions) {
  const doc = new jsPDF()

  // Header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Masjid Ledger', 105, 18, { align: 'center' })

  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text(`Ramzan Contribution Report ${ramzanYear.year}`, 105, 28, { align: 'center' })

  doc.setFontSize(11)
  doc.text(`Hafiz: ${ramzanYear.hafiz_name}`, 105, 36, { align: 'center' })

  // Divider
  doc.setDrawColor(34, 85, 34)
  doc.setLineWidth(0.8)
  doc.line(14, 40, 196, 40)

  // Table
  const tableData = contributions.map((c, i) => [
    i + 1,
    c.member_name,
    formatDate(c.payment_date),
    `Rs. ${Number(c.amount).toLocaleString('en-IN')}`,
    c.notes || '',
  ])

  const totalAmount = contributions.reduce((s, c) => s + Number(c.amount), 0)

  doc.autoTable({
    startY: 45,
    head: [['#', 'Member Name', 'Payment Date', 'Amount', 'Notes']],
    body: tableData,
    foot: [['', `Total Members: ${contributions.length}`, '', `Total: Rs. ${totalAmount.toLocaleString('en-IN')}`, '']],
    theme: 'striped',
    headStyles: {
      fillColor: [34, 85, 34],
      textColor: 255,
      fontStyle: 'bold',
    },
    footStyles: {
      fillColor: [240, 255, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 55 },
      2: { cellWidth: 35 },
      3: { cellWidth: 35 },
      4: { cellWidth: 50 },
    },
    styles: { fontSize: 10, cellPadding: 4 },
    margin: { left: 14, right: 14 },
  })

  // Footer
  const finalY = doc.lastAutoTable.finalY + 10
  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text(
    `Generated on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`,
    14,
    finalY
  )
  doc.text('Masjid Ledger — Private Record', 196, finalY, { align: 'right' })

  doc.save(`Ramzan_Contribution_Report_${ramzanYear.year}.pdf`)
}

// ============================================================
// MONTHLY COLLECTION REPORT
// ============================================================
export function generateMonthlyCollectionPDF(year, month, collections, monthName) {
  const doc = new jsPDF()

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Masjid Ledger', 105, 18, { align: 'center' })

  doc.setFontSize(13)
  doc.setFont('helvetica', 'normal')
  doc.text(`Friday Collections — ${monthName} ${year}`, 105, 28, { align: 'center' })

  doc.setDrawColor(34, 85, 34)
  doc.setLineWidth(0.8)
  doc.line(14, 33, 196, 33)

  const tableData = collections.map((c, i) => [
    i + 1,
    formatDate(c.date),
    c.notes || '',
    `Rs. ${Number(c.amount).toLocaleString('en-IN')}`,
  ])

  const total = collections.reduce((s, c) => s + Number(c.amount), 0)

  doc.autoTable({
    startY: 37,
    head: [['#', 'Date', 'Notes', 'Amount']],
    body: tableData,
    foot: [['', `Total Fridays: ${collections.length}`, '', `Total: Rs. ${total.toLocaleString('en-IN')}`]],
    theme: 'striped',
    headStyles: { fillColor: [34, 85, 34], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [240, 255, 240], fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 4 },
    margin: { left: 14, right: 14 },
  })

  doc.save(`Friday_Collections_${monthName}_${year}.pdf`)
}

// ============================================================
// FULL LEDGER PDF
// ============================================================
export function generateLedgerPDF(year, collections, expenses) {
  const doc = new jsPDF('landscape')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Masjid Ledger', 148, 18, { align: 'center' })

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`Financial Ledger — Year ${year}`, 148, 26, { align: 'center' })

  doc.setDrawColor(34, 85, 34)
  doc.setLineWidth(0.8)
  doc.line(14, 30, 282, 30)

  // Combine and sort all transactions
  const allEntries = [
    ...(collections || []).map(c => ({
      date: c.date,
      type: 'Income',
      description: `Friday Donation${c.notes ? ' - ' + c.notes : ''}`,
      income: Number(c.amount),
      expense: 0,
    })),
    ...(expenses || []).map(e => ({
      date: e.date,
      type: 'Expense',
      description: `${e.title} (${e.category})`,
      income: 0,
      expense: Number(e.amount),
    })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date))

  let runningBalance = 0
  const tableData = allEntries.map((entry, i) => {
    runningBalance += entry.income - entry.expense
    return [
      i + 1,
      formatDate(entry.date),
      entry.type,
      entry.description,
      entry.income > 0 ? `+Rs. ${entry.income.toLocaleString('en-IN')}` : '',
      entry.expense > 0 ? `-Rs. ${entry.expense.toLocaleString('en-IN')}` : '',
      `Rs. ${runningBalance.toLocaleString('en-IN')}`,
    ]
  })

  const totalIncome = allEntries.reduce((s, e) => s + e.income, 0)
  const totalExpense = allEntries.reduce((s, e) => s + e.expense, 0)

  doc.autoTable({
    startY: 35,
    head: [['#', 'Date', 'Type', 'Description', 'Income', 'Expense', 'Balance']],
    body: tableData,
    foot: [['', '', '', 'TOTAL', `Rs. ${totalIncome.toLocaleString('en-IN')}`, `Rs. ${totalExpense.toLocaleString('en-IN')}`, `Rs. ${(totalIncome - totalExpense).toLocaleString('en-IN')}`]],
    theme: 'striped',
    headStyles: { fillColor: [34, 85, 34], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [240, 255, 240], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      4: { textColor: [0, 128, 0] },
      5: { textColor: [200, 0, 0] },
    },
    margin: { left: 14, right: 14 },
  })

  doc.save(`Masjid_Ledger_${year}.pdf`)
}

// ============================================================
// EXPENSE REPORT PDF
// ============================================================
export function generateExpensePDF(year, expenses) {
  const doc = new jsPDF()

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Masjid Ledger', 105, 18, { align: 'center' })

  doc.setFontSize(13)
  doc.setFont('helvetica', 'normal')
  doc.text(`Expense Report — Year ${year}`, 105, 28, { align: 'center' })

  doc.setDrawColor(34, 85, 34)
  doc.setLineWidth(0.8)
  doc.line(14, 33, 196, 33)

  const tableData = expenses.map((e, i) => [
    i + 1,
    formatDate(e.date),
    e.title,
    e.category,
    `Rs. ${Number(e.amount).toLocaleString('en-IN')}`,
    e.notes || '',
  ])

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0)

  doc.autoTable({
    startY: 37,
    head: [['#', 'Date', 'Title', 'Category', 'Amount', 'Notes']],
    body: tableData,
    foot: [['', '', '', `Total Expenses: ${expenses.length}`, `Rs. ${total.toLocaleString('en-IN')}`, '']],
    theme: 'striped',
    headStyles: { fillColor: [180, 30, 30], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [255, 240, 240], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 },
    margin: { left: 14, right: 14 },
  })

  doc.save(`Expense_Report_${year}.pdf`)
}
