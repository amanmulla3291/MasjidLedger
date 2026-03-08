import { useEffect, useState } from 'react'
import {
  getJamatMembers, addJamatMember,
  updateJamatMember, deleteJamatMember,
} from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import PageHeader from '../components/PageHeader'
import toast from 'react-hot-toast'

const DEFAULT_FORM = {
  name: '',
  phone: '',
  email: '',
  address: '',
}

export default function JamatMembers() {
  const { role } = useAuth()
  const isAdmin = role === 'admin'

  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  async function load() {
    setLoading(true)
    const { data, error } = await getJamatMembers(false) // load all (active + inactive)
    if (!error) setMembers(data || [])
    else toast.error('Failed to load members')
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Member name is required')

    setSaving(true)
    const { error } = await addJamatMember({
      name: form.name.trim(),
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      is_active: true,
    })

    if (error) {
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        toast.error('A member with this name already exists')
      } else {
        toast.error('Failed: ' + error.message)
      }
    } else {
      toast.success('Member added!')
      setForm(DEFAULT_FORM)
      setShowForm(false)
      load()
    }
    setSaving(false)
  }

  async function handleDelete(id, name) {
    if (!confirm(`Delete member "${name}"? This cannot be undone.`)) return
    const { error } = await deleteJamatMember(id)
    if (error) toast.error('Delete failed: ' + error.message)
    else { toast.success('Member deleted'); load() }
  }

  async function toggleActive(id, currentlyActive, name) {
    const { error } = await updateJamatMember(id, { is_active: !currentlyActive })
    if (error) toast.error('Update failed')
    else {
      toast.success(`${name} ${!currentlyActive ? 'activated' : 'deactivated'}`)
      load()
    }
  }

  const searchLower = search.toLowerCase()
  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(searchLower) ||
    (m.phone && m.phone.includes(search)) ||
    (m.email && m.email.toLowerCase().includes(searchLower))
  )

  const activeMembers = filteredMembers.filter(m => m.is_active)
  const inactiveMembers = filteredMembers.filter(m => !m.is_active)

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
              {activeMembers.length} Active
            </span>
            {inactiveMembers.length > 0 && (
              <span className="badge badge-secondary" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
                {inactiveMembers.length} Inactive
              </span>
            )}
          </div>

          {isAdmin && (
            <button
              className="btn btn-success btn-sm"
              onClick={() => setShowForm(!showForm)}
            >
              <i className={`fas ${showForm ? 'fa-times' : 'fa-user-plus'} mr-1`} />
              {showForm ? 'Cancel' : 'Add Member'}
            </button>
          )}
        </div>
      </div>

      {/* Add Form — Admins Only */}
      {showForm && isAdmin && (
        <div className="card mb-4">
          <div className="card-header">
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
                      placeholder="Member's full name"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
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
                      placeholder="10-digit mobile number"
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
                      placeholder="email@example.com"
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

              <button type="submit" className="btn btn-success" disabled={saving}>
                {saving
                  ? <><span className="spinner-border spinner-border-sm mr-2" />Saving...</>
                  : <><i className="fas fa-user-plus mr-1" />Add Member</>
                }
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Members Table */}
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
              <button className="btn btn-success btn-sm mt-3" onClick={() => setShowForm(true)}>
                <i className="fas fa-user-plus mr-1" /> Add First Member
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Active Members */}
          {activeMembers.length > 0 && (
            <>
              <h6 className="mb-2">
                <i className="fas fa-check-circle text-success mr-2" />
                Active Members ({activeMembers.length})
              </h6>
              <div className="card mb-4">
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead>
                        <tr>
                          <th style={{ width: '50px' }}>#</th>
                          <th>Name</th>
                          <th>Phone</th>
                          <th>Email</th>
                          <th>Address</th>
                          {isAdmin && <th className="text-right" style={{ width: '90px' }}>Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {activeMembers.map((m, i) => (
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
                                    className="btn btn-xs btn-outline-warning"
                                    onClick={() => toggleActive(m.id, m.is_active, m.name)}
                                    title="Deactivate member"
                                  >
                                    <i className="fas fa-pause" />
                                  </button>
                                  <button
                                    className="btn btn-xs btn-outline-danger"
                                    onClick={() => handleDelete(m.id, m.name)}
                                    title="Delete member"
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

          {/* Inactive Members */}
          {inactiveMembers.length > 0 && (
            <>
              <h6 className="mb-2 mt-2" style={{ color: '#6c757d' }}>
                <i className="fas fa-pause-circle mr-2" />
                Inactive Members ({inactiveMembers.length})
              </h6>
              <div className="card">
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover mb-0" style={{ opacity: 0.65 }}>
                      <thead>
                        <tr>
                          <th style={{ width: '50px' }}>#</th>
                          <th>Name</th>
                          <th>Phone</th>
                          <th>Email</th>
                          {isAdmin && <th className="text-right" style={{ width: '90px' }}>Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {inactiveMembers.map((m, i) => (
                          <tr key={m.id}>
                            <td style={{ color: '#9ca3af', fontSize: '0.85rem' }}>{i + 1}</td>
                            <td><strong>{m.name}</strong></td>
                            <td style={{ fontSize: '0.875rem' }}>{m.phone || <span className="text-muted">—</span>}</td>
                            <td style={{ fontSize: '0.875rem' }}>{m.email || <span className="text-muted">—</span>}</td>
                            {isAdmin && (
                              <td className="text-right">
                                <button
                                  className="btn btn-xs btn-outline-success"
                                  onClick={() => toggleActive(m.id, m.is_active, m.name)}
                                  title="Re-activate member"
                                >
                                  <i className="fas fa-play" />
                                </button>
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