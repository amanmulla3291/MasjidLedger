import { useEffect, useState } from 'react'
import { getCollections, addCollection, deleteCollection } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import {
  formatDate, formatCurrency, groupCollectionsByMonth,
  getCurrentYear, getYearOptions, MONTHS, downloadCSV, downloadExcel
} from '../utils/helpers'
import { generateMonthlyCollectionPDF } from '../utils/pdfGenerator'
import DenominationCounter from '../components/DenominationCounter'
import PageHeader from '../components/PageHeader'
import toast from 'react-hot-toast'

const DEFAULT_FORM = {
  date: new Date().toISOString().split('T')[0],
  amount: '',
  notes: '',
}

export default function Collections() {
  const { user, role } = useAuth()
  const isAdmin = role === 'admin'

  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [denomData, setDenomData] = useState({ denominations: null, total: null })
  const [saving, setSaving] = useState(false)
  const [selectedYear, setSelectedYear] = useState(getCurrentYear())

  async function load() {
    setLoading(true)
    const { data, error } = await getCollections(selectedYear)
    if (!error) setCollections(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [selectedYear])

  function handleDenomChange(data) {
    setDenomData(data)
    if (data.total !== null) {
      setForm(f => ({ ...f, amount: data.total.toString() }))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.date) return toast.error('Please select a date')
    if (!form.amount || parseFloat(form.amount) <= 0) return toast.error('Please enter a valid amount')

    setSaving(true)
    const { error } = await addCollection({
      date: form.date,
      amount: parseFloat(form.amount),
      notes: form.notes,
      denominations: denomData.denominations,
      userId: user?.id,
    })

    if (error) {
      toast.error('Failed to save: ' + error.message)
    } else {
      toast.success('Collection recorded!')
      setForm(DEFAULT_FORM)
      setDenomData({ denominations: null, total: null })
      setShowForm(false)
      load()
    }
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('Delete this collection record?')) return
    const { error } = await deleteCollection(id)
    if (error) toast.error('Delete failed')
    else { toast.success('Deleted'); load() }
  }

  const grouped = groupCollectionsByMonth(collections)

  function exportMonth(year, month, monthName, items) {
    generateMonthlyCollectionPDF(year, month, items, monthName)
  }

  function exportAllCSV() {
    const rows = collections.map(c => ({
      Date: formatDate(c.date),
      Month: MONTHS[c.month - 1],
      Year: c.year,
      Amount: c.amount,
      Notes: c.notes || '',
    }))
    downloadCSV(rows, `Friday_Collections_${selectedYear}`)
  }

  function exportAllExcel() {
    const rows = collections.map(c => ({
      Date: formatDate(c.date),
      Month: MONTHS[c.month - 1],
      Year: c.year,
      Amount: c.amount,
      Notes: c.notes || '',
    }))
    downloadExcel(rows, `Friday_Collections_${selectedYear}`)
  }

  return (
    <div>
      <PageHeader
        title="Friday Collections"
        subtitle="Record and manage weekly Sadaqah collections"
        icon="fa-hand-holding-usd"
      />

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

            <span className="badge badge-success" style={{ fontSize: '0.8rem', padding: '6px 10px' }}>
              Total: {formatCurrency(collections.reduce((s, c) => s + Number(c.amount), 0))}
            </span>
          </div>

          <div className="d-flex" style={{ gap: '8px' }}>
            <button className="btn btn-sm btn-outline-secondary" onClick={exportAllCSV}>
              <i className="fas fa-file-csv mr-1" /> CSV
            </button>
            <button className="btn btn-sm btn-outline-secondary" onClick={exportAllExcel}>
              <i className="fas fa-file-excel mr-1" /> Excel
            </button>
            {isAdmin && (
              <button className="btn btn-success btn-sm" onClick={() => setShowForm(!showForm)}>
                <i className={`fas ${showForm ? 'fa-times' : 'fa-plus'} mr-1`} />
                {showForm ? 'Cancel' : 'Add Collection'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Add Form — Admins only */}
      {showForm && isAdmin && (
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="card-title mb-0">
              <i className="fas fa-plus-circle mr-2 text-success" />
              New Friday Collection
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Date (Friday) *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={form.date}
                      onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Notes</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Optional notes..."
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <DenominationCounter onChange={handleDenomChange} />
              </div>

              <div className="form-group">
                <label>
                  Total Amount (₹) *
                  {denomData.total !== null && (
                    <span className="ml-2 text-success" style={{ fontSize: '0.78rem', textTransform: 'none', fontWeight: '400' }}>
                      ← auto-calculated from denominations
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="Enter total amount"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  required
                />
                <small className="text-muted">
                  You can skip denominations and enter only the total for historical records.
                </small>
              </div>

              <button type="submit" className="btn btn-success" disabled={saving}>
                {saving ? <><span className="spinner-border spinner-border-sm mr-2" />Saving...</> : 'Save Collection'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Collections grouped by month */}
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-success" /></div>
      ) : grouped.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5 text-muted">
            <i className="fas fa-hand-holding-usd fa-3x mb-3" style={{ opacity: 0.2 }} />
            <p>No collections recorded for {selectedYear}.</p>
            {isAdmin && (
              <button className="btn btn-success btn-sm" onClick={() => setShowForm(true)}>
                Add First Collection
              </button>
            )}
          </div>
        </div>
      ) : (
        grouped.map(group => (
          <div key={`${group.year}-${group.month}`}>
            <div className="month-group-header">
              <h6>{group.monthName} {group.year}</h6>
              <div className="d-flex align-items-center" style={{ gap: '10px' }}>
                <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                  {group.collections.length} Fridays · {formatCurrency(group.total)}
                </span>
                <button
                  className="btn btn-xs btn-outline-light"
                  onClick={() => exportMonth(group.year, group.month, group.monthName, group.collections)}
                  style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                >
                  <i className="fas fa-file-pdf mr-1" /> PDF
                </button>
              </div>
            </div>

            <div className="card mb-1">
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Notes</th>
                        <th>Denominations</th>
                        {isAdmin && <th className="text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {group.collections.map(c => (
                        <tr key={c.id}>
                          <td>{formatDate(c.date)}</td>
                          <td className="amount-positive">{formatCurrency(c.amount)}</td>
                          <td>{c.notes || <span className="text-muted">—</span>}</td>
                          <td>
                            {c.denominations?.[0] ? (
                              <small className="text-muted">
                                {[
                                  c.denominations[0].hundred_rupee > 0 && `${c.denominations[0].hundred_rupee}×₹100`,
                                  c.denominations[0].fifty_rupee > 0 && `${c.denominations[0].fifty_rupee}×₹50`,
                                  c.denominations[0].twenty_rupee > 0 && `${c.denominations[0].twenty_rupee}×₹20`,
                                  c.denominations[0].ten_rupee > 0 && `${c.denominations[0].ten_rupee}×₹10`,
                                  c.denominations[0].five_rupee > 0 && `${c.denominations[0].five_rupee}×₹5`,
                                  c.denominations[0].two_rupee > 0 && `${c.denominations[0].two_rupee}×₹2`,
                                  c.denominations[0].one_rupee > 0 && `${c.denominations[0].one_rupee}×₹1`,
                                ].filter(Boolean).join(', ')}
                              </small>
                            ) : <span className="text-muted">—</span>}
                          </td>
                          {isAdmin && (
                            <td className="text-right">
                              <button
                                className="btn btn-xs btn-outline-danger"
                                onClick={() => handleDelete(c.id)}
                              >
                                <i className="fas fa-trash" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#f0fdf4' }}>
                        <td colSpan={isAdmin ? 3 : 2}><strong>Month Total</strong></td>
                        <td colSpan={isAdmin ? 2 : 2} className="amount-positive">
                          <strong>{formatCurrency(group.total)}</strong>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}