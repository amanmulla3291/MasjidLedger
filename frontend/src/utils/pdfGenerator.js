import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDate } from './helpers'

// ── Palette ──────────────────────────────────────────────────
const GREEN      = [26, 92, 42]
const GREEN_PALE = [240, 248, 242]
const GRAY_DARK  = [30, 30, 30]
const GRAY_MID   = [100, 100, 100]
const GRAY_LIGHT = [220, 220, 220]
const WHITE      = [255, 255, 255]

const MASJID = 'Sunni Jamma Masjid, Tambave'

function rs(n) {
  return `Rs. ${Number(n).toLocaleString('en-IN')}`
}

function today() {
  return new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

// ── Page footer ───────────────────────────────────────────────
function addPageFooter(doc, pageW = 210) {
  const pages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    const y = doc.internal.pageSize.height - 10
    doc.setDrawColor(...GRAY_LIGHT)
    doc.setLineWidth(0.3)
    doc.line(14, y - 4, pageW - 14, y - 4)
    doc.setFontSize(7.5)
    doc.setTextColor(...GRAY_MID)
    doc.setFont('helvetica', 'normal')
    doc.text(`Generated on ${today()}`, 14, y)
    doc.text(`Page ${i} of ${pages}`, pageW / 2, y, { align: 'center' })
    doc.text(`${MASJID} — Confidential`, pageW - 14, y, { align: 'right' })
  }
}

// ════════════════════════════════════════════════════════════
// RAMZAN EID REPORT — clean minimal design
// ════════════════════════════════════════════════════════════
export async function generateRamzanPDF(ramzanYear, contributions) {
  const doc   = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = 210
  const paid    = contributions.filter(c => c.payment_status !== 'pending')
  const pending = contributions.filter(c => c.payment_status === 'pending')
  const totalPaid    = paid.reduce((s, c) => s + Number(c.amount), 0)
  const totalPending = pending.reduce((s, c) => s + Number(c.amount), 0)
  const expected     = Number(ramzanYear.expected_salary || 0)
  const balance      = totalPaid - expected

  // ── Top green bar ─────────────────────────────────────────
  doc.setFillColor(...GREEN)
  doc.rect(0, 0, pageW, 28, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...WHITE)
  doc.text(MASJID, pageW / 2, 11, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(200, 230, 210)
  doc.text('Ramzan Contribution Report', pageW / 2, 18, { align: 'center' })
  doc.text(`Ramzan ${ramzanYear.year}  ·  Hafiz: ${ramzanYear.hafiz_name}`, pageW / 2, 24, { align: 'center' })

  // ── Summary cards row ─────────────────────────────────────
  const cardY = 34
  const cardH = 22
  const cards = [
    { label: 'Members',        value: String(contributions.length),  sub: `${paid.length} paid · ${pending.length} pending` },
    { label: 'Total Collected', value: rs(totalPaid),                sub: pending.length > 0 ? `+ ${rs(totalPending)} pending` : 'All settled' },
    { label: 'Salary Target',  value: rs(expected),                  sub: '' },
    { label: 'Balance',        value: rs(Math.abs(balance)),         sub: balance >= 0 ? 'Surplus' : 'Deficit', red: balance < 0 },
  ]

  const cardW = (pageW - 28 - 9) / 4  // 4 cards with gaps
  cards.forEach((card, i) => {
    const x = 14 + i * (cardW + 3)

    // Card bg
    doc.setFillColor(...GREEN_PALE)
    doc.setDrawColor(...GRAY_LIGHT)
    doc.setLineWidth(0.3)
    doc.roundedRect(x, cardY, cardW, cardH, 2, 2, 'FD')

    // Left accent bar
    doc.setFillColor(...GREEN)
    doc.rect(x, cardY, 2, cardH, 'F')

    // Label
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...GRAY_MID)
    doc.text(card.label.toUpperCase(), x + 5, cardY + 6)

    // Value
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(card.red ? 180 : GRAY_DARK[0], card.red ? 30 : GRAY_DARK[1], card.red ? 30 : GRAY_DARK[2])
    doc.text(card.value, x + 5, cardY + 13)

    // Sub
    if (card.sub) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.setTextColor(...GRAY_MID)
      doc.text(card.sub, x + 5, cardY + 19)
    }
  })

  // ── Section title ─────────────────────────────────────────
  let y = cardY + cardH + 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...GREEN)
  doc.text('CONTRIBUTION DETAILS', 14, y)
  doc.setDrawColor(...GREEN)
  doc.setLineWidth(0.4)
  doc.line(14, y + 2, pageW - 14, y + 2)

  // ── Font loading for Devanagari ───────────────────────────
  let devFont = 'helvetica'
  try {
    const TTF_URLS = [
      '/NotoSansDevanagari-Regular.ttf',
      'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf',
    ]
    for (const url of TTF_URLS) {
      try {
        const res = await fetch(url)
        if (!res.ok) continue
        const buf   = await res.arrayBuffer()
        const bytes = new Uint8Array(buf)
        const isTTF = (bytes[0] === 0x00 && bytes[1] === 0x01) || (bytes[0] === 0x74 && bytes[1] === 0x72)
        if (!isTTF) continue
        let bin = ''
        for (let i = 0; i < bytes.byteLength; i += 8192)
          bin += String.fromCharCode(...bytes.subarray(i, i + 8192))
        doc.addFileToVFS('NotoDevanagari.ttf', btoa(bin))
        doc.addFont('NotoDevanagari.ttf', 'NotoDevanagari', 'normal')
        devFont = 'NotoDevanagari'
        break
      } catch { continue }
    }
  } catch { /* fallback to helvetica */ }

  // ── Contributions table ───────────────────────────────────
  const body = contributions.map((c, i) => {
    const name   = c.jamat_members?.name || c.member_name || '—'
    const status = c.payment_status === 'pending' ? 'Pending' : 'Paid'
    return [i + 1, name, c.payment_date ? formatDate(c.payment_date) : '—', rs(c.amount), c.payment_mode || 'Cash', status]
  })

  autoTable(doc, {
    startY: y + 5,
    head:   [['#', 'Member Name', 'Date', 'Amount', 'Mode', 'Status']],
    body,
    theme:  'plain',
    headStyles: {
      fillColor:  GREEN,
      textColor:  WHITE,
      fontStyle:  'bold',
      fontSize:   8,
      cellPadding: 4,
    },
    bodyStyles: {
      fontSize:    8.5,
      cellPadding: 3.5,
      font:        'helvetica',
      textColor:   GRAY_DARK,
    },
    alternateRowStyles: {
      fillColor: [248, 251, 249],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', textColor: GRAY_MID },
      1: { cellWidth: 55 },
      2: { cellWidth: 30 },
      3: { cellWidth: 32, halign: 'right' },
      4: { cellWidth: 25 },
      5: { cellWidth: 22, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
    didParseCell(data) {
      // Devanagari font for member name column
      if (data.column.index === 1 && data.section === 'body' && devFont !== 'helvetica') {
        data.cell.styles.font = devFont
      }
      // Color status cell
      if (data.column.index === 5 && data.section === 'body') {
        const val = data.cell.raw
        data.cell.styles.textColor = val === 'Paid' ? GREEN : [200, 100, 0]
        data.cell.styles.fontStyle = 'bold'
      }
    },
    didDrawCell(data) {
      // Thin bottom border on each row
      if (data.section === 'body') {
        doc.setDrawColor(...GRAY_LIGHT)
        doc.setLineWidth(0.2)
        doc.line(data.cell.x, data.cell.y + data.cell.height,
                 data.cell.x + data.cell.width, data.cell.y + data.cell.height)
      }
    },
  })

  // ── Totals row ────────────────────────────────────────────
  const finalY = doc.lastAutoTable.finalY

  doc.setFillColor(...GREEN)
  doc.rect(14, finalY, pageW - 28, 9, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...WHITE)
  doc.text(`Total Members: ${contributions.length}`, 19, finalY + 6)
  doc.text(`Total Collected: ${rs(totalPaid + totalPending)}`, pageW - 19, finalY + 6, { align: 'right' })

  // ── Pending note ──────────────────────────────────────────
  if (pending.length > 0) {
    doc.setFontSize(7.5)
    doc.setTextColor(180, 80, 0)
    doc.setFont('helvetica', 'italic')
    doc.text(
      `⚠  ${pending.length} member(s) have pending payments totalling ${rs(totalPending)}`,
      14, finalY + 16
    )
  }

  addPageFooter(doc)
  doc.save(`Ramzan_Report_${ramzanYear.year}.pdf`)
}

// ════════════════════════════════════════════════════════════
// FRIDAY COLLECTIONS MONTHLY PDF
// ════════════════════════════════════════════════════════════
export function generateMonthlyCollectionPDF(year, month, collections, monthName) {
  const doc   = new jsPDF()
  const pageW = 210

  doc.setFillColor(...GREEN)
  doc.rect(0, 0, pageW, 22, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...WHITE)
  doc.text(MASJID, pageW / 2, 10, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(200, 230, 210)
  doc.text(`Friday Collections — ${monthName} ${year}`, pageW / 2, 18, { align: 'center' })

  const total = collections.reduce((s, c) => s + Number(c.amount), 0)

  autoTable(doc, {
    startY: 28,
    head:   [['#', 'Date', 'Notes', 'Amount']],
    body:   collections.map((c, i) => [i + 1, formatDate(c.date), c.notes || '—', rs(c.amount)]),
    theme:  'plain',
    headStyles:    { fillColor: GREEN, textColor: WHITE, fontStyle: 'bold', fontSize: 8, cellPadding: 4 },
    bodyStyles:    { fontSize: 8.5, cellPadding: 3.5, textColor: GRAY_DARK },
    alternateRowStyles: { fillColor: [248, 251, 249] },
    columnStyles:  { 0: { cellWidth: 12, halign: 'center' }, 3: { cellWidth: 36, halign: 'right' } },
    margin:        { left: 14, right: 14 },
  })

  const fy = doc.lastAutoTable.finalY
  doc.setFillColor(...GREEN)
  doc.rect(14, fy, pageW - 28, 9, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...WHITE)
  doc.text(`Total Fridays: ${collections.length}`, 19, fy + 6)
  doc.text(rs(total), pageW - 19, fy + 6, { align: 'right' })

  addPageFooter(doc)
  doc.save(`Friday_Collections_${monthName}_${year}.pdf`)
}

// ════════════════════════════════════════════════════════════
// FULL LEDGER PDF
// ════════════════════════════════════════════════════════════
export function generateLedgerPDF(year, collections, expenses, incomes = []) {
  const doc   = new jsPDF('landscape')
  const pageW = 297

  doc.setFillColor(...GREEN)
  doc.rect(0, 0, pageW, 22, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...WHITE)
  doc.text(MASJID, pageW / 2, 10, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(200, 230, 210)
  doc.text(`Financial Ledger — Year ${year}`, pageW / 2, 18, { align: 'center' })

  const entries = [
    ...(collections || []).map(c => ({ date: c.date, type: 'Collection', desc: `Friday Collection${c.notes ? ' — ' + c.notes : ''}`, income: Number(c.amount), expense: 0 })),
    ...(incomes     || []).map(i => ({ date: i.date, type: 'Income',     desc: `${i.category} — ${i.donor_name}`,                      income: Number(i.amount), expense: 0 })),
    ...(expenses    || []).map(e => ({ date: e.date, type: 'Expense',    desc: `${e.title} (${e.category})`,                           income: 0, expense: Number(e.amount) })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date))

  let bal = 0
  const body = entries.map((e, i) => {
    bal += e.income - e.expense
    return [i + 1, formatDate(e.date), e.type, e.desc,
      e.income  > 0 ? rs(e.income)  : '',
      e.expense > 0 ? rs(e.expense) : '',
      rs(bal)]
  })

  const totalIn  = entries.reduce((s, e) => s + e.income,  0)
  const totalOut = entries.reduce((s, e) => s + e.expense, 0)

  autoTable(doc, {
    startY: 28,
    head:   [['#', 'Date', 'Type', 'Description', 'Income', 'Expense', 'Balance']],
    body,
    theme:  'plain',
    headStyles:    { fillColor: GREEN, textColor: WHITE, fontStyle: 'bold', fontSize: 8, cellPadding: 4 },
    bodyStyles:    { fontSize: 8, cellPadding: 3, textColor: GRAY_DARK },
    alternateRowStyles: { fillColor: [248, 251, 249] },
    columnStyles:  {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 26 },
      2: { cellWidth: 22 },
      3: { cellWidth: 90 },
      4: { cellWidth: 30, halign: 'right', textColor: [0, 110, 40] },
      5: { cellWidth: 30, halign: 'right', textColor: [180, 30, 30] },
      6: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  })

  const fy = doc.lastAutoTable.finalY
  doc.setFillColor(...GREEN)
  doc.rect(14, fy, pageW - 28, 9, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...WHITE)
  doc.text('TOTALS', 19, fy + 6)
  doc.text(`In: ${rs(totalIn)}   Out: ${rs(totalOut)}   Net: ${rs(totalIn - totalOut)}`, pageW - 19, fy + 6, { align: 'right' })

  addPageFooter(doc, pageW)
  doc.save(`Masjid_Ledger_${year}.pdf`)
}

// ════════════════════════════════════════════════════════════
// EXPENSE REPORT PDF
// ════════════════════════════════════════════════════════════
export function generateExpensePDF(year, expenses) {
  const doc   = new jsPDF()
  const pageW = 210

  doc.setFillColor(...GREEN)
  doc.rect(0, 0, pageW, 22, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...WHITE)
  doc.text(MASJID, pageW / 2, 10, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(200, 230, 210)
  doc.text(`Expense Report — Year ${year}`, pageW / 2, 18, { align: 'center' })

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0)

  autoTable(doc, {
    startY: 28,
    head:   [['#', 'Date', 'Title', 'Category', 'Amount', 'Notes']],
    body:   expenses.map((e, i) => [i + 1, formatDate(e.date), e.title, e.category, rs(e.amount), e.notes || '—']),
    theme:  'plain',
    headStyles:    { fillColor: [160, 30, 30], textColor: WHITE, fontStyle: 'bold', fontSize: 8, cellPadding: 4 },
    bodyStyles:    { fontSize: 8.5, cellPadding: 3.5, textColor: GRAY_DARK },
    alternateRowStyles: { fillColor: [252, 248, 248] },
    columnStyles:  {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 28 },
      2: { cellWidth: 50 },
      3: { cellWidth: 32 },
      4: { cellWidth: 30, halign: 'right', textColor: [160, 30, 30], fontStyle: 'bold' },
      5: { cellWidth: 36 },
    },
    margin: { left: 14, right: 14 },
  })

  const fy = doc.lastAutoTable.finalY
  doc.setFillColor(160, 30, 30)
  doc.rect(14, fy, pageW - 28, 9, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...WHITE)
  doc.text(`Total Expenses: ${expenses.length}`, 19, fy + 6)
  doc.text(rs(total), pageW - 19, fy + 6, { align: 'right' })

  addPageFooter(doc)
  doc.save(`Expense_Report_${year}.pdf`)
}

// ════════════════════════════════════════════════════════════
// INCOME REPORT PDF
// ════════════════════════════════════════════════════════════
export function generateIncomePDF(year, incomes) {
  const doc   = new jsPDF()
  const pageW = 210

  doc.setFillColor(...GREEN)
  doc.rect(0, 0, pageW, 22, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...WHITE)
  doc.text(MASJID, pageW / 2, 10, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(200, 230, 210)
  doc.text(`Income Report — Year ${year}`, pageW / 2, 18, { align: 'center' })

  const total = incomes.reduce((s, i) => s + Number(i.amount), 0)

  autoTable(doc, {
    startY: 28,
    head:   [['#', 'Date', 'Category', 'Donor', 'Amount', 'Mode']],
    body:   incomes.map((inc, i) => [i + 1, formatDate(inc.date), inc.category, inc.donor_name, rs(inc.amount), inc.payment_mode || '—']),
    theme:  'plain',
    headStyles:    { fillColor: GREEN, textColor: WHITE, fontStyle: 'bold', fontSize: 8, cellPadding: 4 },
    bodyStyles:    { fontSize: 8.5, cellPadding: 3.5, textColor: GRAY_DARK },
    alternateRowStyles: { fillColor: [248, 251, 249] },
    columnStyles:  {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 28 },
      2: { cellWidth: 32 },
      3: { cellWidth: 55 },
      4: { cellWidth: 32, halign: 'right', textColor: GREEN, fontStyle: 'bold' },
      5: { cellWidth: 25 },
    },
    margin: { left: 14, right: 14 },
  })

  const fy = doc.lastAutoTable.finalY
  doc.setFillColor(...GREEN)
  doc.rect(14, fy, pageW - 28, 9, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...WHITE)
  doc.text(`Total Records: ${incomes.length}`, 19, fy + 6)
  doc.text(rs(total), pageW - 19, fy + 6, { align: 'right' })

  addPageFooter(doc)
  doc.save(`Income_Report_${year}.pdf`)
}