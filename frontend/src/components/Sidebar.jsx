import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { signOut } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

const NAV = [
  {
    header: 'Main',
    items: [
      { to: '/dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' },
    ],
  },
  {
    header: 'Finance',
    items: [
      { to: '/income',      icon: 'fa-money-bill-wave',       label: 'Income' },
      { to: '/collections', icon: 'fa-hand-holding-usd',      label: 'Friday Collections' },
      { to: '/expenses',    icon: 'fa-file-invoice-dollar',   label: 'Expenses' },
      { to: '/ledger',      icon: 'fa-book',                  label: 'Ledger' },
    ],
  },
  {
    header: 'Ramzan',
    items: [
      { to: '/jamat-members', icon: 'fa-users',  label: 'Jamat Members' },
      { to: '/ramzan',        icon: 'fa-moon',   label: 'Ramzan Management' },
    ],
  },
  {
    header: 'Reports',
    adminOnly: true,
    items: [
      { to: '/reports', icon: 'fa-chart-bar', label: 'Reports & Export' },
    ],
  },
  {
    header: 'Admin',
    adminOnly: true,
    items: [
      { to: '/users',     icon: 'fa-users-cog', label: 'User Management' },
      { to: '/audit-log', icon: 'fa-history',   label: 'Audit Log' },
    ],
  },
]

export default function Sidebar() {
  const { user, role } = useAuth()
  const isAdmin = role === 'admin'
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    toast.success('Signed out')
    navigate('/login')
  }

  return (
    <aside className="main-sidebar sidebar-dark-success elevation-4">
      {/* Brand */}
      <a href="/dashboard" className="brand-link" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '12px 16px' }}>
        <i className="fas fa-mosque brand-image mr-2" style={{ fontSize: '1.4rem', color: '#c9a227' }} />
        <span className="brand-text font-weight-bold" style={{ fontFamily: 'Amiri, serif', fontSize: '0.95rem', lineHeight: '1.2' }}>
          Sunni Jamma Masjid
          <br />
          <span style={{ fontSize: '0.72rem', opacity: 0.65, fontFamily: 'IBM Plex Sans, sans-serif', fontWeight: 400 }}>
            Tambave
          </span>
        </span>
      </a>

      {/* User panel */}
      <div className="user-panel mt-2 pb-2 mb-2 d-flex" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '8px 16px' }}>
        <div className="image">
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: '#c9a227', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="fas fa-user" style={{ fontSize: '0.85rem', color: '#1a2035' }} />
          </div>
        </div>
        <div className="info ml-2" style={{ overflow: 'hidden' }}>
          <div style={{ fontSize: '0.78rem', color: '#fff', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
          </div>
          <span style={{ fontSize: '0.65rem' }} className={`badge ${isAdmin ? 'badge-success' : 'badge-secondary'}`}>
            {isAdmin ? 'Admin' : 'Viewer'}
          </span>
        </div>
      </div>

      {/* Nav */}
      <div className="sidebar">
        <nav className="mt-2">
          <ul className="nav nav-pills nav-sidebar flex-column nav-compact" data-widget="treeview" role="menu">
            {NAV.map(section => {
              if (section.adminOnly && !isAdmin) return null
              return (
                <React.Fragment key={section.header}>
                  <li className="nav-header" style={{ fontSize: '0.65rem', opacity: 0.5, padding: '8px 16px 4px', letterSpacing: '0.08em' }}>
                    {section.header.toUpperCase()}
                  </li>
                  {section.items.map(item => (
                    <li className="nav-item" key={item.to}>
                      <NavLink
                        to={item.to}
                        className={({ isActive }) =>
                          `nav-link${isActive ? ' active' : ''}`
                        }
                      >
                        <i className={`nav-icon fas ${item.icon}`} />
                        <p>{item.label}</p>
                      </NavLink>
                    </li>
                  ))}
                </React.Fragment>
              )
            })}

            {/* Sign out */}
            <li className="nav-item mt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '8px' }}>
              <button
                className="nav-link w-100 text-left"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)' }}
                onClick={handleSignOut}
              >
                <i className="nav-icon fas fa-sign-out-alt" />
                <p>Sign Out</p>
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </aside>
  )
}