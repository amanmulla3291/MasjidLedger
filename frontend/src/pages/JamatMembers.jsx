import { useEffect, useState } from 'react'
import {
  getJamatMembers, addJamatMember,
  updateJamatMember, deleteJamatMember,
} from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import PageHeader from '../components/PageHeader'
import toast from 'react-hot-toast'

const DEFAULT_FORM = { name: '', phone: '', email: '', address: '' }

export default function JamatMembers() {
  const { role } = useAuth()
  const isAdmin = role === 'admin'

  const [members, setMembers]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [search, setSearch]         = useState('')
  const [tab, setTab]               = useState('list')   // 'list' | 'add' | 'bulk'

  // Single add form
  const [form, setForm]             = useState(DEFAULT_FORM)

  // Inline edit
  const [editId, setEditId]         = useState(null)
  const [editForm, setEditForm]     = useState(DEFAULT_FORM)
  const [editSaving, setEditSaving] = useState(false)

  // Bulk add — rows of name entries
  const [bulkRows, setBulkRows]     = useState(
    Array(10).fill('').map((_, i) => ({ id: i, name: '', phone: '' }))
  )
  const [bulkSaving, setBulkSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data, error } = await getJamatMembers(false)
    if (!error) setMembers(data || [])
    else toast.error('Failed to load members')
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // ── Single add ──────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Name is required')
    setSaving(true)
    const { error } = await addJamatMember({
      name: form.name.trim(),
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      is_active: true,
    })
    if (error) {
      toast.error(error.message?.includes('unique') ? 'Name already exists' : error.message)
    } else {
      toast.success(`${form.name.trim()} added!`)
      setForm(DEFAULT_FORM)
      setTab('list')
      load()
    }
    setSaving(false)
  }

  // ── Bulk add ─────────────────────────────────────────────
  async function handleBulkSubmit() {
    const toAdd = bulkRows.filter(r => r.name.trim())
    if (toAdd.length === 0) return toast.error('Enter at least one name')
    setBulkSaving(true)
    let added = 0, skipped = 0
    for (const row of toAdd) {
      const { error } = await addJamatMember({
        name: row.name.trim(),
        phone: row.phone || null,
        is_active: true,
      })
      if (error) skipped++
      else added++
    }
    toast.success(`${added} member${added !== 1 ? 's' : ''} added${skipped ? `, ${skipped} skipped (duplicate)` : ''}`)
    setBulkRows(Array(10).fill('').map((_, i) => ({ id: i, name: '', phone: '' })))
    setTab('list')
    load()
    setBulkSaving(false)
  }

  // ── Inline edit ──────────────────────────────────────────
  function startEdit(m) {
    setEditId(m.id)
    setEditForm({ name: m.name, phone: m.phone || '', email: m.email || '', address: m.address || '' })
  }

  async function saveEdit(id) {
    if (!editForm.name.trim()) return toast.error('Name required')
    setEditSaving(true)
    const { error } = await updateJamatMember(id, {
      name: editForm.name.trim(),
      phone: editForm.phone || null,
      email: editForm.email || null,
      address: editForm.address || null,
    })
    if (error) toast.error('Update failed')
    else { toast.success('Updated'); setEditId(null); load() }
    setEditSaving(false)
  }

  async function handleDelete(id, name) {
    if (!confirm(`Delete "${name}"?`)) return
    const { error } = await deleteJamatMember(id)
    if (error) toast.error('Delete failed')
    else { toast.success('Deleted'); load() }
  }

  async function toggleActive(id, active, name) {
    const { error } = await updateJamatMember(id, { is_active: !active })
    if (error) toast.error('Update failed')
    else { toast.success(`${name} ${!active ? 'activated' : 'deactivated'}`); load() }
  }

  // ── Filter ───────────────────────────────────────────────
  const q = search.toLowerCase()
  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(q) ||
    (m.phone && m.phone.includes(search)) ||
    (m.email && m.email.toLowerCase().includes(q))
  )
  const active   = filtered.filter(m => m.is_active)
  const inactive = filtered.filter(m => !m.is_active)

  return (
    <div>
      <PageHeader
        title="Jamat Members"
        subtitle="Manage congregation members for Ramzan contribution tracking"
        icon="fa-users"
      />

      {/* Toolbar */}
      <div className="card mb-3">
        <div className="card-body py-2 d-flex flex-wrap align-items-center justify-content-between" style={{ gap: '10px' }}>
          <div className="d-flex align-items-center" style={{ gap: '10px' }}>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Search members..."
              style={{ width: '200px' }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <span className="badge badge-success" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
              {active.length} Active
            </span>
            {inactive.length > 0 && (
              <span className="badge badge-secondary" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
                {inactive.length} Inactive
              </span>
            )}
          </div>

          {isAdmin && (
            <div className="d-flex" style={{ gap: '8px' }}>
              <button
                className={`btn btn-sm ${tab === 'add' ? 'btn-success' : 'btn-outline-success'}`}
                onClick={() => setTab(tab === 'add' ? 'list' : 'add')}
              >
                <i className="fas fa-user-plus mr-1" />
                Add Member
              </button>
              <button
                className={`btn btn-sm ${tab === 'bulk' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setTab(tab === 'bulk' ? 'list' : 'bulk')}
              >
                <i className="fas fa-users mr-1" />
                Bulk Add
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Single Add Form ── */}
      {tab === 'add' && isAdmin && (
        <div className="card mb-4" style={{ borderLeft: '4px solid #1a5c2a' }}>
          <div className="card-header" style={{ background: '#f0fdf4' }}>
            <h5 className="card-title mb-0">
              <i className="fas fa-user-plus mr-2 text-success" />
              Add New Member
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Full Name <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Mohammed Ilyas"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      autoFocus
                      required
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="10-digit mobile"
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="optional"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Address</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Residential address"
                      value={form.address}
                      onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <div className="d-flex" style={{ gap: '8px' }}>
                <button type="submit" className="btn btn-success" disabled={saving}>
                  {saving
                    ? <><span className="spinner-border spinner-border-sm mr-2" />Saving...</>
                    : <><i className="fas fa-check mr-1" />Save Member</>
                  }
                </button>
                <button type="button" className="btn btn-outline-secondary" onClick={() => { setForm(DEFAULT_FORM); setTab('list') }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Bulk Add Form ── */}
      {tab === 'bulk' && isAdmin && (
        <div className="card mb-4" style={{ borderLeft: '4px solid #0d6efd' }}>
          <div className="card-header" style={{ background: '#f0f4ff' }}>
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">
                <i className="fas fa-users mr-2 text-primary" />
                Bulk Add Members
              </h5>
              <small className="text-muted">Fill in names — leave blank rows empty</small>
            </div>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-sm mb-3">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th>Full Name <span className="text-danger">*</span></th>
                    <th>Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkRows.map((row, i) => (
                    <tr key={row.id}>
                      <td style={{ color: '#9ca3af', verticalAlign: 'middle' }}>{i + 1}</td>
                      <td>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Member name"
                          value={row.name}
                          onChange={e => setBulkRows(rows => rows.map(r => r.id === row.id ? { ...r, name: e.target.value } : r))}
                        />
                      </td>
                      <td>
                        <input
                          type="tel"
                          className="form-control form-control-sm"
                          placeholder="Phone (optional)"
                          value={row.phone}
                          onChange={e => setBulkRows(rows => rows.map(r => r.id === row.id ? { ...r, phone: e.target.value } : r))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="d-flex align-items-center" style={{ gap: '10px' }}>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setBulkRows(rows => [
                  ...rows,
                  ...Array(5).fill('').map((_, i) => ({ id: Date.now() + i, name: '', phone: '' }))
                ])}
              >
                <i className="fas fa-plus mr-1" /> Add 5 more rows
              </button>
              <button className="btn btn-primary" onClick={handleBulkSubmit} disabled={bulkSaving}>
                {bulkSaving
                  ? <><span className="spinner-border spinner-border-sm mr-2" />Saving...</>
                  : <><i className="fas fa-save mr-1" />Save All Members</>
                }
              </button>
              <button className="btn btn-outline-secondary" onClick={() => setTab('list')}>Cancel</button>
              <small className="text-muted ml-2">
                {bulkRows.filter(r => r.name.trim()).length} names filled
              </small>
            </div>
          </div>
        </div>
      )}

      {/* ── Members Table ── */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-success" />
        </div>
      ) : members.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5 text-muted">
            <i className="fas fa-users fa-3x mb-3" style={{ opacity: 0.2 }} />
            <p className="mb-0">No members registered yet.</p>
            {isAdmin && (
              <button className="btn btn-success btn-sm mt-3" onClick={() => setTab('add')}>
                <i className="fas fa-user-plus mr-1" /> Add First Member
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Active Members */}
          {active.length > 0 && (
            <>
              <h6 className="mb-2">
                <i className="fas fa-check-circle text-success mr-2" />
                Active Members ({active.length})
              </h6>
              <div className="card mb-4">
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead>
                        <tr>
                          <th style={{ width: '45px' }}>#</th>
                          <th>Name</th>
                          <th>Phone</th>
                          <th>Email</th>
                          <th>Address</th>
                          {isAdmin && <th className="text-right" style={{ width: '110px' }}>Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {active.map((m, i) => (
                          editId === m.id ? (
                            // ── Inline edit row ──
                            <tr key={m.id} style={{ background: '#f0fdf4' }}>
                              <td style={{ color: '#9ca3af' }}>{i + 1}</td>
                              <td>
                                <input
                                  className="form-control form-control-sm"
                                  value={editForm.name}
                                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                  autoFocus
                                />
                              </td>
                              <td>
                                <input
                                  className="form-control form-control-sm"
                                  value={editForm.phone}
                                  onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                                  placeholder="Phone"
                                />
                              </td>
                              <td>
                                <input
                                  className="form-control form-control-sm"
                                  value={editForm.email}
                                  onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                                  placeholder="Email"
                                />
                              </td>
                              <td>
                                <input
                                  className="form-control form-control-sm"
                                  value={editForm.address}
                                  onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
                                  placeholder="Address"
                                />
                              </td>
                              <td className="text-right">
                                <div className="d-flex justify-content-end" style={{ gap: '4px' }}>
                                  <button
                                    className="btn btn-xs btn-success"
                                    onClick={() => saveEdit(m.id)}
                                    disabled={editSaving}
                                  >
                                    <i className="fas fa-check" />
                                  </button>
                                  <button
                                    className="btn btn-xs btn-outline-secondary"
                                    onClick={() => setEditId(null)}
                                  >
                                    <i className="fas fa-times" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            // ── Normal row ──
                            <tr key={m.id}>
                              <td style={{ color: '#9ca3af', fontSize: '0.85rem' }}>{i + 1}</td>
                              <td><strong>{m.name}</strong></td>
                              <td style={{ fontSize: '0.875rem' }}>{m.phone || <span className="text-muted">—</span>}</td>
                              <td style={{ fontSize: '0.875rem' }}>{m.email || <span className="text-muted">—</span>}</td>
                              <td style={{ fontSize: '0.875rem' }}>{m.address || <span className="text-muted">—</span>}</td>
                              {isAdmin && (
                                <td className="text-right">
                                  <div className="d-flex justify-content-end" style={{ gap: '4px' }}>
                                    <button
                                      className="btn btn-xs btn-outline-primary"
                                      onClick={() => startEdit(m)}
                                      title="Edit"
                                    >
                                      <i className="fas fa-pen" />
                                    </button>
                                    <button
                                      className="btn btn-xs btn-outline-warning"
                                      onClick={() => toggleActive(m.id, m.is_active, m.name)}
                                      title="Deactivate"
                                    >
                                      <i className="fas fa-pause" />
                                    </button>
                                    <button
                                      className="btn btn-xs btn-outline-danger"
                                      onClick={() => handleDelete(m.id, m.name)}
                                      title="Delete"
                                    >
                                      <i className="fas fa-trash" />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          )
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Inactive Members */}
          {inactive.length > 0 && (
            <>
              <h6 className="mb-2 mt-2" style={{ color: '#6c757d' }}>
                <i className="fas fa-pause-circle mr-2" />
                Inactive Members ({inactive.length})
              </h6>
              <div className="card">
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover mb-0" style={{ opacity: 0.65 }}>
                      <thead>
                        <tr>
                          <th style={{ width: '45px' }}>#</th>
                          <th>Name</th>
                          <th>Phone</th>
                          <th>Email</th>
                          {isAdmin && <th className="text-right" style={{ width: '80px' }}>Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {inactive.map((m, i) => (
                          <tr key={m.id}>
                            <td style={{ color: '#9ca3af', fontSize: '0.85rem' }}>{i + 1}</td>
                            <td><strong>{m.name}</strong></td>
                            <td style={{ fontSize: '0.875rem' }}>{m.phone || <span className="text-muted">—</span>}</td>
                            <td style={{ fontSize: '0.875rem' }}>{m.email || <span className="text-muted">—</span>}</td>
                            {isAdmin && (
                              <td className="text-right">
                                <div className="d-flex justify-content-end" style={{ gap: '4px' }}>
                                  <button
                                    className="btn btn-xs btn-outline-success"
                                    onClick={() => toggleActive(m.id, m.is_active, m.name)}
                                    title="Re-activate"
                                  >
                                    <i className="fas fa-play" />
                                  </button>
                                  <button
                                    className="btn btn-xs btn-outline-danger"
                                    onClick={() => handleDelete(m.id, m.name)}
                                    title="Delete"
                                  >
                                    <i className="fas fa-trash" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}