import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Sidebar() {
  const { role } = useAuth()
  const isAdmin = role === 'admin'

  const navGroups = [
    {
      header: 'Main',
      items: [
        { to: '/dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' },
      ],
    },
    {
      header: 'Finance',
      items: [
        { to: '/income', icon: 'fa-money-bill-wave', label: 'Income' },
        { to: '/collections', icon: 'fa-hand-holding-usd', label: 'Friday Collections' },
        { to: '/expenses', icon: 'fa-file-invoice-dollar', label: 'Expenses' },
        { to: '/ledger', icon: 'fa-book', label: 'Ledger' },
      ],
    },
    {
      header: 'Ramzan',
      items: [
        { to: '/jamat-members', icon: 'fa-users', label: 'Jamat Members' },
        { to: '/ramzan', icon: 'fa-moon', label: 'Ramzan Management' },
      ],
    },
    // Reports — Admins only
    ...(isAdmin ? [{
      header: 'Reports',
      items: [
        { to: '/reports', icon: 'fa-chart-bar', label: 'Reports & Export' },
      ],
    }] : []),
    // Admin section — Admins only
    ...(isAdmin ? [{
      header: 'Admin',
      items: [
        { to: '/users', icon: 'fa-users-cog', label: 'User Management' },
      ],
    }] : []),
  ]

  return (
    <aside className="main-sidebar sidebar-dark-success elevation-4">
      {/* Brand */}
      <a href="/dashboard" className="brand-link" style={{ textDecoration: 'none' }}>
        <span style={{ fontSize: '1.8rem', marginRight: '10px' }}>🕌</span>
        <span className="brand-text">Sunni Jamma Masjid, Tambave</span>
      </a>

      <div className="sidebar">
        <nav className="mt-2">
          <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu">
            {navGroups.map((group) => (
              <li key={group.header}>
                <li className="nav-header">{group.header}</li>
                {group.items.map((item) => (
                  <li key={item.to} className="nav-item">
                    <NavLink
                      to={item.to}
                      className={({ isActive }) =>
                        `nav-link ${isActive ? 'active' : ''}`
                      }
                    >
                      <i className={`nav-icon fas ${item.icon}`} />
                      <p>{item.label}</p>
                    </NavLink>
                  </li>
                ))}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  )
}