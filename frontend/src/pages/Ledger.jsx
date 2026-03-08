import { useEffect, useState } from 'react'
import { getCollections, getExpenses } from '../lib/supabaseClient'
import {
  formatDate, formatCurrency, getCurrentYear,
  getYearOptions, downloadCSV, downloadExcel
} from '../utils/helpers'
import { generateLedgerPDF } from '../utils/pdfGenerator'
import PageHeader from '../components/PageHeader'
import toast from 'react-hot-toast'

export default function Ledger() {
  const [collections, setCollections] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(getCurrentYear())

  async function load() {
    setLoading(true)
    try {
      const [colResult, expResult] = await Promise.all([
        getCollections(selectedYear),
        getExpenses(selectedYear),
      ])
      if (!colResult.error) setCollections(colResult.data || [])
      else toast.error('Failed to load collections')
      if (!expResult.error) setExpenses(expResult.data || [])
      else toast.error('Failed to load expenses')
    } catch {
      toast.error('Failed to load ledger data. Please refresh.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [selectedYear])

  // Combine and sort all transactions
  const allEntries = [
    ...collections.map(c => ({
      id: c.id,
      date: c.date,
      type: 'income',
      typeLabel: 'Income',
      description: `Friday Donation${c.notes ? ' — ' + c.notes : ''}`,
      amount: Number(c.amount),
    })),
    ...expenses.map(e => ({
      id: e.id,
      date: e.date,
      type: 'expense',
      typeLabel: 'Expense',
      description: `${e.title} (${e.category})`,
      amount: Number(e.amount),
    })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date))

  // Calculate running balance
  let runningBalance = 0
  const entriesWithBalance = allEntries.map(entry => {
    if (entry.type === 'income') runningBalance += entry.amount
    else runningBalance -= entry.amount
    return { ...entry, balance: runningBalance }
  })

  const totalIncome = collections.reduce((s, c) => s + Number(c.amount), 0)
  const totalExpense = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const finalBalance = totalIncome - totalExpense

  function exportCSV() {
    downloadCSV(
      entriesWithBalance.map(e => ({
        Date: formatDate(e.date),
        Type: e.typeLabel,
        Description: e.description,
        Income: e.type === 'income' ? e.amount : '',
        Expense: e.type === 'expense' ? e.amount : '',
        Balance: e.balance,
      })),
      `Masjid_Ledger_${selectedYear}`
    )
  }

  function exportExcel() {
    downloadExcel(
      entriesWithBalance.map(e => ({
        Date: formatDate(e.date),
        Type: e.typeLabel,
        Description: e.description,
        Income: e.type === 'income' ? e.amount : 0,
        Expense: e.type === 'expense' ? e.amount : 0,
        Balance: e.balance,
      })),
      `Masjid_Ledger_${selectedYear}`
    )
  }

  return (
    <div>
      <PageHeader
        title="Financial Ledger"
        subtitle="Combined income and expense record with running balance"
        icon="fa-book"
      />

      {/* Summary cards */}
      <div className="row mb-3">
        <div className="col-12 col-sm-4 mb-2 mb-sm-0">
          <div className="ledger-summary-card ledger-summary-income">
            <div className="ledger-summary-icon"><i className="fas fa-arrow-up" /></div>
            <div className="ledger-summary-body">
              <div className="ledger-summary-label">Total Income</div>
              <div className="ledger-summary-value">{formatCurrency(totalIncome)}</div>
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
          <div
            className="ledger-summary-card"
            style={{ background: finalBalance >= 0 ? '#1565c0' : '#e65100' }}
          >
            <div className="ledger-summary-icon"><i className="fas fa-balance-scale" /></div>
            <div className="ledger-summary-body">
              <div className="ledger-summary-label" style={{ color: 'rgba(255,255,255,0.8)' }}>
                {finalBalance >= 0 ? 'Balance' : 'Deficit'}
              </div>
              <div className="ledger-summary-value">{formatCurrency(Math.abs(finalBalance))}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card mb-3">
        <div className="card-body py-2 d-flex flex-wrap align-items-center justify-content-between" style={{ gap: '8px' }}>
          <div className="d-flex align-items-center" style={{ gap: '8px' }}>
            <select
              className="form-control form-control-sm"
              style={{ width: '90px' }}
              value={selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value))}
            >
              {getYearOptions().map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
              {entriesWithBalance.length} entries
            </span>
          </div>
          <div className="d-flex" style={{ gap: '6px' }}>
            <button className="btn btn-sm btn-outline-secondary" onClick={exportCSV}>
              <i className="fas fa-file-csv mr-1" /><span className="d-none d-sm-inline">CSV</span>
            </button>
            <button className="btn btn-sm btn-outline-secondary" onClick={exportExcel}>
              <i className="fas fa-file-excel mr-1" /><span className="d-none d-sm-inline">Excel</span>
            </button>
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={() => generateLedgerPDF(selectedYear, collections, expenses)}
            >
              <i className="fas fa-file-pdf mr-1" /><span className="d-none d-sm-inline">PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Ledger table */}
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-success" /></div>
      ) : entriesWithBalance.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5 text-muted">
            <i className="fas fa-book fa-3x mb-3" style={{ opacity: 0.2 }} />
            <p>No transactions found for {selectedYear}.</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body p-0">
            <div className="table-responsive ledger-table-wrap">
              <table className="table table-hover mb-0 ledger-table">
                <thead>
                  <tr>
                    <th className="ledger-col-num">#</th>
                    <th className="ledger-col-date">Date</th>
                    <th className="ledger-col-type d-none d-sm-table-cell">Type</th>
                    <th className="ledger-col-desc">Description</th>
                    <th className="ledger-col-amount">In</th>
                    <th className="ledger-col-amount d-none d-md-table-cell">Out</th>
                    <th className="ledger-col-balance">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {entriesWithBalance.map((entry, i) => (
                    <tr
                      key={entry.id}
                      className={entry.type === 'income' ? 'ledger-row-income' : 'ledger-row-expense'}
                    >
                      <td className="ledger-col-num" style={{ color: '#9ca3af' }}>{i + 1}</td>
                      <td className="ledger-col-date ledger-date-cell">{formatDate(entry.date)}</td>
                      <td className="d-none d-sm-table-cell">
                        <span
                          className={`badge ${entry.type === 'income' ? 'badge-success' : 'badge-danger'}`}
                          style={{ fontSize: '0.68rem' }}
                        >
                          {entry.typeLabel}
                        </span>
                      </td>
                      <td className="ledger-col-desc ledger-desc-cell">
                        {/* On mobile, show a colored dot instead of badge */}
                        <span className={`d-inline d-sm-none ledger-dot ledger-dot-${entry.type}`} />
                        {entry.description}
                      </td>
                      <td className="ledger-col-amount">
                        {entry.type === 'income' ? (
                          <span className="amount-positive ledger-amount">+{formatCurrency(entry.amount)}</span>
                        ) : (
                          <span className="text-muted d-none d-md-inline">—</span>
                        )}
                      </td>
                      <td className="ledger-col-amount d-none d-md-table-cell">
                        {entry.type === 'expense' ? (
                          <span className="amount-negative ledger-amount">−{formatCurrency(entry.amount)}</span>
                        ) : <span className="text-muted">—</span>}
                      </td>
                      <td className="ledger-col-balance">
                        <span
                          className={entry.balance >= 0 ? 'amount-balance' : 'amount-negative'}
                          style={{ fontWeight: '700' }}
                        >
                          {formatCurrency(entry.balance)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f0f2f5', fontWeight: '700' }}>
                    <td colSpan={3} className="text-right d-none d-sm-table-cell">
                      <strong>TOTALS</strong>
                    </td>
                    <td colSpan={2} className="text-right d-table-cell d-sm-none">
                      <strong>TOTALS</strong>
                    </td>
                    <td className="amount-positive ledger-amount"><strong>{formatCurrency(totalIncome)}</strong></td>
                    <td className="amount-negative ledger-amount d-none d-md-table-cell"><strong>{formatCurrency(totalExpense)}</strong></td>
                    <td>
                      <strong
                        className={finalBalance >= 0 ? 'amount-balance' : 'amount-negative'}
                      >
                        {formatCurrency(finalBalance)}
                      </strong>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
