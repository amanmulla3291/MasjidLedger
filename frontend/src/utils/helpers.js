import { format, parseISO } from 'date-fns'

export const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

export const EXPENSE_CATEGORIES = [
  'Electricity',
  'Water',
  'Repair',
  'Maintenance',
  'Furniture',
  'Cleaning',
  'Stationery',
  'Miscellaneous',
]

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount || 0)
}

export function formatDate(dateStr) {
  if (!dateStr) return '-'
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy')
  } catch {
    return dateStr
  }
}

export function formatShortDate(dateStr) {
  if (!dateStr) return '-'
  try {
    return format(parseISO(dateStr), 'dd MMM')
  } catch {
    return dateStr
  }
}

export function getCurrentYear() {
  return new Date().getFullYear()
}

export function getCurrentMonth() {
  return new Date().getMonth() + 1
}

export function getYearOptions(startYear = 2020) {
  const currentYear = getCurrentYear()
  const years = []
  for (let y = currentYear; y >= startYear; y--) {
    years.push(y)
  }
  return years
}

export function calculateDenominationTotal(denoms) {
  if (!denoms) return 0
  return (
    (denoms.one_rupee || 0) * 1 +
    (denoms.two_rupee || 0) * 2 +
    (denoms.five_rupee || 0) * 5 +
    (denoms.ten_rupee || 0) * 10 +
    (denoms.twenty_rupee || 0) * 20 +
    (denoms.fifty_rupee || 0) * 50 +
    (denoms.hundred_rupee || 0) * 100
  )
}

export function groupCollectionsByMonth(collections) {
  const grouped = {}
  collections?.forEach(c => {
    const key = `${c.year}-${c.month}`
    if (!grouped[key]) {
      grouped[key] = {
        year: c.year,
        month: c.month,
        monthName: MONTHS[c.month - 1],
        collections: [],
        total: 0,
      }
    }
    grouped[key].collections.push(c)
    grouped[key].total += Number(c.amount)
  })
  return Object.values(grouped).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year
    return b.month - a.month
  })
}

export function downloadCSV(data, filename) {
  if (!data?.length) return
  const headers = Object.keys(data[0])
  const rows = data.map(row =>
    headers.map(h => {
      const val = row[h]
      if (typeof val === 'string' && val.includes(',')) return `"${val}"`
      return val ?? ''
    }).join(',')
  )
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadExcel(data, filename) {
  import('xlsx').then(XLSX => {
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Data')
    XLSX.writeFile(wb, `${filename}.xlsx`)
  })
}

export function generateUniqueFileName(originalName) {
  const ext = originalName.split('.').pop()
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${timestamp}-${random}.${ext}`
}
