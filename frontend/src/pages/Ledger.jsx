import { useEffect, useState, useMemo } from 'react'
import { getCollections, getExpenses, getIncome } from '../lib/supabaseClient'
import {
  formatDate, formatCurrency, getCurrentYear,
  getYearOptions, downloadCSV, downloadExcel, MONTHS
} from '../utils/helpers'
import { generateLedgerPDF } from '../utils/pdfGenerator'
import PageHeader from '../components/PageHeader'
import toast from 'react-hot-toast'

const TYPE_FILTERS = [
  { value: 'all', label: 'All Types' },
  { value: 'collection', label: 'Collections' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expenses' },
]

const badgeClass = { collection: 'badge-success', income: 'badge-info', expense: 'badge-danger' }

const CACHE_KEY = 'masjid_ledger_cache'

export default function Ledger() {
  const [collections, setCollections] = useState([])
  const [expenses, setExpenses]       = useState([])
  const [incomes, setIncomes]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [selectedYear, setSelectedYear] = useState(getCurrentYear())
  const [typeFilter, setTypeFilter]   = useState('all')
  const [dateFrom, setDateFrom]       = useState('')
  const [dateTo, setDateTo]           = useState('')
  const [search, setSearch]           = useState('')
  const [groupByMonth, setGroupByMonth] = useState(true)

  async function load() {
    // 1. Load instantly from cache
    try {
      const cached = localStorage.getItem(`${CACHE_KEY}_${selectedYear}`)
      if (cached) {
        const parsed = JSON.parse(cached)
        setCollections(parsed.collections || [])
        setExpenses(parsed.expenses || [])
        setIncomes(parsed.incomes || [])
        setLoading(false)
      }
    } catch { /* ignore */ }

    // 2. Fetch fresh data in background
    if (!loading && (!collections.length && !expenses.length && !incomes.length)) setLoading(true)

    try {
      const [colResult, expResult, incResult] = await Promise.all([
        getCollections(selectedYear),
        getExpenses(selectedYear),
        getIncome(selectedYear),
      ])
      
      const newData = { collections: [], expenses: [], incomes: [] }
      if (!colResult.error) { setCollections(colResult.data || []); newData.collections = colResult.data || [] }
      else toast.error('Failed to load collections')
      
      if (!expResult.error) { setExpenses(expResult.data || []); newData.expenses = expResult.data || [] }
      else toast.error('Failed to load expenses')
      
      if (!incResult.error) { setIncomes(incResult.data || []); newData.incomes = incResult.data || [] }
      
      try { localStorage.setItem(`${CACHE_KEY}_${selectedYear}`, JSON.stringify(newData)) } catch {}
    } catch {
      toast.error('Failed to load ledger data. Please refresh.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [selectedYear])
  useEffect(() => { setDateFrom(''); setDateTo(''); setSearch('') }, [selectedYear])

  // Build entries sorted by date ascending (for running balance)
  const allEntries = useMemo(() => [
    ...collections.map(c => ({
      id: c.id, date: c.date, type: 'collection', typeLabel: 'Collection',
      description: `Friday Donation${c.notes ? ' — ' + c.notes : ''}`,
      amount: Number(c.amount),
    })),
    ...incomes.map(i => ({
      id: i.id, date: i.date, type: 'income', typeLabel: 'Income',
      description: `${i.category} — ${i.donor_name}${i.notes ? ' · ' + i.notes : ''}`,
      amount: Number(i.amount),
    })),
    ...expenses.map(e => ({
      id: e.id, date: e.date, type: 'expense', typeLabel: 'Expense',
      description: `${e.title} (${e.category})`,
      amount: Number(e.amount),
    })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date)), [collections, incomes, expenses])

  // Running balance on unfiltered set
  const entriesWithBalance = useMemo(() => {
    let running = 0
    return allEntries.map(entry => {
      if (entry.type !== 'expense') running += entry.amount
      else running -= entry.amount
      return { ...entry, balance: running }
    })
  }, [allEntries])

  // Apply all filters including search
  const filtered = useMemo(() => entriesWithBalance.filter(entry => {
    if (typeFilter !== 'all' && entry.type !== typeFilter) return false
    if (dateFrom && entry.date < dateFrom) return false
    if (dateTo && entry.date > dateTo) return false
    if (search && !entry.description.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [entriesWithBalance, typeFilter, dateFrom, dateTo, search])

  // Totals
  const totalIncome  = collections.reduce((s, c) => s + Number(c.amount), 0) + incomes.reduce((s, i) => s + Number(i.amount), 0)
  const totalExpense = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const finalBalance = totalIncome - totalExpense
  const filteredIn   = filtered.filter(e => e.type !== 'expense').reduce((s, e) => s + e.amount, 0)
  const filteredOut  = filtered.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
  const isFiltered   = typeFilter !== 'all' || dateFrom || dateTo || search

  // Group by month for the grouped view
  const groupedByMonth = useMemo(() => {
    const groups = {}
    filtered.forEach(entry => {
      const d = new Date(entry.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!groups[key]) groups[key] = { monthLabel: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, entries: [], monthIn: 0, monthOut: 0 }
      groups[key].entries.push(entry)
      if (entry.type !== 'expense') groups[key].monthIn += entry.amount
      else groups[key].monthOut += entry.amount
    })
    return Object.values(groups)
  }, [filtered])

  function exportCSV() {
    downloadCSV(filtered.map(e => ({
      Date: formatDate(e.date), Type: e.typeLabel, Description: e.description,
      Income: e.type !== 'expense' ? e.amount : '',
      Expense: e.type === 'expense' ? e.amount : '',
      Balance: e.balance,
    })), `Masjid_Ledger_${selectedYear}`)
  }

  function exportExcel() {
    downloadExcel(filtered.map(e => ({
      Date: formatDate(e.date), Type: e.typeLabel, Description: e.description,
      Income: e.type !== 'expense' ? e.amount : 0,
      Expense: e.type === 'expense' ? e.amount : 0,
      Balance: e.balance,
    })), `Masjid_Ledger_${selectedYear}`)
  }

  function clearFilters() { setTypeFilter('all'); setDateFrom(''); setDateTo(''); setSearch('') }

  // Render a table of entries (reused for both flat and grouped views)
  function EntriesTable({ entries, showRowNumbers = true }) {
    return (
      <div className="table-responsive ledger-table-wrap">
        <table className="table table-hover mb-0 ledger-table">
          <thead>
            <tr>
              {showRowNumbers && <th className="ledger-col-num">#</th>}
              <th className="ledger-col-date">Date</th>
              <th className="ledger-col-type d-none d-sm-table-cell">Type</th>
              <th className="ledger-col-desc">Description</th>
              <th className="ledger-col-amount">In</th>
              <th className="ledger-col-amount d-none d-md-table-cell">Out</th>
              <th className="ledger-col-balance">Balance</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => (
              <tr key={`${entry.type}-${entry.id}`} className={entry.type === 'expense' ? 'ledger-row-expense' : 'ledger-row-income'}>
                {showRowNumbers && <td className="ledger-col-num" style={{ color: '#9ca3af' }}>{i + 1}</td>}
                <td className="ledger-col-date ledger-date-cell">{formatDate(entry.date)}</td>
                <td className="d-none d-sm-table-cell">
                  <span className={`badge ${badgeClass[entry.type]}`} style={{ fontSize: '0.68rem' }}>{entry.typeLabel}</span>
                </td>
                <td className="ledger-col-desc ledger-desc-cell">
                  <span className={`d-inline d-sm-none ledger-dot ledger-dot-${entry.type === 'expense' ? 'expense' : 'income'}`} />
                  {entry.description}
                </td>
                <td className="ledger-col-amount">
                  {entry.type !== 'expense'
                    ? <span className="amount-positive ledger-amount">+{formatCurrency(entry.amount)}</span>
                    : <span className="text-muted d-none d-md-inline">—</span>}
                </td>
                <td className="ledger-col-amount d-none d-md-table-cell">
                  {entry.type === 'expense'
                    ? <span className="amount-negative ledger-amount">−{formatCurrency(entry.amount)}</span>
                    : <span className="text-muted">—</span>}
                </td>
                <td className="ledger-col-balance">
                  <span className={entry.balance >= 0 ? 'amount-balance' : 'amount-negative'} style={{ fontWeight: '700' }}>
                    {formatCurrency(entry.balance)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Financial Ledger" subtitle="Combined income and expense record with running balance" icon="fa-book" />

      {/* Summary cards */}
      <div className="row mb-3">
        <div className="col-12 col-sm-4 mb-2 mb-sm-0">
          <div className="ledger-summary-card ledger-summary-income">
            <div className="ledger-summary-icon"><i className="fas fa-arrow-up" /></div>
            <div className="ledger-summary-body">
              <div className="ledger-summary-label">Total Income</div>
              <div className="ledger-summary-value">{formatCurrency(totalIncome)}</div>
              <div style={{ fontSize: '0.72rem', opacity: 0.8, marginTop: '2px' }}>Collections + Other Income</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-sm-4 mb-2 mb-sm-0">
          <div className="ledger-summary-card ledger-summary-expense">
            <div className="ledger-summary-icon"><i className="fas fa-arrow-down" /></div>
            <div className="ledger-summary-body">
              <div className="ledger-summary-label">Total Expenses</div>
              <div className="ledger-summary-value">{formatCurrency(totalExpense)}</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-sm-4">
          <div className="ledger-summary-card" style={{ background: finalBalance >= 0 ? '#1565c0' : '#e65100' }}>
            <div className="ledger-summary-icon"><i className="fas fa-balance-scale" /></div>
            <div className="ledger-summary-body">
              <div className="ledger-summary-label" style={{ color: 'rgba(255,255,255,0.8)' }}>{finalBalance >= 0 ? 'Balance' : 'Deficit'}</div>
              <div className="ledger-summary-value">{formatCurrency(Math.abs(finalBalance))}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card mb-3">
        <div className="card-body py-2">
          <div className="d-flex flex-wrap align-items-center justify-content-between" style={{ gap: '8px' }}>
            <div className="d-flex flex-wrap align-items-center" style={{ gap: '8px' }}>
              <select className="form-control form-control-sm" style={{ width: '90px' }} value={selectedYear}
                onChange={e => setSelectedYear(parseInt(e.target.value))}>
                {getYearOptions().map(y => <option key={y} value={y}>{y}</option>)}
              </select>

              <select className="form-control form-control-sm" style={{ width: '120px' }} value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}>
                {TYPE_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>

              {/* Search box */}
              <div style={{ position: 'relative' }}>
                <input type="text" className="form-control form-control-sm" style={{ width: '160px', paddingLeft: '28px' }}
                  placeholder="Search description…" value={search} onChange={e => setSearch(e.target.value)} />
                <i className="fas fa-search" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '0.75rem' }} />
                {search && (
                  <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 0, fontSize: '0.75rem' }}>
                    <i className="fas fa-times" />
                  </button>
                )}
              </div>

              <input type="date" className="form-control form-control-sm" style={{ width: '130px' }} value={dateFrom}
                onChange={e => setDateFrom(e.target.value)} />
              <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>to</span>
              <input type="date" className="form-control form-control-sm" style={{ width: '130px' }} value={dateTo}
                onChange={e => setDateTo(e.target.value)} />

              {isFiltered && (
                <button className="btn btn-xs btn-outline-secondary" onClick={clearFilters}>
                  <i className="fas fa-times mr-1" /> Clear
                </button>
              )}

              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                {filtered.length} entries{isFiltered && ` (of ${entriesWithBalance.length})`}
              </span>
            </div>

            <div className="d-flex align-items-center" style={{ gap: '6px' }}>
              {/* Group by month toggle */}
              <button
                className={`btn btn-sm ${groupByMonth ? 'btn-success' : 'btn-outline-secondary'}`}
                onClick={() => setGroupByMonth(g => !g)}
                title="Group by month"
              >
                <i className="fas fa-layer-group" />
                <span className="d-none d-sm-inline ml-1">Group</span>
              </button>
              <button className="btn btn-sm btn-outline-secondary" onClick={exportCSV}>
                <i className="fas fa-file-csv mr-1" /><span className="d-none d-sm-inline">CSV</span>
              </button>
              <button className="btn btn-sm btn-outline-secondary" onClick={exportExcel}>
                <i className="fas fa-file-excel mr-1" /><span className="d-none d-sm-inline">Excel</span>
              </button>
              <button className="btn btn-sm btn-outline-danger" onClick={() => generateLedgerPDF(selectedYear, collections, expenses)}>
                <i className="fas fa-file-pdf mr-1" /><span className="d-none d-sm-inline">PDF</span>
              </button>
            </div>
          </div>

          {isFiltered && (
            <div className="mt-2 pt-2" style={{ borderTop: '1px solid #f3f4f6' }}>
              <small className="text-muted">
                Filtered —
                <span className="text-success ml-2 font-weight-bold">In: {formatCurrency(filteredIn)}</span>
                <span className="text-danger ml-2 font-weight-bold">Out: {formatCurrency(filteredOut)}</span>
                <span className={`ml-2 font-weight-bold ${(filteredIn - filteredOut) >= 0 ? 'text-primary' : 'text-danger'}`}>
                  Net: {formatCurrency(filteredIn - filteredOut)}
                </span>
              </small>
            </div>
          )}
        </div>
      </div>

      {/* Ledger content */}
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-success" /></div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5 text-muted">
            <i className="fas fa-book fa-3x mb-3" style={{ opacity: 0.2 }} />
            <p>No transactions found{isFiltered ? ' for the selected filters' : ` for ${selectedYear}`}.</p>
            {isFiltered && <button className="btn btn-sm btn-outline-secondary" onClick={clearFilters}>Clear Filters</button>}
          </div>
        </div>
      ) : groupByMonth ? (
        /* ── GROUPED VIEW ── */
        <>
          {groupedByMonth.map(group => (
            <div key={group.monthLabel} className="mb-4">
              <div className="month-group-header">
                <h6><i className="fas fa-calendar-alt mr-2" />{group.monthLabel}</h6>
                <div className="d-flex" style={{ gap: '16px', fontSize: '0.8rem' }}>
                  <span><i className="fas fa-arrow-up mr-1" style={{ opacity: 0.8 }} />{formatCurrency(group.monthIn)}</span>
                  <span><i className="fas fa-arrow-down mr-1" style={{ opacity: 0.8 }} />{formatCurrency(group.monthOut)}</span>
                  <span style={{ fontWeight: 700, color: group.monthIn - group.monthOut >= 0 ? '#a7f3d0' : '#fca5a5' }}>
                    Net: {formatCurrency(group.monthIn - group.monthOut)}
                  </span>
                </div>
              </div>
              <div className="card">
                <div className="card-body p-0">
                  <EntriesTable entries={group.entries} showRowNumbers={false} />
                </div>
              </div>
            </div>
          ))}
          {/* Grand totals footer */}
          <div className="card" style={{ background: '#f0f2f5' }}>
            <div className="card-body py-2">
              <div className="d-flex flex-wrap justify-content-between align-items-center" style={{ gap: '12px' }}>
                <strong style={{ fontSize: '0.85rem' }}>Year Total — {filtered.length} entries</strong>
                <div className="d-flex" style={{ gap: '16px', fontSize: '0.85rem' }}>
                  <span className="amount-positive font-weight-bold">In: {formatCurrency(isFiltered ? filteredIn : totalIncome)}</span>
                  <span className="amount-negative font-weight-bold">Out: {formatCurrency(isFiltered ? filteredOut : totalExpense)}</span>
                  <span className={`font-weight-bold ${finalBalance >= 0 ? 'amount-balance' : 'amount-negative'}`}>
                    Balance: {formatCurrency(isFiltered ? filteredIn - filteredOut : finalBalance)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* ── FLAT VIEW ── */
        <div className="card">
          <div className="card-body p-0">
            <EntriesTable entries={filtered} />
            {/* Totals footer */}
            <div style={{ background: '#f0f2f5', padding: '8px 10px', display: 'flex', justifyContent: 'flex-end', gap: '20px', borderTop: '2px solid #e5e7eb' }}>
              <strong className="amount-positive" style={{ fontSize: '0.82rem' }}>{formatCurrency(isFiltered ? filteredIn : totalIncome)}</strong>
              <strong className="amount-negative" style={{ fontSize: '0.82rem', minWidth: '80px', textAlign: 'right' }}>{formatCurrency(isFiltered ? filteredOut : totalExpense)}</strong>
              <strong className={`${finalBalance >= 0 ? 'amount-balance' : 'amount-negative'}`} style={{ fontSize: '0.82rem', minWidth: '85px', textAlign: 'right' }}>
                {formatCurrency(isFiltered ? filteredIn - filteredOut : finalBalance)}
              </strong>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}