import { useEffect, useState } from 'react'
import {
  getRamzanYears, addRamzanYear,
  getRamzanContributions, addRamzanContribution, deleteRamzanContribution,
  getRamzanExpenses, addRamzanExpense, deleteRamzanExpense,
  getJamatMembers,
  uploadFile, supabase, logAudit
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
  const { user, role } = useAuth()
  const isAdmin = role === 'admin'

  const [years, setYears] = useState([])
  const [selectedYear, setSelectedYear] = useState(null)
  const [contributions, setContributions] = useState([])
  const [ramzanExpenses, setRamzanExpenses] = useState([])
  const [jamatMembers, setJamatMembers] = useState([])
  const [activeTab, setActiveTab] = useState('contributions')
  const [loadingYears, setLoadingYears] = useState(true)
  const [showYearForm, setShowYearForm] = useState(false)
  const [showContribForm, setShowContribForm] = useState(false)
  const [showExpenseForm, setShowExpenseForm] = useState(false)

  const [editingField, setEditingField] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  const [yearForm, setYearForm] = useState({
    year: getCurrentYear(),
    hafiz_name: '',
    expected_salary: '',
    notes: '',
  })

  const [contribForm, setContribForm] = useState({
    jamat_member_id: '',
    amount: '1000',
    payment_date: new Date().toISOString().split('T')[0],
    payment_mode: 'Cash',
    payment_status: 'paid',
    notes: '',
  })

  const [expenseForm, setExpenseForm] = useState({ title: '', amount: '', notes: '' })
  const [expenseBillFile, setExpenseBillFile] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getJamatMembers(true).then(({ data }) => setJamatMembers(data || []))
  }, [])

  async function loadYears() {
    setLoadingYears(true)
    const { data } = await getRamzanYears()
    setYears(data || [])
    if (data?.length > 0 && !selectedYear) setSelectedYear(data[0])
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

  // ── Inline edit ──────────────────────────────────────────
  function startEdit(field) {
    setEditingField(field)
    setEditValue(field === 'hafiz_name' ? selectedYear.hafiz_name : String(selectedYear.expected_salary || ''))
  }
  function cancelEdit() { setEditingField(null); setEditValue('') }

  async function saveEdit() {
    if (!editValue.trim()) return toast.error('Value cannot be empty')
    setEditSaving(true)
    const update = editingField === 'hafiz_name'
      ? { hafiz_name: editValue.trim() }
      : { expected_salary: parseFloat(editValue) || 0 }

    const { error } = await supabase.from('ramzan_year').update(update).eq('id', selectedYear.id)
    if (error) {
      toast.error('Failed to update: ' + error.message)
    } else {
      toast.success('Updated!')
      const updated = { ...selectedYear, ...update }
      setSelectedYear(updated)
      setYears(years.map(y => y.id === updated.id ? updated : y))
      await logAudit(supabase, {
        action: 'UPDATE', table_name: 'ramzan_year', record_id: selectedYear.id,
        description: `Updated ${editingField === 'hafiz_name' ? 'Hafiz name' : 'expected salary'} for Ramzan ${selectedYear.year}`,
        performed_by: user?.email,
      })
      setEditingField(null); setEditValue('')
    }
    setEditSaving(false)
  }

  // ── Year form ────────────────────────────────────────────
  async function handleAddYear(e) {
    e.preventDefault()
    if (!yearForm.hafiz_name) return toast.error('Hafiz name required')
    setSaving(true)
    const { data, error } = await addRamzanYear({
      ...yearForm,
      year: parseInt(yearForm.year),
      expected_salary: parseFloat(yearForm.expected_salary) || 0,
    })
    if (error) {
      toast.error('Failed: ' + error.message)
    } else {
      toast.success('Ramzan year created!')
      await logAudit(supabase, {
        action: 'CREATE', table_name: 'ramzan_year', record_id: data?.id,
        description: `Created Ramzan ${yearForm.year} — Hafiz ${yearForm.hafiz_name}`,
        performed_by: user?.email,
      })
      setShowYearForm(false)
      setYearForm({ year: getCurrentYear(), hafiz_name: '', expected_salary: '', notes: '' })
      await loadYears()
      setSelectedYear(data)
    }
    setSaving(false)
  }

  // ── Contribution form ────────────────────────────────────
  async function handleAddContrib(e) {
    e.preventDefault()
    if (!contribForm.jamat_member_id) return toast.error('Please select a member')
    if (!contribForm.amount || parseFloat(contribForm.amount) <= 0) return toast.error('Enter valid amount')

    setSaving(true)
    const { data, error } = await supabase.from('ramzan_contributions').insert({
      ramzan_year_id: selectedYear.id,
      jamat_member_id: contribForm.jamat_member_id,
      amount: parseFloat(contribForm.amount),
      payment_date: contribForm.payment_date,
      payment_mode: contribForm.payment_mode,
      payment_status: contribForm.payment_status,
      notes: contribForm.notes,
    }).select().single()

    if (error) {
      toast.error('Failed: ' + error.message)
    } else {
      const memberName = jamatMembers.find(m => m.id === contribForm.jamat_member_id)?.name || ''
      await logAudit(supabase, {
        action: 'CREATE', table_name: 'ramzan_contributions', record_id: data?.id,
        description: `Added Ramzan contribution ${formatCurrency(contribForm.amount)} from ${memberName} [${contribForm.payment_status}]`,
        performed_by: user?.email,
      })
      toast.success('Contribution added!')
      setContribForm({ jamat_member_id: '', amount: '1000', payment_date: new Date().toISOString().split('T')[0], payment_mode: 'Cash', payment_status: 'paid', notes: '' })
      setShowContribForm(false)
      loadDetails(selectedYear.id)
    }
    setSaving(false)
  }

  async function handleDeleteContrib(id, memberName, amount) {
    if (!confirm('Delete this contribution?')) return
    const { error } = await deleteRamzanContribution(id)
    if (error) toast.error('Delete failed')
    else {
      await logAudit(supabase, {
        action: 'DELETE', table_name: 'ramzan_contributions', record_id: id,
        description: `Deleted Ramzan contribution ${formatCurrency(amount)} from ${memberName}`,
        performed_by: user?.email,
      })
      toast.success('Deleted'); loadDetails(selectedYear.id)
    }
  }

  async function handleMarkPaid(contrib) {
    const { error } = await supabase.from('ramzan_contributions')
      .update({ payment_status: 'paid' }).eq('id', contrib.id)
    if (error) toast.error('Failed to update')
    else {
      toast.success(`${getMemberName(contrib)} marked as paid`)
      loadDetails(selectedYear.id)
    }
  }

  // ── Expense form ─────────────────────────────────────────
  async function handleAddExpense(e) {
    e.preventDefault()
    if (!expenseForm.title) return toast.error('Title required')
    if (!expenseForm.amount || parseFloat(expenseForm.amount) <= 0) return toast.error('Enter valid amount')

    setSaving(true)
    let bill_url = null
    if (expenseBillFile) {
      const path = `ramzan/${generateUniqueFileName(expenseBillFile.name)}`
      const { publicUrl } = await uploadFile('ramzan-bills', expenseBillFile, path)
      bill_url = publicUrl
    }

    const { data, error } = await addRamzanExpense({
      ...expenseForm,
      amount: parseFloat(expenseForm.amount),
      bill_url,
      ramzan_year_id: selectedYear.id,
    })

    if (error) {
      toast.error('Failed: ' + error.message)
    } else {
      await logAudit(supabase, {
        action: 'CREATE', table_name: 'ramzan_expenses', record_id: data?.id,
        description: `Added Ramzan expense "${expenseForm.title}" ${formatCurrency(expenseForm.amount)}`,
        performed_by: user?.email,
      })
      toast.success('Expense recorded!')
      setExpenseForm({ title: '', amount: '', notes: '' })
      setExpenseBillFile(null)
      setShowExpenseForm(false)
      loadDetails(selectedYear.id)
    }
    setSaving(false)
  }

  async function handleDeleteExpense(id, title, amount) {
    if (!confirm('Delete this expense?')) return
    const { error } = await deleteRamzanExpense(id)
    if (error) toast.error('Delete failed')
    else {
      await logAudit(supabase, {
        action: 'DELETE', table_name: 'ramzan_expenses', record_id: id,
        description: `Deleted Ramzan expense "${title}" ${formatCurrency(amount)}`,
        performed_by: user?.email,
      })
      toast.success('Deleted'); loadDetails(selectedYear.id)
    }
  }

  function handleExportPDF() {
    if (!selectedYear || contributions.length === 0) return toast.error('No contributions to export')
    generateRamzanPDF(selectedYear, contributions)
    toast.success('PDF generated!')
  }

  function getMemberName(c) {
    if (c.jamat_members?.name) return c.jamat_members.name
    const found = jamatMembers.find(m => m.id === c.jamat_member_id)
    if (found) return found.name
    return c.member_name || '—'
  }

  // Paid vs pending breakdown
  const paidContribs = contributions.filter(c => c.payment_status !== 'pending')
  const pendingContribs = contributions.filter(c => c.payment_status === 'pending')

  // Members who haven't contributed at all
  const contributedMemberIds = new Set(contributions.map(c => c.jamat_member_id))
  const notContributedMembers = jamatMembers.filter(m => !contributedMemberIds.has(m.id))

  const totalContribs = paidContribs.reduce((s, c) => s + Number(c.amount), 0)
  const totalPending = pendingContribs.reduce((s, c) => s + Number(c.amount), 0)
  const totalRamzanExp = ramzanExpenses.reduce((s, e) => s + Number(e.amount), 0)
  const balance = totalContribs - totalRamzanExp

  // ── Inline edit component ────────────────────────────────
  function EditableField({ field, label, type = 'text', displayValue }) {
    if (!isAdmin) return <span>{displayValue}</span>
    if (editingField === field) {
      return (
        <div className="d-flex align-items-center" style={{ gap: '6px', marginTop: '4px' }}>
          <input
            type={type}
            className="form-control form-control-sm"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }}
            autoFocus
            style={{ maxWidth: '200px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)' }}
          />
          <button className="btn btn-xs btn-success" onClick={saveEdit} disabled={editSaving}>
            {editSaving ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-check" />}
          </button>
          <button className="btn btn-xs btn-secondary" onClick={cancelEdit}>
            <i className="fas fa-times" />
          </button>
        </div>
      )
    }
    return (
      <span
        style={{ cursor: 'pointer', borderBottom: '1px dashed rgba(255,255,255,0.4)', paddingBottom: '1px' }}
        onClick={() => startEdit(field)}
        title={`Click to edit ${label}`}
      >
        {displayValue}
        <i className="fas fa-pen ml-2" style={{ fontSize: '0.65rem', opacity: 0.6 }} />
      </span>
    )
  }

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
              {isAdmin && (
                <button className="btn btn-xs btn-success" onClick={() => setShowYearForm(!showYearForm)}>
                  <i className="fas fa-plus" />
                </button>
              )}
            </div>

            {showYearForm && isAdmin && (
              <div className="card-body" style={{ borderBottom: '1px solid #e5e7eb' }}>
                <form onSubmit={handleAddYear}>
                  <div className="form-group mb-2">
                    <label>Year</label>
                    <input type="number" className="form-control form-control-sm" value={yearForm.year}
                      onChange={e => setYearForm(f => ({ ...f, year: e.target.value }))} required />
                  </div>
                  <div className="form-group mb-2">
                    <label>Hafiz Name *</label>
                    <input type="text" className="form-control form-control-sm" placeholder="Full name"
                      value={yearForm.hafiz_name} onChange={e => setYearForm(f => ({ ...f, hafiz_name: e.target.value }))} required />
                  </div>
                  <div className="form-group mb-2">
                    <label>Expected Salary (₹)</label>
                    <input type="number" className="form-control form-control-sm" placeholder="e.g., 21000"
                      value={yearForm.expected_salary} onChange={e => setYearForm(f => ({ ...f, expected_salary: e.target.value }))} />
                  </div>
                  <div className="form-group mb-2">
                    <label>Notes</label>
                    <input type="text" className="form-control form-control-sm"
                      value={yearForm.notes} onChange={e => setYearForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                  <div className="d-flex" style={{ gap: '6px' }}>
                    <button type="submit" className="btn btn-success btn-sm flex-fill" disabled={saving}>Save</button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowYearForm(false)}>Cancel</button>
                  </div>
                </form>
              </div>
            )}

            <div className="card-body p-0">
              {loadingYears ? (
                <div className="text-center py-3"><div className="spinner-border spinner-border-sm text-success" /></div>
              ) : years.length === 0 ? (
                <div className="text-center py-4 text-muted" style={{ fontSize: '0.82rem' }}>
                  No Ramzan years yet.{isAdmin && <><br />Click + to add one.</>}
                </div>
              ) : (
                <ul className="list-group list-group-flush">
                  {years.map(y => (
                    <li key={y.id}
                      className={`list-group-item list-group-item-action ${selectedYear?.id === y.id ? 'active' : ''}`}
                      style={{ cursor: 'pointer', padding: '12px 16px' }}
                      onClick={() => setSelectedYear(y)}
                    >
                      <div style={{ fontWeight: '700', fontFamily: 'Amiri, serif' }}>Ramzan {y.year}</div>
                      <div style={{ fontSize: '0.78rem', opacity: 0.75 }}>Hafiz {y.hafiz_name}</div>
                      {y.expected_salary > 0 && (
                        <div style={{ fontSize: '0.72rem', opacity: 0.6 }}>Expected: {formatCurrency(y.expected_salary)}</div>
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
                <div className="card-body d-flex align-items-start justify-content-between">
                  <div>
                    <h4 style={{ fontFamily: 'Amiri, serif', margin: 0, color: '#c9a227' }}>Ramzan {selectedYear.year}</h4>
                    <p style={{ margin: '6px 0 0', opacity: 0.75, fontSize: '0.9rem' }}>
                      Hafiz <EditableField field="hafiz_name" label="Hafiz Name" type="text" displayValue={selectedYear.hafiz_name} />
                    </p>
                    <p style={{ margin: '6px 0 0', opacity: 0.75, fontSize: '0.85rem' }}>
                      Expected Salary: <EditableField field="expected_salary" label="Expected Salary" type="number" displayValue={formatCurrency(selectedYear.expected_salary)} />
                    </p>
                    {selectedYear.notes && <p style={{ margin: '4px 0 0', opacity: 0.55, fontSize: '0.8rem' }}>{selectedYear.notes}</p>}
                  </div>
                  <button className="btn btn-warning btn-sm" onClick={handleExportPDF}>
                    <i className="fas fa-file-pdf mr-1" /> Eid Report PDF
                  </button>
                </div>
              </div>

              {/* Stats row */}
              <div className="row mb-3">
                <div className="col-6 col-md-3 mb-2">
                  <div className="stat-card">
                    <div className="stat-card-icon" style={{ background: '#1a5c2a' }}><i className="fas fa-users" /></div>
                    <div className="stat-card-body">
                      <div className="stat-card-label">Members</div>
                      <div className="stat-card-value">{contributions.length}</div>
                    </div>
                  </div>
                </div>
                <div className="col-6 col-md-3 mb-2">
                  <div className="stat-card">
                    <div className="stat-card-icon" style={{ background: '#c9a227' }}><i className="fas fa-rupee-sign" /></div>
                    <div className="stat-card-body">
                      <div className="stat-card-label">Collected</div>
                      <div className="stat-card-value">{formatCurrency(totalContribs)}</div>
                    </div>
                  </div>
                </div>
                <div className="col-6 col-md-3 mb-2">
                  <div className="stat-card">
                    <div className="stat-card-icon" style={{ background: '#e65100' }}><i className="fas fa-clock" /></div>
                    <div className="stat-card-body">
                      <div className="stat-card-label">Pending</div>
                      <div className="stat-card-value" style={{ color: pendingContribs.length > 0 ? '#e65100' : '#15803d' }}>
                        {pendingContribs.length + notContributedMembers.length}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-6 col-md-3 mb-2">
                  <div className="stat-card">
                    <div className="stat-card-icon" style={{ background: balance >= 0 ? '#1565c0' : '#b71c1c' }}><i className="fas fa-balance-scale" /></div>
                    <div className="stat-card-body">
                      <div className="stat-card-label">Balance</div>
                      <div className="stat-card-value" style={{ color: balance >= 0 ? '#15803d' : '#b91c1c' }}>
                        {formatCurrency(balance)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              {selectedYear.expected_salary > 0 && (
                <div className="card mb-3">
                  <div className="card-body py-2">
                    <div className="d-flex justify-content-between mb-1">
                      <small className="text-muted">
                        {formatCurrency(totalContribs)} collected of {formatCurrency(selectedYear.expected_salary)} target
                      </small>
                      <small className="font-weight-bold">
                        {Math.round((totalContribs / selectedYear.expected_salary) * 100)}%
                      </small>
                    </div>
                    <div className="progress" style={{ height: '10px' }}>
                      <div
                        className="progress-bar bg-success"
                        style={{ width: `${Math.min(100, (totalContribs / selectedYear.expected_salary) * 100)}%` }}
                      />
                      {totalPending > 0 && (
                        <div
                          className="progress-bar bg-warning"
                          style={{ width: `${Math.min(100 - Math.min(100, (totalContribs / selectedYear.expected_salary) * 100), (totalPending / selectedYear.expected_salary) * 100)}%` }}
                        />
                      )}
                    </div>
                    <div className="d-flex mt-1" style={{ gap: '12px' }}>
                      <small><span className="badge badge-success mr-1">■</span>Paid: {formatCurrency(totalContribs)}</small>
                      {totalPending > 0 && <small><span className="badge badge-warning mr-1">■</span>Pending: {formatCurrency(totalPending)}</small>}
                      <small className="text-muted">Remaining: {formatCurrency(Math.max(0, selectedYear.expected_salary - totalContribs - totalPending))}</small>
                    </div>
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className="card">
                <div className="card-header p-0">
                  <ul className="nav nav-tabs" style={{ padding: '0 16px' }}>
                    <li className="nav-item">
                      <button className={`nav-link ${activeTab === 'contributions' ? 'active' : ''}`} onClick={() => setActiveTab('contributions')}>
                        <i className="fas fa-check-circle mr-1 text-success" />
                        Paid ({paidContribs.length})
                      </button>
                    </li>
                    <li className="nav-item">
                      <button className={`nav-link ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>
                        <i className="fas fa-clock mr-1 text-warning" />
                        Pending ({pendingContribs.length + notContributedMembers.length})
                        {(pendingContribs.length + notContributedMembers.length) > 0 && (
                          <span className="badge badge-warning ml-1" style={{ fontSize: '0.65rem' }}>
                            {pendingContribs.length + notContributedMembers.length}
                          </span>
                        )}
                      </button>
                    </li>
                    <li className="nav-item">
                      <button className={`nav-link ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => setActiveTab('expenses')}>
                        <i className="fas fa-file-invoice-dollar mr-1" />
                        Expenses ({ramzanExpenses.length})
                      </button>
                    </li>
                  </ul>
                </div>

                <div className="card-body">

                  {/* ── PAID CONTRIBUTIONS TAB ── */}
                  {activeTab === 'contributions' && (
                    <>
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                          {paidContribs.length} members · {formatCurrency(totalContribs)}
                        </span>
                        {isAdmin && (
                          <button className="btn btn-success btn-sm" onClick={() => setShowContribForm(!showContribForm)}>
                            <i className={`fas ${showContribForm ? 'fa-times' : 'fa-plus'} mr-1`} />
                            {showContribForm ? 'Cancel' : 'Add Contribution'}
                          </button>
                        )}
                      </div>

                      {showContribForm && isAdmin && (
                        <form onSubmit={handleAddContrib} className="p-3 mb-3 rounded" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                          <div className="row">
                            <div className="col-md-5">
                              <div className="form-group mb-2">
                                <label>Member Name *</label>
                                {jamatMembers.length > 0 ? (
                                  <select className="form-control form-control-sm" value={contribForm.jamat_member_id}
                                    onChange={e => setContribForm(f => ({ ...f, jamat_member_id: e.target.value }))} required>
                                    <option value="">— Select Member —</option>
                                    {jamatMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                  </select>
                                ) : (
                                  <div className="alert alert-warning py-1 px-2 mb-0" style={{ fontSize: '0.8rem' }}>
                                    <i className="fas fa-exclamation-triangle mr-1" />
                                    No members. <a href="/jamat-members" target="_blank" rel="noreferrer">Add members first</a>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="form-group mb-2">
                                <label>Amount (₹) *</label>
                                <input type="number" className="form-control form-control-sm" min="0"
                                  value={contribForm.amount} onChange={e => setContribForm(f => ({ ...f, amount: e.target.value }))} required />
                              </div>
                            </div>
                            <div className="col-md-4">
                              <div className="form-group mb-2">
                                <label>Payment Date *</label>
                                <input type="date" className="form-control form-control-sm"
                                  value={contribForm.payment_date} onChange={e => setContribForm(f => ({ ...f, payment_date: e.target.value }))} required />
                              </div>
                            </div>
                          </div>
                          <div className="row">
                            <div className="col-md-4">
                              <div className="form-group mb-2">
                                <label>Payment Mode</label>
                                <select className="form-control form-control-sm" value={contribForm.payment_mode}
                                  onChange={e => setContribForm(f => ({ ...f, payment_mode: e.target.value }))}>
                                  <option>Cash</option>
                                  <option>Bank Transfer</option>
                                  <option>UPI</option>
                                  <option>Cheque</option>
                                </select>
                              </div>
                            </div>
                            <div className="col-md-4">
                              <div className="form-group mb-2">
                                <label>Status</label>
                                <select className="form-control form-control-sm" value={contribForm.payment_status}
                                  onChange={e => setContribForm(f => ({ ...f, payment_status: e.target.value }))}>
                                  <option value="paid">Paid ✓</option>
                                  <option value="pending">Pending (promised)</option>
                                </select>
                              </div>
                            </div>
                            <div className="col-md-4">
                              <div className="form-group mb-2">
                                <label>Notes</label>
                                <input type="text" className="form-control form-control-sm" placeholder="Optional"
                                  value={contribForm.notes} onChange={e => setContribForm(f => ({ ...f, notes: e.target.value }))} />
                              </div>
                            </div>
                          </div>
                          <button type="submit" className="btn btn-success btn-sm" disabled={saving || jamatMembers.length === 0}>
                            {saving ? 'Saving...' : 'Add Contribution'}
                          </button>
                        </form>
                      )}

                      {paidContribs.length === 0 ? (
                        <div className="text-center py-4 text-muted"><p>No paid contributions yet.</p></div>
                      ) : (
                        <div className="table-responsive">
                          <table className="table table-hover mb-0">
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>Member Name</th>
                                <th>Amount</th>
                                <th>Date</th>
                                <th>Mode</th>
                                <th>Notes</th>
                                {isAdmin && <th />}
                              </tr>
                            </thead>
                            <tbody>
                              {paidContribs.map((c, i) => (
                                <tr key={c.id}>
                                  <td style={{ color: '#9ca3af' }}>{i + 1}</td>
                                  <td><strong>{getMemberName(c)}</strong></td>
                                  <td className="amount-positive">{formatCurrency(c.amount)}</td>
                                  <td>{formatDate(c.payment_date)}</td>
                                  <td style={{ fontSize: '0.85rem' }}>{c.payment_mode || '—'}</td>
                                  <td>{c.notes || <span className="text-muted">—</span>}</td>
                                  {isAdmin && (
                                    <td>
                                      <button className="btn btn-xs btn-outline-danger" onClick={() => handleDeleteContrib(c.id, getMemberName(c), c.amount)}>
                                        <i className="fas fa-trash" />
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr style={{ background: '#f0fdf4', fontWeight: '700' }}>
                                <td colSpan={2}>Total — {paidContribs.length} members</td>
                                <td className="amount-positive">{formatCurrency(totalContribs)}</td>
                                <td colSpan={isAdmin ? 4 : 3} />
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </>
                  )}

                  {/* ── PENDING TAB ── */}
                  {activeTab === 'pending' && (
                    <>
                      {/* Promised (pending status) */}
                      {pendingContribs.length > 0 && (
                        <>
                          <h6 className="mb-2">
                            <i className="fas fa-handshake mr-2 text-warning" />
                            Promised but not yet paid ({pendingContribs.length})
                          </h6>
                          <div className="table-responsive mb-4">
                            <table className="table table-hover mb-0">
                              <thead>
                                <tr>
                                  <th>#</th>
                                  <th>Member Name</th>
                                  <th>Promised Amount</th>
                                  <th>Date Added</th>
                                  <th>Notes</th>
                                  {isAdmin && <th>Actions</th>}
                                </tr>
                              </thead>
                              <tbody>
                                {pendingContribs.map((c, i) => (
                                  <tr key={c.id} style={{ background: '#fffbeb' }}>
                                    <td style={{ color: '#9ca3af' }}>{i + 1}</td>
                                    <td><strong>{getMemberName(c)}</strong></td>
                                    <td><span className="text-warning font-weight-bold">{formatCurrency(c.amount)}</span></td>
                                    <td>{formatDate(c.payment_date)}</td>
                                    <td>{c.notes || <span className="text-muted">—</span>}</td>
                                    {isAdmin && (
                                      <td>
                                        <div className="d-flex" style={{ gap: '4px' }}>
                                          <button className="btn btn-xs btn-success" onClick={() => handleMarkPaid(c)} title="Mark as paid">
                                            <i className="fas fa-check mr-1" />Paid
                                          </button>
                                          <button className="btn btn-xs btn-outline-danger" onClick={() => handleDeleteContrib(c.id, getMemberName(c), c.amount)}>
                                            <i className="fas fa-trash" />
                                          </button>
                                        </div>
                                      </td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr style={{ background: '#fef3c7', fontWeight: '700' }}>
                                  <td colSpan={2}>Pending Total</td>
                                  <td className="text-warning">{formatCurrency(totalPending)}</td>
                                  <td colSpan={isAdmin ? 3 : 2} />
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </>
                      )}

                      {/* Members who haven't contributed at all */}
                      {notContributedMembers.length > 0 ? (
                        <>
                          <h6 className="mb-2">
                            <i className="fas fa-user-times mr-2 text-danger" />
                            Not yet contributed ({notContributedMembers.length} members)
                          </h6>
                          <div className="table-responsive">
                            <table className="table table-hover mb-0">
                              <thead>
                                <tr>
                                  <th>#</th>
                                  <th>Member Name</th>
                                  <th>Phone</th>
                                  {isAdmin && <th>Quick Add</th>}
                                </tr>
                              </thead>
                              <tbody>
                                {notContributedMembers.map((m, i) => (
                                  <tr key={m.id} style={{ background: '#fff5f5' }}>
                                    <td style={{ color: '#9ca3af' }}>{i + 1}</td>
                                    <td><strong>{m.name}</strong></td>
                                    <td style={{ fontSize: '0.85rem' }}>{m.phone || <span className="text-muted">—</span>}</td>
                                    {isAdmin && (
                                      <td>
                                        <button
                                          className="btn btn-xs btn-outline-success"
                                          onClick={() => {
                                            setContribForm(f => ({ ...f, jamat_member_id: m.id }))
                                            setShowContribForm(true)
                                            setActiveTab('contributions')
                                          }}
                                        >
                                          <i className="fas fa-plus mr-1" />Add
                                        </button>
                                      </td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      ) : pendingContribs.length === 0 ? (
                        <div className="text-center py-4">
                          <i className="fas fa-check-circle fa-3x text-success mb-3" style={{ opacity: 0.6 }} />
                          <p className="text-success font-weight-bold">All members have contributed!</p>
                        </div>
                      ) : null}
                    </>
                  )}

                  {/* ── EXPENSES TAB ── */}
                  {activeTab === 'expenses' && (
                    <>
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                          Total: <strong className="amount-negative">{formatCurrency(totalRamzanExp)}</strong>
                        </span>
                        {isAdmin && (
                          <button className="btn btn-danger btn-sm" onClick={() => setShowExpenseForm(!showExpenseForm)}>
                            <i className={`fas ${showExpenseForm ? 'fa-times' : 'fa-plus'} mr-1`} />
                            {showExpenseForm ? 'Cancel' : 'Add Expense'}
                          </button>
                        )}
                      </div>

                      {showExpenseForm && isAdmin && (
                        <form onSubmit={handleAddExpense} className="p-3 mb-3 rounded" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                          <div className="row">
                            <div className="col-md-6">
                              <div className="form-group mb-2">
                                <label>Title *</label>
                                <input type="text" className="form-control form-control-sm" placeholder="e.g., Dress Material"
                                  value={expenseForm.title} onChange={e => setExpenseForm(f => ({ ...f, title: e.target.value }))} required />
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="form-group mb-2">
                                <label>Amount (₹) *</label>
                                <input type="number" className="form-control form-control-sm" min="0"
                                  value={expenseForm.amount} onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))} required />
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="form-group mb-2">
                                <label>Notes</label>
                                <input type="text" className="form-control form-control-sm"
                                  value={expenseForm.notes} onChange={e => setExpenseForm(f => ({ ...f, notes: e.target.value }))} />
                              </div>
                            </div>
                          </div>
                          <div className="form-group mb-2">
                            <FileUpload label="Bill Image / PDF (optional)" accept="image/*,.pdf" onFileSelect={setExpenseBillFile} />
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
                                <th>#</th><th>Title</th><th>Amount</th><th>Notes</th><th>Bill</th>
                                {isAdmin && <th />}
                              </tr>
                            </thead>
                            <tbody>
                              {ramzanExpenses.map((e, i) => (
                                <tr key={e.id}>
                                  <td style={{ color: '#9ca3af' }}>{i + 1}</td>
                                  <td><strong>{e.title}</strong></td>
                                  <td className="amount-negative">{formatCurrency(e.amount)}</td>
                                  <td>{e.notes || <span className="text-muted">—</span>}</td>
                                  <td>{e.bill_url
                                    ? <a href={e.bill_url} target="_blank" rel="noopener noreferrer" className="badge badge-warning" style={{ cursor: 'pointer', textDecoration: 'none' }}><i className="fas fa-file mr-1" />Bill</a>
                                    : <span className="text-muted">—</span>}
                                  </td>
                                  {isAdmin && (
                                    <td>
                                      <button className="btn btn-xs btn-outline-danger" onClick={() => handleDeleteExpense(e.id, e.title, e.amount)}>
                                        <i className="fas fa-trash" />
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr style={{ background: '#fff5f5', fontWeight: '700' }}>
                                <td colSpan={2}>Total</td>
                                <td className="amount-negative">{formatCurrency(totalRamzanExp)}</td>
                                <td colSpan={isAdmin ? 3 : 2} />
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