import { useEffect, useState } from 'react'
import { getExpenses, addExpense, deleteExpense, uploadFile, getSignedUrl, supabase, logAudit } from '../lib/supabaseClient'

import { useAuth } from '../hooks/useAuth'
import {
  formatDate, formatCurrency, getCurrentYear,
  getYearOptions, EXPENSE_CATEGORIES, generateUniqueFileName,
  downloadCSV, downloadExcel
} from '../utils/helpers'
import { generateExpensePDF } from '../utils/pdfGenerator'
import FileUpload from '../components/FileUpload'
import PageHeader from '../components/PageHeader'
import toast from 'react-hot-toast'

const DEFAULT_FORM = {
  date: new Date().toISOString().split('T')[0],
  title: '',
  category: 'Repair',
  amount: '',
  notes: '',
}

const CACHE_KEY = 'masjid_expenses_cache'

export default function Expenses() {
  const { user, role } = useAuth()
  const isAdmin = role === 'admin'

  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [files, setFiles] = useState({ before: null, after: null, bill: null })
  const [saving, setSaving] = useState(false)
  const [selectedYear, setSelectedYear] = useState(getCurrentYear())
  const [viewExpense, setViewExpense] = useState(null)
  const [signedUrls, setSignedUrls] = useState({})
  const [filterCategory, setFilterCategory] = useState('all')

  async function load() {
    // 1. Load instantly from cache
    try {
      const cached = localStorage.getItem(`${CACHE_KEY}_${selectedYear}`)
      if (cached) {
        setExpenses(JSON.parse(cached))
        setLoading(false)
      }
    } catch { /* ignore */ }

    // 2. Fetch fresh data in background
    if (!loading && expenses.length === 0) setLoading(true)

    try {
      const { data, error } = await getExpenses(selectedYear)
      if (!error) {
        setExpenses(data || [])
        try { localStorage.setItem(`${CACHE_KEY}_${selectedYear}`, JSON.stringify(data || [])) } catch {}
      }
    } catch {
      toast.error('Failed to load expenses. Please refresh.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [selectedYear])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title) return toast.error('Title is required')
    if (!form.amount || parseFloat(form.amount) <= 0) return toast.error('Enter valid amount')

    setSaving(true)
    let before_photo_url = null, after_photo_url = null, bill_url = null

    if (files.before) {
      const path = `expenses/${generateUniqueFileName(files.before.name)}`
      const { publicUrl } = await uploadFile('expense-images', files.before, path)
      before_photo_url = publicUrl
    }
    if (files.after) {
      const path = `expenses/${generateUniqueFileName(files.after.name)}`
      const { publicUrl } = await uploadFile('expense-images', files.after, path)
      after_photo_url = publicUrl
    }
    if (files.bill) {
      const path = `bills/${generateUniqueFileName(files.bill.name)}`
      const { publicUrl } = await uploadFile('expense-bills', files.bill, path)
      bill_url = publicUrl
    }

    const { data, error } = await addExpense({
      ...form,
      amount: parseFloat(form.amount),
      before_photo_url,
      after_photo_url,
      bill_url,
      created_by: user?.id,
    })

    if (error) {
      toast.error('Failed: ' + error.message)
    } else {
      const fileNote = [
        before_photo_url && 'before photo',
        after_photo_url && 'after photo',
        bill_url && 'bill',
      ].filter(Boolean)

      await logAudit(supabase, {
        action: 'CREATE',
        table_name: 'expenses',
        record_id: data?.id,
        description: `Added expense "${form.title}" (${form.category}) ${formatCurrency(form.amount)} on ${formatDate(form.date)}${fileNote.length ? ' — with ' + fileNote.join(', ') : ''}`,
        performed_by: user?.email,
      })
      toast.success('Expense recorded!')
      setForm(DEFAULT_FORM)
      setFiles({ before: null, after: null, bill: null })
      setShowForm(false)
      load()
    }
    setSaving(false)
  }

  async function handleDelete(id, title, amount, date) {
    if (!confirm('Delete this expense?')) return
    const { error } = await deleteExpense(id)
    if (error) {
      toast.error('Delete failed')
    } else {
      await logAudit(supabase, {
        action: 'DELETE',
        table_name: 'expenses',
        record_id: id,
        description: `Deleted expense "${title}" ${formatCurrency(amount)} on ${formatDate(date)}`,
        performed_by: user?.email,
      })
      toast.success('Deleted')
      load()
    }
  }

  function viewDetails(expense) {
    setViewExpense(expense)
    // URLs are now stored as public URLs directly — no signed URL fetch needed
    setSignedUrls({
      before: expense.before_photo_url || null,
      after: expense.after_photo_url || null,
      bill: expense.bill_url || null,
    })
  }

  const filtered = filterCategory === 'all'
    ? expenses
    : expenses.filter(e => e.category === filterCategory)

  const totalFiltered = filtered.reduce((s, e) => s + Number(e.amount), 0)

  function exportCSV() {
    downloadCSV(filtered.map(e => ({
      Date: formatDate(e.date),
      Title: e.title,
      Category: e.category,
      Amount: e.amount,
      Notes: e.notes || '',
    })), `Expenses_${selectedYear}`)
  }

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle="Track Masjid repair, maintenance, and utility expenses"
        icon="fa-file-invoice-dollar"
      />

      {/* Toolbar */}
      <div className="card mb-3">
        <div className="card-body py-2 d-flex flex-wrap align-items-center justify-content-between" style={{ gap: '10px' }}>
          <div className="d-flex flex-wrap align-items-center" style={{ gap: '10px' }}>
            <select
              className="form-control form-control-sm"
              style={{ width: '100px' }}
              value={selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value))}
            >
              {getYearOptions().map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select
              className="form-control form-control-sm"
              style={{ width: '130px' }}
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <span className="badge badge-danger" style={{ fontSize: '0.8rem', padding: '6px 10px' }}>
              Total: {formatCurrency(totalFiltered)}
            </span>
          </div>
          <div className="d-flex" style={{ gap: '8px' }}>
            <button className="btn btn-sm btn-outline-secondary" onClick={exportCSV}>
              <i className="fas fa-file-csv mr-1" /> CSV
            </button>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => generateExpensePDF(selectedYear, filtered)}>
              <i className="fas fa-file-pdf mr-1" /> PDF
            </button>
            {isAdmin && (
              <button className="btn btn-danger btn-sm" onClick={() => setShowForm(!showForm)}>
                <i className={`fas ${showForm ? 'fa-times' : 'fa-plus'} mr-1`} />
                {showForm ? 'Cancel' : 'Add Expense'}
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
              <i className="fas fa-plus-circle mr-2 text-danger" />
              New Expense
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Title *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g., Light Repair, Water Bill"
                      value={form.title}
                      onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="form-group">
                    <label>Category *</label>
                    <select
                      className="form-control"
                      value={form.category}
                      onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    >
                      {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="form-group">
                    <label>Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={form.date}
                      onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-4">
                  <div className="form-group">
                    <label>Amount (₹) *</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      value={form.amount}
                      onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="col-md-8">
                  <div className="form-group">
                    <label>Notes</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Additional details..."
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-4">
                  <div className="form-group">
                    <FileUpload
                      label="Before Repair Photo"
                      accept="image/*"
                      onFileSelect={f => setFiles(prev => ({ ...prev, before: f }))}
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="form-group">
                    <FileUpload
                      label="After Repair Photo"
                      accept="image/*"
                      onFileSelect={f => setFiles(prev => ({ ...prev, after: f }))}
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="form-group">
                    <FileUpload
                      label="Bill Image / PDF"
                      accept="image/*,.pdf"
                      onFileSelect={f => setFiles(prev => ({ ...prev, bill: f }))}
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-danger" disabled={saving}>
                {saving
                  ? <><span className="spinner-border spinner-border-sm mr-2" />Uploading &amp; Saving...</>
                  : 'Save Expense'
                }
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Expense List */}
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-danger" /></div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5 text-muted">
            <i className="fas fa-file-invoice-dollar fa-3x mb-3" style={{ opacity: 0.2 }} />
            <p>No expenses recorded for {selectedYear}.</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Notes</th>
                    <th>Files</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e.id}>
                      <td>{formatDate(e.date)}</td>
                      <td><strong>{e.title}</strong></td>
                      <td><span className="badge badge-secondary">{e.category}</span></td>
                      <td className="amount-negative">{formatCurrency(e.amount)}</td>
                      <td>{e.notes || <span className="text-muted">—</span>}</td>
                      <td>
                        <div className="d-flex" style={{ gap: '4px' }}>
                          {e.before_photo_url && (
                            <span className="badge badge-info" title="Before photo">
                              <i className="fas fa-image" /> Before
                            </span>
                          )}
                          {e.after_photo_url && (
                            <span className="badge badge-success" title="After photo">
                              <i className="fas fa-image" /> After
                            </span>
                          )}
                          {e.bill_url && (
                            <span className="badge badge-warning" title="Bill">
                              <i className="fas fa-file" /> Bill
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-right">
                        <div className="d-flex justify-content-end" style={{ gap: '4px' }}>
                          {(e.before_photo_url || e.after_photo_url || e.bill_url) && (
                            <button
                              className="btn btn-xs btn-outline-info"
                              onClick={() => viewDetails(e)}
                            >
                              <i className="fas fa-eye" />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              className="btn btn-xs btn-outline-danger"
                              onClick={() => handleDelete(e.id, e.title, e.amount, e.date)}
                            >
                              <i className="fas fa-trash" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#fff5f5' }}>
                    <td colSpan={3}><strong>Total</strong></td>
                    <td className="amount-negative"><strong>{formatCurrency(totalFiltered)}</strong></td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* View files modal */}
      {viewExpense && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{viewExpense.title} — Files</h5>
                <button className="close" onClick={() => setViewExpense(null)}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="row">
                  {signedUrls.before && (
                    <div className="col-md-4">
                      <p className="text-muted mb-1" style={{ fontSize: '0.78rem' }}>Before Repair</p>
                      <a href={signedUrls.before} target="_blank" rel="noreferrer">
                        <img src={signedUrls.before} alt="Before" className="img-fluid rounded" />
                      </a>
                    </div>
                  )}
                  {signedUrls.after && (
                    <div className="col-md-4">
                      <p className="text-muted mb-1" style={{ fontSize: '0.78rem' }}>After Repair</p>
                      <a href={signedUrls.after} target="_blank" rel="noreferrer">
                        <img src={signedUrls.after} alt="After" className="img-fluid rounded" />
                      </a>
                    </div>
                  )}
                  {signedUrls.bill && (
                    <div className="col-md-4">
                      <p className="text-muted mb-1" style={{ fontSize: '0.78rem' }}>Bill</p>
                      <a href={signedUrls.bill} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-warning">
                        <i className="fas fa-external-link-alt mr-1" /> View Bill
                      </a>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary btn-sm" onClick={() => setViewExpense(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}