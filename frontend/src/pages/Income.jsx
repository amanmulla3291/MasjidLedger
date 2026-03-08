import { useEffect, useState } from 'react'
import {
  getIncome, addIncome, deleteIncome,
  INCOME_CATEGORIES, PAYMENT_MODES,
} from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import {
  formatDate, formatCurrency, getCurrentYear,
  getYearOptions, downloadCSV, downloadExcel,
} from '../utils/helpers'
import PageHeader from '../components/PageHeader'
import toast from 'react-hot-toast'

const DEFAULT_FORM = {
  date: new Date().toISOString().split('T')[0],
  donor_name: '',
  amount: '',
  category: 'Sadaqah',
  payment_mode: 'Cash',
  notes: '',
}

export default function Income() {
  const { user, role } = useAuth()
  const isAdmin = role === 'admin'

  const [incomes, setIncomes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [selectedYear, setSelectedYear] = useState(getCurrentYear())
  const [filterCategory, setFilterCategory] = useState('all')

  async function load() {
    setLoading(true)
    try {
      const { data, error } = await getIncome(selectedYear)
      if (!error) setIncomes(data || [])
      else toast.error('Failed to load income records')
    } catch {
      toast.error('Failed to load income. Please refresh.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [selectedYear])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.donor_name.trim()) return toast.error('Donor name is required')
    if (!form.amount || parseFloat(form.amount) <= 0) return toast.error('Enter a valid amount')
    if (!form.date) return toast.error('Please select a date')

    setSaving(true)
    const { error } = await addIncome({
      ...form,
      amount: parseFloat(form.amount),
      created_by: user?.id,
    })

    if (error) {
      toast.error('Failed: ' + error.message)
    } else {
      toast.success('Income recorded!')
      setForm(DEFAULT_FORM)
      setShowForm(false)
      load()
    }
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('Delete this income record?')) return
    const { error } = await deleteIncome(id)
    if (error) toast.error('Delete failed')
    else { toast.success('Deleted'); load() }
  }

  const filtered = filterCategory === 'all'
    ? incomes
    : incomes.filter(i => i.category === filterCategory)

  const totalFiltered = filtered.reduce((s, i) => s + Number(i.amount), 0)

  function exportCSV() {
    downloadCSV(filtered.map(i => ({
      Date: formatDate(i.date),
      Category: i.category,
      Donor: i.donor_name,
      Amount: i.amount,
      Mode: i.payment_mode,
      Notes: i.notes || '',
    })), `Income_${selectedYear}`)
  }

  function exportExcel() {
    downloadExcel(filtered.map(i => ({
      Date: formatDate(i.date),
      Category: i.category,
      Donor: i.donor_name,
      Amount: i.amount,
      Mode: i.payment_mode,
      Notes: i.notes || '',
    })), `Income_${selectedYear}`)
  }

  // Category badge colors
  const categoryColors = {
    Sadaqah: 'badge-success',
    Zakat: 'badge-primary',
    Donation: 'badge-info',
    Inheritance: 'badge-warning',
    'Property Sale': 'badge-secondary',
    'Bank Interest': 'badge-light',
    'Religious Event': 'badge-danger',
    Miscellaneous: 'badge-dark',
  }

  return (
    <div>
      <PageHeader
        title="Income Management"
        subtitle="Track all income sources including Sadaqah, Zakat, and donations"
        icon="fa-money-bill-wave"
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
              style={{ width: '150px' }}
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {INCOME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <span className="badge badge-success" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
              Total: {formatCurrency(totalFiltered)}
            </span>
          </div>

          <div className="d-flex" style={{ gap: '8px' }}>
            <button className="btn btn-sm btn-outline-secondary" onClick={exportCSV} title="Export CSV">
              <i className="fas fa-file-csv mr-1" /> CSV
            </button>
            <button className="btn btn-sm btn-outline-secondary" onClick={exportExcel} title="Export Excel">
              <i className="fas fa-file-excel mr-1" /> Excel
            </button>
            {isAdmin && (
              <button
                className="btn btn-success btn-sm"
                onClick={() => setShowForm(!showForm)}
              >
                <i className={`fas ${showForm ? 'fa-times' : 'fa-plus'} mr-1`} />
                {showForm ? 'Cancel' : 'Add Income'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Add Form — Admins Only */}
      {showForm && isAdmin && (
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="card-title mb-0">
              <i className="fas fa-plus-circle mr-2 text-success" />
              New Income Record
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-4">
                  <div className="form-group">
                    <label>Date <span className="text-danger">*</span></label>
                    <input
                      type="date"
                      className="form-control"
                      value={form.date}
                      onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="form-group">
                    <label>Category <span className="text-danger">*</span></label>
                    <select
                      className="form-control"
                      value={form.category}
                      onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    >
                      {INCOME_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="form-group">
                    <label>Payment Mode <span className="text-danger">*</span></label>
                    <select
                      className="form-control"
                      value={form.payment_mode}
                      onChange={e => setForm(f => ({ ...f, payment_mode: e.target.value }))}
                    >
                      {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-5">
                  <div className="form-group">
                    <label>Donor Name <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Full name of donor"
                      value={form.donor_name}
                      onChange={e => setForm(f => ({ ...f, donor_name: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="form-group">
                    <label>Amount (₹) <span className="text-danger">*</span></label>
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
                <div className="col-md-4">
                  <div className="form-group">
                    <label>Notes</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Optional details..."
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-success" disabled={saving}>
                {saving
                  ? <><span className="spinner-border spinner-border-sm mr-2" />Saving...</>
                  : <><i className="fas fa-save mr-1" />Save Income</>
                }
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Income List */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-success" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5 text-muted">
            <i className="fas fa-money-bill-wave fa-3x mb-3" style={{ opacity: 0.2 }} />
            <p className="mb-0">No income records found for {selectedYear}.</p>
            {isAdmin && (
              <button className="btn btn-success btn-sm mt-3" onClick={() => setShowForm(true)}>
                <i className="fas fa-plus mr-1" /> Add First Record
              </button>
            )}
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
                    <th>Category</th>
                    <th>Donor Name</th>
                    <th>Amount</th>
                    <th>Payment Mode</th>
                    <th>Notes</th>
                    {isAdmin && <th className="text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(i => (
                    <tr key={i.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDate(i.date)}</td>
                      <td>
                        <span className={`badge ${categoryColors[i.category] || 'badge-secondary'}`}>
                          {i.category}
                        </span>
                      </td>
                      <td><strong>{i.donor_name}</strong></td>
                      <td className="amount-positive" style={{ fontWeight: 600, color: '#28a745' }}>
                        {formatCurrency(i.amount)}
                      </td>
                      <td>{i.payment_mode}</td>
                      <td style={{ fontSize: '0.875rem', color: '#6c757d' }}>
                        {i.notes || <span className="text-muted">—</span>}
                      </td>
                      {isAdmin && (
                        <td className="text-right">
                          <button
                            className="btn btn-xs btn-outline-danger"
                            onClick={() => handleDelete(i.id)}
                            title="Delete"
                          >
                            <i className="fas fa-trash" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f0fdf4', fontWeight: 600 }}>
                    <td colSpan={3}>Total ({filtered.length} records)</td>
                    <td style={{ color: '#28a745' }}>{formatCurrency(totalFiltered)}</td>
                    <td colSpan={isAdmin ? 3 : 2} />
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