import { NavLink, Link, useNavigate } from 'react-router-dom'
import { signOut } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

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
      <Link to="/dashboard" className="brand-link" style={{ textDecoration: 'none' }}>
        <span style={{ fontSize: '1.8rem', marginRight: '10px' }}>🕌</span>
        <span className="brand-text">Sunni Jamma Masjid, Tambave</span>
      </Link>

      <div className="sidebar">
        <nav className="mt-2">
          <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu">

            {/* MAIN */}
            <li className="nav-header">Main</li>
            <li className="nav-item">
              <NavLink to="/dashboard" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                <i className="nav-icon fas fa-tachometer-alt" /><p>Dashboard</p>
              </NavLink>
            </li>

            {/* FINANCE */}
            <li className="nav-header">Finance</li>
            <li className="nav-item">
              <NavLink to="/income" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                <i className="nav-icon fas fa-money-bill-wave" /><p>Income</p>
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/collections" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                <i className="nav-icon fas fa-hand-holding-usd" /><p>Friday Collections</p>
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/expenses" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                <i className="nav-icon fas fa-file-invoice-dollar" /><p>Expenses</p>
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/ledger" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                <i className="nav-icon fas fa-book" /><p>Ledger</p>
              </NavLink>
            </li>

            {/* RAMZAN */}
            <li className="nav-header">Ramzan</li>
            <li className="nav-item">
              <NavLink to="/jamat-members" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                <i className="nav-icon fas fa-users" /><p>Jamat Members</p>
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/ramzan" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                <i className="nav-icon fas fa-moon" /><p>Ramzan Management</p>
              </NavLink>
            </li>

            {/* REPORTS — admin only */}
            {isAdmin && (
              <>
                <li className="nav-header">Reports</li>
                <li className="nav-item">
                  <NavLink to="/reports" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                    <i className="nav-icon fas fa-chart-bar" /><p>Reports &amp; Export</p>
                  </NavLink>
                </li>
              </>
            )}

            {/* ADMIN — admin only */}
            {isAdmin && (
              <>
                <li className="nav-header">Admin</li>
                <li className="nav-item">
                  <NavLink to="/users" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                    <i className="nav-icon fas fa-users-cog" /><p>User Management</p>
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to="/audit-log" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                    <i className="nav-icon fas fa-history" /><p>Audit Log</p>
                  </NavLink>
                </li>
              </>
            )}

          </ul>
        </nav>
      </div>
    </aside>
  )
}