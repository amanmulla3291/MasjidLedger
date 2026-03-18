import { useEffect, useState } from 'react'
import { getAuditLog } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import PageHeader from '../components/PageHeader'

const ACTION_STYLES = {
  CREATE: { badge: 'badge-success', icon: 'fa-plus-circle' },
  UPDATE: { badge: 'badge-info',    icon: 'fa-edit' },
  DELETE: { badge: 'badge-danger',  icon: 'fa-trash' },
}

const TABLE_LABELS = {
  collections:          { label: 'Collections',    icon: 'fa-hand-holding-usd',    color: '#1a5c2a' },
  expenses:             { label: 'Expenses',        icon: 'fa-file-invoice-dollar', color: '#b71c1c' },
  income:               { label: 'Income',          icon: 'fa-money-bill-wave',     color: '#15803d' },
  ramzan_contributions: { label: 'Ramzan Contrib',  icon: 'fa-moon',                color: '#c9a227' },
  ramzan_expenses:      { label: 'Ramzan Expense',  icon: 'fa-moon',                color: '#c9a227' },
  ramzan_year:          { label: 'Ramzan Year',     icon: 'fa-moon',                color: '#c9a227' },
  jamat_members:        { label: 'Jamat Members',   icon: 'fa-users',               color: '#1565c0' },
  users:                { label: 'Users',            icon: 'fa-user-cog',            color: '#6a1b9a' },
}

// No date-fns needed — uses built-in Intl API
function formatLogTime(dateStr) {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    }) + ', ' + d.toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    })
  } catch {
    return dateStr
  }
}

export default function AuditLog() {
  const { role } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterTable, setFilterTable] = useState('all')
  const [filterAction, setFilterAction] = useState('all')
  const [search, setSearch] = useState('')

  async function load() {
    setLoading(true)
    const { data, error } = await getAuditLog({ limit: 500 })
    if (!error) setLogs(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

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

  const filtered = logs.filter(log => {
    if (filterTable !== 'all' && log.table_name !== filterTable) return false
    if (filterAction !== 'all' && log.action !== filterAction) return false
    if (search) {
      const q = search.toLowerCase()
      if (
        !log.description?.toLowerCase().includes(q) &&
        !log.performed_by?.toLowerCase().includes(q)
      ) return false
    }
    return true
  })

  const uniqueTables = [...new Set(logs.map(l => l.table_name).filter(Boolean))]

  return (
    <div>
      <PageHeader
        title="Audit Log"
        subtitle="Track all admin actions — who did what and when"
        icon="fa-history"
      />

      {/* Filters */}
      <div className="card mb-3">
        <div className="card-body py-2 d-flex flex-wrap align-items-center justify-content-between" style={{ gap: '10px' }}>
          <div className="d-flex flex-wrap align-items-center" style={{ gap: '10px' }}>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Search description or user..."
              style={{ width: '220px' }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select
              className="form-control form-control-sm"
              style={{ width: '150px' }}
              value={filterTable}
              onChange={e => setFilterTable(e.target.value)}
            >
              <option value="all">All Sections</option>
              {uniqueTables.map(t => (
                <option key={t} value={t}>{TABLE_LABELS[t]?.label || t}</option>
              ))}
            </select>
            <select
              className="form-control form-control-sm"
              style={{ width: '130px' }}
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
            >
              <option value="all">All Actions</option>
              <option value="CREATE">Created</option>
              <option value="UPDATE">Updated</option>
              <option value="DELETE">Deleted</option>
            </select>
            <span className="badge badge-secondary" style={{ fontSize: '0.82rem', padding: '5px 10px' }}>
              {filtered.length} entries
            </span>
          </div>
          <button className="btn btn-sm btn-outline-secondary" onClick={load}>
            <i className="fas fa-sync-alt mr-1" /> Refresh
          </button>
        </div>
      </div>

      {/* Log Table */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-success" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5 text-muted">
            <i className="fas fa-history fa-3x mb-3" style={{ opacity: 0.2 }} />
            <p className="mb-0">No audit log entries found.</p>
            <small>Actions will appear here once admins start adding or deleting records.</small>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th style={{ width: '170px' }}>Time</th>
                    <th style={{ width: '90px' }}>Action</th>
                    <th style={{ width: '140px' }}>Section</th>
                    <th>Description</th>
                    <th>Performed By</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(log => {
                    const actionStyle = ACTION_STYLES[log.action] || { badge: 'badge-secondary', icon: 'fa-circle' }
                    const tableInfo = TABLE_LABELS[log.table_name] || { label: log.table_name, icon: 'fa-database', color: '#6b7280' }
                    return (
                      <tr key={log.id}>
                        <td style={{ fontSize: '0.8rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
                          {formatLogTime(log.created_at)}
                        </td>
                        <td>
                          <span className={`badge ${actionStyle.badge}`} style={{ fontSize: '0.72rem' }}>
                            <i className={`fas ${actionStyle.icon} mr-1`} />
                            {log.action}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.8rem', color: tableInfo.color, fontWeight: 600 }}>
                            <i className={`fas ${tableInfo.icon} mr-1`} />
                            {tableInfo.label}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.875rem' }}>{log.description || '—'}</td>
                        <td style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                          <i className="fas fa-user mr-1" />
                          {log.performed_by || '—'}
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