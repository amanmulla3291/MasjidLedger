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
    const [colResult, expResult] = await Promise.all([
      getCollections(selectedYear),
      getExpenses(selectedYear),
    ])
    if (!colResult.error) setCollections(colResult.data || [])
    if (!expResult.error) setExpenses(expResult.data || [])
    setLoading(false)
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
        <div className="col-4">
          <div className="small-box bg-success">
            <div className="inner">
              <h4>{formatCurrency(totalIncome)}</h4>
              <p>Total Income</p>
            </div>
            <div className="icon"><i className="fas fa-arrow-up" /></div>
          </div>
        </div>
        <div className="col-4">
          <div className="small-box bg-danger">
            <div className="inner">
              <h4>{formatCurrency(totalExpense)}</h4>
              <p>Total Expenses</p>
            </div>
            <div className="icon"><i className="fas fa-arrow-down" /></div>
          </div>
        </div>
        <div className="col-4">
          <div className="small-box" style={{ background: finalBalance >= 0 ? '#1565c0' : '#e65100' }}>
            <div className="inner" style={{ color: '#fff' }}>
              <h4 style={{ color: '#fff' }}>{formatCurrency(Math.abs(finalBalance))}</h4>
              <p>{finalBalance >= 0 ? 'Balance' : 'Deficit'}</p>
            </div>
            <div className="icon"><i className="fas fa-balance-scale" /></div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card mb-3">
        <div className="card-body py-2 d-flex flex-wrap align-items-center justify-content-between" style={{ gap: '10px' }}>
          <div className="d-flex align-items-center" style={{ gap: '10px' }}>
            <select
              className="form-control form-control-sm"
              style={{ width: '100px' }}
              value={selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value))}
            >
              {getYearOptions().map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>
              {entriesWithBalance.length} transactions
            </span>
          </div>
          <div className="d-flex" style={{ gap: '8px' }}>
            <button className="btn btn-sm btn-outline-secondary" onClick={exportCSV}>
              <i className="fas fa-file-csv mr-1" /> CSV
            </button>
            <button className="btn btn-sm btn-outline-secondary" onClick={exportExcel}>
              <i className="fas fa-file-excel mr-1" /> Excel
            </button>
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={() => generateLedgerPDF(selectedYear, collections, expenses)}
            >
              <i className="fas fa-file-pdf mr-1" /> PDF
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
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Income</th>
                    <th>Expense</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {entriesWithBalance.map((entry, i) => (
                    <tr
                      key={entry.id}
                      className={entry.type === 'income' ? 'ledger-row-income' : 'ledger-row-expense'}
                    >
                      <td style={{ color: '#9ca3af', fontSize: '0.8rem' }}>{i + 1}</td>
                      <td>{formatDate(entry.date)}</td>
                      <td>
                        <span
                          className={`badge ${entry.type === 'income' ? 'badge-success' : 'badge-danger'}`}
                          style={{ fontSize: '0.72rem' }}
                        >
                          {entry.typeLabel}
                        </span>
                      </td>
                      <td>{entry.description}</td>
                      <td>
                        {entry.type === 'income' ? (
                          <span className="amount-positive">+{formatCurrency(entry.amount)}</span>
                        ) : <span className="text-muted">—</span>}
                      </td>
                      <td>
                        {entry.type === 'expense' ? (
                          <span className="amount-negative">−{formatCurrency(entry.amount)}</span>
                        ) : <span className="text-muted">—</span>}
                      </td>
                      <td>
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
                    <td colSpan={4} className="text-right">
                      <strong>TOTALS</strong>
                    </td>
                    <td className="amount-positive"><strong>{formatCurrency(totalIncome)}</strong></td>
                    <td className="amount-negative"><strong>{formatCurrency(totalExpense)}</strong></td>
                    <td>
                      <strong
                        className={finalBalance >= 0 ? 'amount-balance' : 'amount-negative'}
                        style={{ fontSize: '1rem' }}
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
