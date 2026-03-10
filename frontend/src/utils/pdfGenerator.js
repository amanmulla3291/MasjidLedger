import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDate } from './helpers'

// ── Constants ────────────────────────────────────────────────
const MASJID_NAME = 'Sunni Jamma Masjid, Tambave'
const GREEN       = [26, 92, 42]
const LIGHT_GREEN = [240, 253, 244]
const RED         = [180, 30, 30]
const LIGHT_RED   = [255, 240, 240]

function rupees(amount) {
  return `Rs. ${Number(amount).toLocaleString('en-IN')}`
}

function todayStr() {
  return new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

// ── Font loader — fetches Noto Sans Devanagari TTF at runtime ─
// jsPDF requires TTF (not WOFF/WOFF2). We try multiple CDN sources.
async function loadDevanagariFont() {
  // These URLs serve raw TTF files
  const TTF_URLS = [
    'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf',
    'https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf',
  ]

  for (const url of TTF_URLS) {
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const buffer = await res.arrayBuffer()
      const bytes  = new Uint8Array(buffer)

      // Verify it's a real TTF (magic bytes check)
      // TTF starts with 0x00 0x01 0x00 0x00, or 'true', or OpenType 'OTTO'
      const isOTF = bytes[0] === 0x4F && bytes[1] === 0x54 // 'OT'
      const isTTF = (bytes[0] === 0x00 && bytes[1] === 0x01) ||
                    (bytes[0] === 0x74 && bytes[1] === 0x72) // 'tr'
      if (!isTTF && !isOTF) {
        console.warn('[PDF] Skipping non-TTF from', url)
        continue
      }

      // Convert ArrayBuffer → base64
      let binary = ''
      const chunk = 8192
      for (let i = 0; i < bytes.byteLength; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
      }
      return btoa(binary)
    } catch (e) {
      console.warn('[PDF] Font fetch failed for', url, e.message)
    }
  }
  return null
}

// ── Build jsPDF doc with Devanagari font if available ────────
async function makeDoc(landscape = false) {
  const doc = new jsPDF(landscape ? 'landscape' : 'portrait')

  const b64 = await loadDevanagariFont()
  if (b64) {
    try {
      doc.addFileToVFS('NotoSansDevanagari-Regular.ttf', b64)
      doc.addFont('NotoSansDevanagari-Regular.ttf', 'NotoDevanagari', 'normal')
      doc.__devanagariLoaded = true
    } catch (e) {
      console.warn('[PDF] Font registration failed:', e.message)
      doc.__devanagariLoaded = false
    }
  } else {
    doc.__devanagariLoaded = false
  }

  return doc
}

function bodyFont(doc) {
  return doc.__devanagariLoaded ? 'NotoDevanagari' : 'helvetica'
}

// ── Shared header ─────────────────────────────────────────────
function addHeader(doc, title, subtitle = null, landscape = false) {
  const cx = landscape ? 148 : 105

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(...GREEN)
  doc.text(MASJID_NAME, cx, 18, { align: 'center' })

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  doc.text(title, cx, 27, { align: 'center' })

  let y = 27
  if (subtitle) {
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(subtitle, cx, 34, { align: 'center' })
    y = 34
  }

  doc.setDrawColor(...GREEN)
  doc.setLineWidth(0.8)
  doc.line(14, y + 5, landscape ? 283 : 196, y + 5)
  return y + 10
}

// ── Shared footer ─────────────────────────────────────────────
function addFooter(doc, landscape = false) {
  const pages = doc.internal.getNumberOfPages()
  const w     = landscape ? 297 : 210
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(`Generated on ${todayStr()}`, 14, doc.internal.pageSize.height - 8)
    doc.text(
      `${MASJID_NAME} — Private Record | Page ${i} of ${pages}`,
      w - 14, doc.internal.pageSize.height - 8, { align: 'right' }
    )
  }
}

// ── Shared autoTable wrapper ──────────────────────────────────
function drawTable(doc, { startY, head, body, foot, headColor, footColor, colStyles }) {
  const font = bodyFont(doc)
  autoTable(doc, {
    startY,
    head,
    body,
    foot,
    theme: 'striped',
    headStyles:         { fillColor: headColor || GREEN, textColor: 255, fontStyle: 'bold', fontSize: 9 },
    footStyles:         { fillColor: footColor || LIGHT_GREEN, textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 9 },
    bodyStyles:         { fontSize: 9, cellPadding: 3, font },
    alternateRowStyles: { fillColor: [250, 255, 250] },
    columnStyles:       colStyles || {},
    margin:             { left: 14, right: 14 },
  })
  return doc.lastAutoTable.finalY
}

// ════════════════════════════════════════════════════════════
// 1. RAMZAN EID REPORT  (async — loads Devanagari font first)
// ════════════════════════════════════════════════════════════
export async function generateRamzanPDF(ramzanYear, contributions) {
  const doc      = await makeDoc()
  const subtitle = `Hafiz: ${ramzanYear.hafiz_name} | Year: ${ramzanYear.year}`
  const startY   = addHeader(doc, 'Ramzan Contribution Report', subtitle)

  const paid     = contributions.filter(c => c.payment_status !== 'pending')
  const pending  = contributions.filter(c => c.payment_status === 'pending')
  const totalPaid    = paid.reduce((s, c) => s + Number(c.amount), 0)
  const totalPending = pending.reduce((s, c) => s + Number(c.amount), 0)
  const expected     = Number(ramzanYear.expected_salary || 0)

  // Summary box
  doc.setFillColor(...LIGHT_GREEN)
  doc.roundedRect(14, startY, 182, 22, 2, 2, 'F')
  doc.setFontSize(9)
  doc.setTextColor(40)
  doc.text(`Total Collected: ${rupees(totalPaid)}`,     20, startY + 8)
  doc.text(`Pending: ${rupees(totalPending)}`,          80, startY + 8)
  doc.text(`Salary Target: ${rupees(expected)}`,       148, startY + 8)
  doc.text(`Total Members: ${contributions.length}`,    20, startY + 17)
  doc.text(`Paid: ${paid.length}  |  Pending: ${pending.length}`, 80, startY + 17)
  const bal = totalPaid - expected
  doc.setTextColor(bal >= 0 ? 0 : 200, bal >= 0 ? 128 : 0, 0)
  doc.text(`Balance: ${rupees(bal)}`, 148, startY + 17)
  doc.setTextColor(40)

  // Contributions table
  const body = contributions.map((c, i) => {
    const name   = c.jamat_members?.name || c.member_name || '—'
    const status = c.payment_status === 'pending' ? 'Pending' : 'Paid'
    return [
      i + 1, name,
      c.payment_date ? formatDate(c.payment_date) : '—',
      rupees(c.amount),
      c.payment_mode || 'Cash',
      status,
      c.notes || '—',
    ]
  })

  const finalY = drawTable(doc, {
    startY: startY + 27,
    head:   [['#', 'Member Name', 'Date', 'Amount', 'Mode', 'Status', 'Notes']],
    body,
    foot:   [['', `Members: ${contributions.length}`, '', rupees(totalPaid + totalPending), '', '', '']],
    colStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 48 },
      2: { cellWidth: 28 },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 22 },
      5: { cellWidth: 20 },
      6: { cellWidth: 32 },
    },
  })

  if (pending.length > 0) {
    doc.setFontSize(9)
    doc.setTextColor(180, 60, 0)
    doc.text(
      `⚠  ${pending.length} member(s) have pending payments totalling ${rupees(totalPending)}`,
      14, finalY + 10
    )
  }

  addFooter(doc)
  doc.save(`Ramzan_Report_${ramzanYear.year}.pdf`)
}

// ════════════════════════════════════════════════════════════
// 2. FRIDAY COLLECTIONS MONTHLY PDF
// ════════════════════════════════════════════════════════════
export function generateMonthlyCollectionPDF(year, month, collections, monthName) {
  const doc    = new jsPDF()
  const startY = addHeader(doc, `Friday Collections — ${monthName} ${year}`)
  const total  = collections.reduce((s, c) => s + Number(c.amount), 0)

  drawTable(doc, {
    startY,
    head:  [['#', 'Date', 'Notes', 'Amount']],
    body:  collections.map((c, i) => [i + 1, formatDate(c.date), c.notes || '—', rupees(c.amount)]),
    foot:  [['', `Total Fridays: ${collections.length}`, '', rupees(total)]],
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

// ════════════════════════════════════════════════════════════
// 3. FULL LEDGER PDF
// ════════════════════════════════════════════════════════════
export function generateLedgerPDF(year, collections, expenses, incomes = []) {
  const doc    = new jsPDF('landscape')
  const startY = addHeader(doc, `Financial Ledger — Year ${year}`, null, true)

  const entries = [
    ...(collections || []).map(c => ({
      date: c.date, type: 'Collection',
      desc: `Friday Collection${c.notes ? ' — ' + c.notes : ''}`,
      income: Number(c.amount), expense: 0,
    })),
    ...(incomes || []).map(i => ({
      date: i.date, type: 'Income',
      desc: `${i.category} — ${i.donor_name}`,
      income: Number(i.amount), expense: 0,
    })),
    ...(expenses || []).map(e => ({
      date: e.date, type: 'Expense',
      desc: `${e.title} (${e.category})`,
      income: 0, expense: Number(e.amount),
    })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date))

  let bal = 0
  const body = entries.map((e, i) => {
    bal += e.income - e.expense
    return [
      i + 1, formatDate(e.date), e.type, e.desc,
      e.income  > 0 ? rupees(e.income)  : '',
      e.expense > 0 ? rupees(e.expense) : '',
      rupees(bal),
    ]
  })

  const totalIn  = entries.reduce((s, e) => s + e.income,  0)
  const totalOut = entries.reduce((s, e) => s + e.expense, 0)

  drawTable(doc, {
    startY,
    head: [['#', 'Date', 'Type', 'Description', 'Income', 'Expense', 'Balance']],
    body,
    foot: [['', '', '', 'TOTALS', rupees(totalIn), rupees(totalOut), rupees(totalIn - totalOut)]],
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

// ════════════════════════════════════════════════════════════
// 4. EXPENSE REPORT PDF
// ════════════════════════════════════════════════════════════
export function generateExpensePDF(year, expenses) {
  const doc    = new jsPDF()
  const startY = addHeader(doc, `Expense Report — Year ${year}`)
  const total  = expenses.reduce((s, e) => s + Number(e.amount), 0)

  drawTable(doc, {
    startY,
    head: [['#', 'Date', 'Title', 'Category', 'Amount', 'Notes']],
    body: expenses.map((e, i) => [
      i + 1, formatDate(e.date), e.title, e.category, rupees(e.amount), e.notes || '—',
    ]),
    foot: [['', '', '', `Total: ${expenses.length}`, rupees(total), '']],
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

// ════════════════════════════════════════════════════════════
// 5. INCOME REPORT PDF
// ════════════════════════════════════════════════════════════
export function generateIncomePDF(year, incomes) {
  const doc    = new jsPDF()
  const startY = addHeader(doc, `Income Report — Year ${year}`)
  const total  = incomes.reduce((s, i) => s + Number(i.amount), 0)

  drawTable(doc, {
    startY,
    head: [['#', 'Date', 'Category', 'Donor', 'Amount', 'Mode', 'Notes']],
    body: incomes.map((inc, i) => [
      i + 1, formatDate(inc.date), inc.category, inc.donor_name,
      rupees(inc.amount), inc.payment_mode || '—', inc.notes || '—',
    ]),
    foot: [['', '', '', `Total: ${incomes.length}`, rupees(total), '', '']],
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