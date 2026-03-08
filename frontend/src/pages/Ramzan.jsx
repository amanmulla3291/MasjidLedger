import { useEffect, useState } from 'react'
import {
  getRamzanYears, addRamzanYear,
  getRamzanContributions, addRamzanContribution, deleteRamzanContribution,
  getRamzanExpenses, addRamzanExpense, deleteRamzanExpense,
  uploadFile, getSignedUrl
} from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import {
  formatDate, formatCurrency, getCurrentYear, generateUniqueFileName
} from '../utils/helpers'
import { generateRamzanPDF } from '../utils/pdfGenerator'
import FileUpload from '../components/FileUpload'
import PageHeader from '../components/PageHeader'
import toast from 'react-hot-toast'

export default function Ramzan() {
  const { user } = useAuth()
  const [years, setYears] = useState([])
  const [selectedYear, setSelectedYear] = useState(null)
  const [contributions, setContributions] = useState([])
  const [ramzanExpenses, setRamzanExpenses] = useState([])
  const [activeTab, setActiveTab] = useState('contributions')
  const [loadingYears, setLoadingYears] = useState(true)
  const [showYearForm, setShowYearForm] = useState(false)
  const [showContribForm, setShowContribForm] = useState(false)
  const [showExpenseForm, setShowExpenseForm] = useState(false)

  const [yearForm, setYearForm] = useState({
    year: getCurrentYear(),
    hafiz_name: '',
    expected_salary: '',
    notes: '',
  })

  const [contribForm, setContribForm] = useState({
    member_name: '',
    amount: '1000',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const [expenseForm, setExpenseForm] = useState({
    title: '',
    amount: '',
    notes: '',
  })
  const [expenseBillFile, setExpenseBillFile] = useState(null)
  const [saving, setSaving] = useState(false)

  async function loadYears() {
    setLoadingYears(true)
    const { data } = await getRamzanYears()
    setYears(data || [])
    if (data?.length > 0 && !selectedYear) {
      setSelectedYear(data[0])
    }
    setLoadingYears(false)
  }

  async function loadDetails(yearId) {
    try {
      const [c, e] = await Promise.all([
        getRamzanContributions(yearId),
        getRamzanExpenses(yearId),
      ])
      setContributions(c.data || [])
      setRamzanExpenses(e.data || [])
    } catch {
      toast.error('Failed to load Ramzan data. Please refresh.')
    }
  }

  useEffect(() => { loadYears() }, [])
  useEffect(() => { if (selectedYear) loadDetails(selectedYear.id) }, [selectedYear])

  async function handleAddYear(e) {
    e.preventDefault()
    if (!yearForm.hafiz_name) return toast.error('Hafiz name required')
    setSaving(true)
    const { data, error } = await addRamzanYear({
      ...yearForm,
      year: parseInt(yearForm.year),
      expected_salary: parseFloat(yearForm.expected_salary) || 0,
    })
    if (error) toast.error('Failed: ' + error.message)
    else {
      toast.success('Ramzan year created!')
      setShowYearForm(false)
      setYearForm({ year: getCurrentYear(), hafiz_name: '', expected_salary: '', notes: '' })
      await loadYears()
      setSelectedYear(data)
    }
    setSaving(false)
  }

  async function handleAddContrib(e) {
    e.preventDefault()
    if (!contribForm.member_name) return toast.error('Member name required')
    if (!contribForm.amount || parseFloat(contribForm.amount) <= 0) return toast.error('Enter valid amount')
    setSaving(true)
    const { error } = await addRamzanContribution({
      ...contribForm,
      amount: parseFloat(contribForm.amount),
      ramzan_year_id: selectedYear.id,
    })
    if (error) toast.error('Failed: ' + error.message)
    else {
      toast.success('Contribution added!')
      setContribForm({ member_name: '', amount: '1000', payment_date: new Date().toISOString().split('T')[0], notes: '' })
      setShowContribForm(false)
      loadDetails(selectedYear.id)
    }
    setSaving(false)
  }

  async function handleDeleteContrib(id) {
    if (!confirm('Delete this contribution?')) return
    const { error } = await deleteRamzanContribution(id)
    if (error) toast.error('Delete failed')
    else { toast.success('Deleted'); loadDetails(selectedYear.id) }
  }

  async function handleAddExpense(e) {
    e.preventDefault()
    if (!expenseForm.title) return toast.error('Title required')
    if (!expenseForm.amount || parseFloat(expenseForm.amount) <= 0) return toast.error('Enter valid amount')

    setSaving(true)
    let bill_url = null

    if (expenseBillFile) {
      const path = `ramzan/${generateUniqueFileName(expenseBillFile.name)}`
      const { url } = await uploadFile('ramzan-bills', expenseBillFile, path)
      bill_url = url
    }

    const { error } = await addRamzanExpense({
      ...expenseForm,
      amount: parseFloat(expenseForm.amount),
      bill_url,
      ramzan_year_id: selectedYear.id,
    })

    if (error) toast.error('Failed: ' + error.message)
    else {
      toast.success('Expense recorded!')
      setExpenseForm({ title: '', amount: '', notes: '' })
      setExpenseBillFile(null)
      setShowExpenseForm(false)
      loadDetails(selectedYear.id)
    }
    setSaving(false)
  }

  async function handleDeleteExpense(id) {
    if (!confirm('Delete this expense?')) return
    const { error } = await deleteRamzanExpense(id)
    if (error) toast.error('Delete failed')
    else { toast.success('Deleted'); loadDetails(selectedYear.id) }
  }

  function handleExportPDF() {
    if (!selectedYear || contributions.length === 0) {
      return toast.error('No contributions to export')
    }
    generateRamzanPDF(selectedYear, contributions)
    toast.success('PDF generated!')
  }

  const totalContribs = contributions.reduce((s, c) => s + Number(c.amount), 0)
  const totalRamzanExp = ramzanExpenses.reduce((s, e) => s + Number(e.amount), 0)
  const balance = totalContribs - totalRamzanExp

  return (
    <div>
      <PageHeader
        title="Ramzan Management"
        subtitle="Hafiz contributions and Ramzan-related expense tracking"
        icon="fa-moon"
      />

      <div className="row">
        {/* Left: Year selector */}
        <div className="col-lg-3 col-md-4">
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h6 className="mb-0" style={{ fontFamily: 'Amiri, serif' }}>Ramzan Years</h6>
              <button
                className="btn btn-xs btn-success"
                onClick={() => setShowYearForm(!showYearForm)}
              >
                <i className="fas fa-plus" />
              </button>
            </div>

            {showYearForm && (
              <div className="card-body" style={{ borderBottom: '1px solid #e5e7eb' }}>
                <form onSubmit={handleAddYear}>
                  <div className="form-group mb-2">
                    <label>Year</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={yearForm.year}
                      onChange={e => setYearForm(f => ({ ...f, year: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group mb-2">
                    <label>Hafiz Name *</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Full name"
                      value={yearForm.hafiz_name}
                      onChange={e => setYearForm(f => ({ ...f, hafiz_name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group mb-2">
                    <label>Expected Salary (₹)</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      placeholder="e.g., 21000"
                      value={yearForm.expected_salary}
                      onChange={e => setYearForm(f => ({ ...f, expected_salary: e.target.value }))}
                    />
                  </div>
                  <div className="form-group mb-2">
                    <label>Notes</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={yearForm.notes}
                      onChange={e => setYearForm(f => ({ ...f, notes: e.target.value }))}
                    />
                  </div>
                  <div className="d-flex" style={{ gap: '6px' }}>
                    <button type="submit" className="btn btn-success btn-sm flex-fill" disabled={saving}>
                      Save
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowYearForm(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="card-body p-0">
              {loadingYears ? (
                <div className="text-center py-3"><div className="spinner-border spinner-border-sm text-success" /></div>
              ) : years.length === 0 ? (
                <div className="text-center py-4 text-muted" style={{ fontSize: '0.82rem' }}>
                  No Ramzan years yet.<br />Click + to add one.
                </div>
              ) : (
                <ul className="list-group list-group-flush">
                  {years.map(y => (
                    <li
                      key={y.id}
                      className={`list-group-item list-group-item-action ${selectedYear?.id === y.id ? 'active' : ''}`}
                      style={{ cursor: 'pointer', padding: '12px 16px' }}
                      onClick={() => setSelectedYear(y)}
                    >
                      <div style={{ fontWeight: '700', fontFamily: 'Amiri, serif' }}>
                        Ramzan {y.year}
                      </div>
                      <div style={{ fontSize: '0.78rem', opacity: 0.75 }}>
                        Hafiz {y.hafiz_name}
                      </div>
                      {y.expected_salary > 0 && (
                        <div style={{ fontSize: '0.72rem', opacity: 0.6 }}>
                          Expected: {formatCurrency(y.expected_salary)}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Right: Details */}
        <div className="col-lg-9 col-md-8">
          {!selectedYear ? (
            <div className="card">
              <div className="card-body text-center py-5 text-muted">
                <i className="fas fa-moon fa-3x mb-3" style={{ opacity: 0.2 }} />
                <p>Select or create a Ramzan year to get started.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Year header */}
              <div className="card mb-3" style={{ background: 'linear-gradient(135deg, #1a2035, #253050)', color: '#fff', border: 'none' }}>
                <div className="card-body d-flex align-items-center justify-content-between">
                  <div>
                    <h4 style={{ fontFamily: 'Amiri, serif', margin: 0, color: '#c9a227' }}>
                      Ramzan {selectedYear.year}
                    </h4>
                    <p style={{ margin: 0, opacity: 0.75, fontSize: '0.9rem' }}>
                      Hafiz {selectedYear.hafiz_name}
                      {selectedYear.expected_salary > 0 && ` · Expected: ${formatCurrency(selectedYear.expected_salary)}`}
                    </p>
                    {selectedYear.notes && (
                      <p style={{ margin: '4px 0 0', opacity: 0.55, fontSize: '0.8rem' }}>{selectedYear.notes}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <button className="btn btn-warning btn-sm" onClick={handleExportPDF}>
                      <i className="fas fa-file-pdf mr-1" /> Eid Report PDF
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div className="stat-cards-grid stat-cards-3 mb-3">
                <div className="stat-card">
                  <div className="stat-card-icon" style={{ background: '#1a5c2a' }}>
                    <i className="fas fa-users" />
                  </div>
                  <div className="stat-card-body">
                    <div className="stat-card-label">Members</div>
                    <div className="stat-card-value">{contributions.length}</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-icon" style={{ background: '#c9a227' }}>
                    <i className="fas fa-rupee-sign" />
                  </div>
                  <div className="stat-card-body">
                    <div className="stat-card-label">Collected</div>
                    <div className="stat-card-value">{formatCurrency(totalContribs)}</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-icon" style={{ background: balance >= 0 ? '#1565c0' : '#b71c1c' }}>
                    <i className="fas fa-balance-scale" />
                  </div>
                  <div className="stat-card-body">
                    <div className="stat-card-label">Balance</div>
                    <div className="stat-card-value" style={{ color: balance >= 0 ? '#15803d' : '#b91c1c' }}>
                      {formatCurrency(balance)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="card">
                <div className="card-header p-0">
                  <ul className="nav nav-tabs" style={{ padding: '0 16px' }}>
                    <li className="nav-item">
                      <button
                        className={`nav-link ${activeTab === 'contributions' ? 'active' : ''}`}
                        onClick={() => setActiveTab('contributions')}
                      >
                        <i className="fas fa-users mr-1" />
                        Contributions ({contributions.length})
                      </button>
                    </li>
                    <li className="nav-item">
                      <button
                        className={`nav-link ${activeTab === 'expenses' ? 'active' : ''}`}
                        onClick={() => setActiveTab('expenses')}
                      >
                        <i className="fas fa-file-invoice-dollar mr-1" />
                        Expenses ({ramzanExpenses.length})
                      </button>
                    </li>
                  </ul>
                </div>

                <div className="card-body">
                  {/* CONTRIBUTIONS TAB */}
                  {activeTab === 'contributions' && (
                    <>
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <div>
                          {selectedYear.expected_salary > 0 && (
                            <div className="progress" style={{ height: '8px', width: '200px', marginBottom: '4px' }}>
                              <div
                                className="progress-bar bg-success"
                                style={{ width: `${Math.min(100, (totalContribs / selectedYear.expected_salary) * 100)}%` }}
                              />
                            </div>
                          )}
                          <small className="text-muted">
                            {formatCurrency(totalContribs)} of {formatCurrency(selectedYear.expected_salary)} target
                          </small>
                        </div>
                        <button className="btn btn-success btn-sm" onClick={() => setShowContribForm(!showContribForm)}>
                          <i className={`fas ${showContribForm ? 'fa-times' : 'fa-plus'} mr-1`} />
                          {showContribForm ? 'Cancel' : 'Add Member'}
                        </button>
                      </div>

                      {showContribForm && (
                        <form onSubmit={handleAddContrib} className="p-3 mb-3 rounded" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                          <div className="row">
                            <div className="col-md-5">
                              <div className="form-group mb-2">
                                <label>Member Name *</label>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  placeholder="Full name"
                                  value={contribForm.member_name}
                                  onChange={e => setContribForm(f => ({ ...f, member_name: e.target.value }))}
                                  required
                                />
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="form-group mb-2">
                                <label>Amount (₹) *</label>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  min="0"
                                  value={contribForm.amount}
                                  onChange={e => setContribForm(f => ({ ...f, amount: e.target.value }))}
                                  required
                                />
                              </div>
                            </div>
                            <div className="col-md-4">
                              <div className="form-group mb-2">
                                <label>Payment Date *</label>
                                <input
                                  type="date"
                                  className="form-control form-control-sm"
                                  value={contribForm.payment_date}
                                  onChange={e => setContribForm(f => ({ ...f, payment_date: e.target.value }))}
                                  required
                                />
                              </div>
                            </div>
                          </div>
                          <div className="form-group mb-2">
                            <label>Notes</label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={contribForm.notes}
                              onChange={e => setContribForm(f => ({ ...f, notes: e.target.value }))}
                            />
                          </div>
                          <button type="submit" className="btn btn-success btn-sm" disabled={saving}>
                            {saving ? 'Saving...' : 'Add Contribution'}
                          </button>
                        </form>
                      )}

                      {contributions.length === 0 ? (
                        <div className="text-center py-4 text-muted">
                          <p>No contributions recorded yet.</p>
                        </div>
                      ) : (
                        <div className="table-responsive">
                          <table className="table table-hover mb-0">
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>Member Name</th>
                                <th>Amount</th>
                                <th>Payment Date</th>
                                <th>Notes</th>
                                <th />
                              </tr>
                            </thead>
                            <tbody>
                              {contributions.map((c, i) => (
                                <tr key={c.id}>
                                  <td style={{ color: '#9ca3af' }}>{i + 1}</td>
                                  <td><strong>{c.member_name}</strong></td>
                                  <td className="amount-positive">{formatCurrency(c.amount)}</td>
                                  <td>{formatDate(c.payment_date)}</td>
                                  <td>{c.notes || <span className="text-muted">—</span>}</td>
                                  <td>
                                    <button className="btn btn-xs btn-outline-danger" onClick={() => handleDeleteContrib(c.id)}>
                                      <i className="fas fa-trash" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr style={{ background: '#f0fdf4', fontWeight: '700' }}>
                                <td colSpan={2}>Total — {contributions.length} members</td>
                                <td className="amount-positive">{formatCurrency(totalContribs)}</td>
                                <td colSpan={3} />
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </>
                  )}

                  {/* EXPENSES TAB */}
                  {activeTab === 'expenses' && (
                    <>
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                          Total: <strong className="amount-negative">{formatCurrency(totalRamzanExp)}</strong>
                        </span>
                        <button className="btn btn-danger btn-sm" onClick={() => setShowExpenseForm(!showExpenseForm)}>
                          <i className={`fas ${showExpenseForm ? 'fa-times' : 'fa-plus'} mr-1`} />
                          {showExpenseForm ? 'Cancel' : 'Add Expense'}
                        </button>
                      </div>

                      {showExpenseForm && (
                        <form onSubmit={handleAddExpense} className="p-3 mb-3 rounded" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                          <div className="row">
                            <div className="col-md-6">
                              <div className="form-group mb-2">
                                <label>Title *</label>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  placeholder="e.g., Dress Material Purchase"
                                  value={expenseForm.title}
                                  onChange={e => setExpenseForm(f => ({ ...f, title: e.target.value }))}
                                  required
                                />
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="form-group mb-2">
                                <label>Amount (₹) *</label>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  min="0"
                                  value={expenseForm.amount}
                                  onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))}
                                  required
                                />
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="form-group mb-2">
                                <label>Notes</label>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={expenseForm.notes}
                                  onChange={e => setExpenseForm(f => ({ ...f, notes: e.target.value }))}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="form-group mb-2">
                            <FileUpload
                              label="Bill Image / PDF (optional)"
                              accept="image/*,.pdf"
                              onFileSelect={setExpenseBillFile}
                            />
                          </div>
                          <button type="submit" className="btn btn-danger btn-sm" disabled={saving}>
                            {saving ? 'Saving...' : 'Add Expense'}
                          </button>
                        </form>
                      )}

                      {ramzanExpenses.length === 0 ? (
                        <div className="text-center py-4 text-muted"><p>No Ramzan expenses yet.</p></div>
                      ) : (
                        <div className="table-responsive">
                          <table className="table table-hover mb-0">
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>Title</th>
                                <th>Amount</th>
                                <th>Notes</th>
                                <th>Bill</th>
                                <th />
                              </tr>
                            </thead>
                            <tbody>
                              {ramzanExpenses.map((e, i) => (
                                <tr key={e.id}>
                                  <td style={{ color: '#9ca3af' }}>{i + 1}</td>
                                  <td><strong>{e.title}</strong></td>
                                  <td className="amount-negative">{formatCurrency(e.amount)}</td>
                                  <td>{e.notes || <span className="text-muted">—</span>}</td>
                                  <td>
                                    {e.bill_url ? (
                                      <span className="badge badge-warning">
                                        <i className="fas fa-file mr-1" />Bill
                                      </span>
                                    ) : <span className="text-muted">—</span>}
                                  </td>
                                  <td>
                                    <button className="btn btn-xs btn-outline-danger" onClick={() => handleDeleteExpense(e.id)}>
                                      <i className="fas fa-trash" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr style={{ background: '#fff5f5', fontWeight: '700' }}>
                                <td colSpan={2}>Total</td>
                                <td className="amount-negative">{formatCurrency(totalRamzanExp)}</td>
                                <td colSpan={3} />
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
