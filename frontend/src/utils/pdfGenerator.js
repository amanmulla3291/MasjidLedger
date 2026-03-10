import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDate, formatCurrency } from './helpers'

// ── Shared helpers ───────────────────────────────────────────

const MASJID_NAME = 'Sunni Jamma Masjid, Tambave'
const GREEN = [26, 92, 42]
const LIGHT_GREEN = [240, 253, 244]
const RED = [180, 30, 30]
const LIGHT_RED = [255, 240, 240]

function rupees(amount) {
  return `Rs. ${Number(amount).toLocaleString('en-IN')}`
}

function generatedOn() {
  return `Generated on ${new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  })}`
}

function addHeader(doc, title, subtitle = null, landscape = false) {
  const center = landscape ? 148 : 105

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(26, 92, 42)
  doc.text(MASJID_NAME, center, 18, { align: 'center' })

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  doc.text(title, center, 27, { align: 'center' })

  let y = 27
  if (subtitle) {
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(subtitle, center, 34, { align: 'center' })
    y = 34
  }

  doc.setDrawColor(...GREEN)
  doc.setLineWidth(0.8)
  doc.line(14, y + 5, landscape ? 283 : 196, y + 5)

  return y + 10
}

function addFooter(doc, landscape = false) {
  const pageCount = doc.internal.getNumberOfPages()
  const pageW = landscape ? 297 : 210

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(140)
    doc.text(generatedOn(), 14, doc.internal.pageSize.height - 8)
    doc.text(
      `${MASJID_NAME} — Private Record | Page ${i} of ${pageCount}`,
      pageW - 14,
      doc.internal.pageSize.height - 8,
      { align: 'right' }
    )
  }
}

function table(doc, { startY, head, body, foot, headColor, footColor, footTextColor, colStyles }) {
  autoTable(doc, {
    startY,
    head,
    body,
    foot,
    theme: 'striped',
    headStyles: {
      fillColor: headColor || GREEN,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    footStyles: {
      fillColor: footColor || LIGHT_GREEN,
      textColor: footTextColor || [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: { fontSize: 9, cellPadding: 3 },
    alternateRowStyles: { fillColor: [250, 255, 250] },
    columnStyles: colStyles || {},
    margin: { left: 14, right: 14 },
    didParseCell(data) {
      // Colour income green, expense red in ledger
      if (data.column.index === 4 && data.section === 'body') {
        data.cell.styles.textColor = [0, 128, 0]
      }
      if (data.column.index === 5 && data.section === 'body') {
        data.cell.styles.textColor = [200, 0, 0]
      }
    },
  })
  return doc.lastAutoTable.finalY
}

// ── 1. Friday Collections Monthly PDF ───────────────────────

export function generateMonthlyCollectionPDF(year, month, collections, monthName) {
  const doc = new jsPDF()
  const startY = addHeader(doc, `Friday Collections — ${monthName} ${year}`)

  const body = collections.map((c, i) => [
    i + 1,
    formatDate(c.date),
    c.notes || '—',
    rupees(c.amount),
  ])

  const total = collections.reduce((s, c) => s + Number(c.amount), 0)

  table(doc, {
    startY,
    head: [['#', 'Date', 'Notes', 'Amount']],
    body,
    foot: [['', `Total Fridays: ${collections.length}`, '', rupees(total)]],
    colStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 38 },
      2: { cellWidth: 100 },
      3: { cellWidth: 36, halign: 'right' },
    },
  })

  addFooter(doc)
  doc.save(`Friday_Collections_${monthName}_${year}.pdf`)
}

// ── 2. Ramzan Eid Report PDF ─────────────────────────────────

export function generateRamzanPDF(ramzanYear, contributions) {
  const doc = new jsPDF()

  const subtitle = `Hafiz: ${ramzanYear.hafiz_name} | Year: ${ramzanYear.year}`
  const startY = addHeader(doc, 'Ramzan Contribution Report', subtitle)

  // Summary box
  const paidContribs = contributions.filter(c => c.payment_status !== 'pending')
  const pendingContribs = contributions.filter(c => c.payment_status === 'pending')
  const totalPaid = paidContribs.reduce((s, c) => s + Number(c.amount), 0)
  const totalPending = pendingContribs.reduce((s, c) => s + Number(c.amount), 0)
  const expectedSalary = Number(ramzanYear.expected_salary || 0)

  doc.setFillColor(...LIGHT_GREEN)
  doc.roundedRect(14, startY, 182, 22, 2, 2, 'F')
  doc.setFontSize(9)
  doc.setTextColor(40)
  doc.text(`Total Collected: ${rupees(totalPaid)}`, 20, startY + 8)
  doc.text(`Pending: ${rupees(totalPending)}`, 80, startY + 8)
  doc.text(`Hafiz Salary Target: ${rupees(expectedSalary)}`, 140, startY + 8)
  doc.text(`Total Members: ${contributions.length}`, 20, startY + 17)
  doc.text(`Paid: ${paidContribs.length}  |  Pending: ${pendingContribs.length}`, 80, startY + 17)
  const balance = totalPaid - expectedSalary
  doc.setTextColor(balance >= 0 ? 0 : 200, balance >= 0 ? 128 : 0, 0)
  doc.text(`Balance: ${rupees(balance)}`, 140, startY + 17)

  // Contributions table
  doc.setTextColor(40)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Member Contributions', 14, startY + 30)

  const body = contributions.map((c, i) => {
    const memberName = c.jamat_members?.name || c.member_name || '—'
    const status = c.payment_status === 'pending' ? 'Pending' : 'Paid'
    return [
      i + 1,
      memberName,
      c.payment_date ? formatDate(c.payment_date) : '—',
      rupees(c.amount),
      c.payment_mode || 'Cash',
      status,
      c.notes || '—',
    ]
  })

  const finalY = table(doc, {
    startY: startY + 33,
    head: [['#', 'Member Name', 'Date', 'Amount', 'Mode', 'Status', 'Notes']],
    body,
    foot: [[
      '', `Members: ${contributions.length}`, '',
      rupees(totalPaid + totalPending), '', '', ''
    ]],
    colStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 45 },
      2: { cellWidth: 28 },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 22 },
      5: { cellWidth: 20 },
      6: { cellWidth: 35 },
    },
  })

  // Pending members note
  if (pendingContribs.length > 0) {
    doc.setFontSize(9)
    doc.setTextColor(180, 60, 0)
    doc.text(`⚠ ${pendingContribs.length} member(s) have pending payments totalling ${rupees(totalPending)}`, 14, finalY + 10)
  }

  addFooter(doc)
  doc.save(`Ramzan_Report_${ramzanYear.year}.pdf`)
}

// ── 3. Full Ledger PDF ───────────────────────────────────────

export function generateLedgerPDF(year, collections, expenses, incomes = []) {
  const doc = new jsPDF('landscape')
  const startY = addHeader(doc, `Financial Ledger — Year ${year}`, null, true)

  const allEntries = [
    ...(collections || []).map(c => ({
      date: c.date,
      type: 'Collection',
      description: `Friday Collection${c.notes ? ' — ' + c.notes : ''}`,
      income: Number(c.amount),
      expense: 0,
    })),
    ...(incomes || []).map(i => ({
      date: i.date,
      type: 'Income',
      description: `${i.category} — ${i.donor_name}`,
      income: Number(i.amount),
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

  let balance = 0
  const body = allEntries.map((entry, i) => {
    balance += entry.income - entry.expense
    return [
      i + 1,
      formatDate(entry.date),
      entry.type,
      entry.description,
      entry.income > 0 ? rupees(entry.income) : '',
      entry.expense > 0 ? rupees(entry.expense) : '',
      rupees(balance),
    ]
  })

  const totalIncome = allEntries.reduce((s, e) => s + e.income, 0)
  const totalExpense = allEntries.reduce((s, e) => s + e.expense, 0)

  table(doc, {
    startY,
    head: [['#', 'Date', 'Type', 'Description', 'Income', 'Expense', 'Balance']],
    body,
    foot: [['', '', '', 'TOTALS', rupees(totalIncome), rupees(totalExpense), rupees(totalIncome - totalExpense)]],
    colStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 28 },
      2: { cellWidth: 24 },
      3: { cellWidth: 100 },
      4: { cellWidth: 32, halign: 'right' },
      5: { cellWidth: 32, halign: 'right' },
      6: { cellWidth: 32, halign: 'right' },
    },
  })

  addFooter(doc, true)
  doc.save(`Masjid_Ledger_${year}.pdf`)
}

// ── 4. Expense Report PDF ────────────────────────────────────

export function generateExpensePDF(year, expenses) {
  const doc = new jsPDF()
  const startY = addHeader(doc, `Expense Report — Year ${year}`)

  const body = expenses.map((e, i) => [
    i + 1,
    formatDate(e.date),
    e.title,
    e.category,
    rupees(e.amount),
    e.notes || '—',
  ])

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0)

  table(doc, {
    startY,
    head: [['#', 'Date', 'Title', 'Category', 'Amount', 'Notes']],
    body,
    foot: [['', '', '', `Total: ${expenses.length} entries`, rupees(total), '']],
    headColor: RED,
    footColor: LIGHT_RED,
    colStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 30 },
      2: { cellWidth: 45 },
      3: { cellWidth: 35 },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 44 },
    },
  })

  addFooter(doc)
  doc.save(`Expense_Report_${year}.pdf`)
}

// ── 5. Income Report PDF ─────────────────────────────────────

export function generateIncomePDF(year, incomes) {
  const doc = new jsPDF()
  const startY = addHeader(doc, `Income Report — Year ${year}`)

  const body = incomes.map((inc, i) => [
    i + 1,
    formatDate(inc.date),
    inc.category,
    inc.donor_name,
    rupees(inc.amount),
    inc.payment_mode || '—',
    inc.notes || '—',
  ])

  const total = incomes.reduce((s, i) => s + Number(i.amount), 0)

  table(doc, {
    startY,
    head: [['#', 'Date', 'Category', 'Donor', 'Amount', 'Mode', 'Notes']],
    body,
    foot: [['', '', '', `Total: ${incomes.length} entries`, rupees(total), '', '']],
    colStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 28 },
      2: { cellWidth: 28 },
      3: { cellWidth: 42 },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 24 },
      6: { cellWidth: 34 },
    },
  })

  addFooter(doc)
  doc.save(`Income_Report_${year}.pdf`)
}