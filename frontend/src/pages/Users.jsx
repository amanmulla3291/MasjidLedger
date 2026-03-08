import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import PageHeader from '../components/PageHeader'
import toast from 'react-hot-toast'

const PRIMARY_ADMINS = ['amanmulla.aws@gmail.com', 'altabmulla36@gmail.com']

const DEFAULT_FORM = { email: '', name: '', role: 'viewer' }

export default function Users() {
  const { role } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setUsers(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Guard: only admins can access this page
  if (role !== 'admin') {
    return (
      <div className="card mt-4">
        <div className="card-body text-center py-5">
          <i className="fas fa-lock fa-3x mb-3 text-danger" />
          <p className="text-danger font-weight-bold">Access Restricted</p>
          <p className="text-muted">This page is only accessible to administrators.</p>
        </div>
      </div>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email.includes('@')) return toast.error('Enter a valid email address')

    setSaving(true)
    const { error } = await supabase
      .from('users')
      .upsert(
        {
          email: form.email.toLowerCase().trim(),
          name: form.name.trim() || form.email.split('@')[0],
          role: form.role,
        },
        { onConflict: 'email' }
      )

    if (error) {
      toast.error('Failed: ' + error.message)
    } else {
      toast.success(`User ${form.email} saved as ${form.role}!`)
      setForm(DEFAULT_FORM)
      setShowForm(false)
      load()
    }
    setSaving(false)
  }

  async function handleDeleteUser(email) {
    if (PRIMARY_ADMINS.includes(email)) {
      return toast.error('Cannot remove primary admin accounts')
    }
    if (!confirm(`Remove access for ${email}? They will no longer be able to log in.`)) return

    const { error } = await supabase.from('users').delete().eq('email', email)
    if (error) toast.error('Delete failed: ' + error.message)
    else { toast.success('User removed'); load() }
  }

  async function handleRoleChange(email, newRole) {
    if (PRIMARY_ADMINS.includes(email)) {
      return toast.error('Cannot change role of primary admin accounts')
    }
    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('email', email)

    if (error) toast.error('Failed to update role')
    else { toast.success('Role updated'); load() }
  }

  const adminCount = users.filter(u => u.role === 'admin').length
  const viewerCount = users.filter(u => u.role === 'viewer').length

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle="Manage who can access this application and their permissions"
        icon="fa-users-cog"
      />

      {/* Stats + Toolbar */}
      <div className="card mb-3">
        <div className="card-body py-2 d-flex flex-wrap align-items-center justify-content-between" style={{ gap: '10px' }}>
          <div className="d-flex" style={{ gap: '10px' }}>
            <span className="badge badge-success" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
              <i className="fas fa-shield-alt mr-1" /> {adminCount} Admin{adminCount !== 1 ? 's' : ''}
            </span>
            <span className="badge badge-info" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
              <i className="fas fa-eye mr-1" /> {viewerCount} Viewer{viewerCount !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            className="btn btn-success btn-sm"
            onClick={() => setShowForm(!showForm)}
          >
            <i className={`fas ${showForm ? 'fa-times' : 'fa-user-plus'} mr-1`} />
            {showForm ? 'Cancel' : 'Add User'}
          </button>
        </div>
      </div>

      {/* Add / Update User Form */}
      {showForm && (
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="card-title mb-0">
              <i className="fas fa-user-plus mr-2 text-success" />
              Add or Update User
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-5">
                  <div className="form-group">
                    <label>Email Address <span className="text-danger">*</span></label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="user@gmail.com"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      required
                    />
                    <small className="text-muted">Must match their Google account email</small>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="form-group">
                    <label>Display Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Full name (optional)"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="form-group">
                    <label>Role <span className="text-danger">*</span></label>
                    <select
                      className="form-control"
                      value={form.role}
                      onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    >
                      <option value="viewer">Viewer (Read-Only)</option>
                      <option value="admin">Admin (Full Access)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="alert alert-warning py-2 mb-3" style={{ fontSize: '0.85rem' }}>
                <i className="fas fa-exclamation-triangle mr-1" />
                <strong>Important:</strong> After adding a user here, you must also update the RLS policies
                in Supabase SQL Editor. See <code>QUICK_REFERENCE.md</code> for the SQL.
              </div>

              <button type="submit" className="btn btn-success" disabled={saving}>
                {saving
                  ? <><span className="spinner-border spinner-border-sm mr-2" />Saving...</>
                  : <><i className="fas fa-save mr-1" />Save User</>
                }
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Role legend */}
      <div className="row mb-3">
        <div className="col-md-6">
          <div className="card" style={{ border: '1px solid #28a745' }}>
            <div className="card-body py-2 px-3">
              <div className="d-flex align-items-center">
                <i className="fas fa-shield-alt text-success mr-2" />
                <div>
                  <strong style={{ fontSize: '0.9rem' }}>Admin</strong>
                  <p className="mb-0 text-muted" style={{ fontSize: '0.8rem' }}>
                    Full CRUD — can add, edit, delete all records and manage users
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card" style={{ border: '1px solid #17a2b8' }}>
            <div className="card-body py-2 px-3">
              <div className="d-flex align-items-center">
                <i className="fas fa-eye text-info mr-2" />
                <div>
                  <strong style={{ fontSize: '0.9rem' }}>Viewer</strong>
                  <p className="mb-0 text-muted" style={{ fontSize: '0.8rem' }}>
                    Read-only — can view and export data, but cannot add or delete
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-success" />
        </div>
      ) : (
        <div className="card">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Added</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const isPrimary = PRIMARY_ADMINS.includes(u.email)
                    return (
                      <tr key={u.id || u.email}>
                        <td>
                          <strong>{u.email}</strong>
                          {isPrimary && (
                            <span className="badge badge-warning ml-2" style={{ fontSize: '0.7rem' }}>
                              Primary
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.875rem' }}>{u.name || '—'}</td>
                        <td>
                          {isPrimary ? (
                            <span className="badge badge-success">Admin</span>
                          ) : (
                            <select
                              className="form-control form-control-sm"
                              style={{ width: '130px' }}
                              value={u.role || 'viewer'}
                              onChange={e => handleRoleChange(u.email, e.target.value)}
                            >
                              <option value="viewer">Viewer</option>
                              <option value="admin">Admin</option>
                            </select>
                          )}
                        </td>
                        <td style={{ fontSize: '0.85rem', color: '#6c757d' }}>
                          {u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td className="text-right">
                          {!isPrimary && (
                            <button
                              className="btn btn-xs btn-outline-danger"
                              onClick={() => handleDeleteUser(u.email)}
                              title="Remove user access"
                            >
                              <i className="fas fa-user-minus" />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}