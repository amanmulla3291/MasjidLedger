import { NavLink, useLocation } from 'react-router-dom'

const navItems = [
  {
    header: 'Main',
    items: [
      { to: '/dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' },
    ],
  },
  {
    header: 'Finance',
    items: [
      { to: '/collections', icon: 'fa-hand-holding-usd', label: 'Friday Collections' },
      { to: '/expenses', icon: 'fa-file-invoice-dollar', label: 'Expenses' },
      { to: '/ledger', icon: 'fa-book', label: 'Ledger' },
    ],
  },
  {
    header: 'Ramzan',
    items: [
      { to: '/ramzan', icon: 'fa-moon', label: 'Ramzan Management' },
    ],
  },
  {
    header: 'Reports',
    items: [
      { to: '/reports', icon: 'fa-chart-bar', label: 'Reports & Export' },
    ],
  },
]

export default function Sidebar() {
  return (
    <aside className="main-sidebar sidebar-dark-success elevation-4">
      {/* Brand */}
      <a href="/dashboard" className="brand-link" style={{ textDecoration: 'none' }}>
        <span style={{ fontSize: '1.8rem', marginRight: '10px' }}>🕌</span>
        <span className="brand-text">Masjid Ledger</span>
      </a>

      <div className="sidebar">
        <nav className="mt-2">
          <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu">
            {navItems.map((group) => (
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
