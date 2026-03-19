import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

export default function Layout() {
  const location = useLocation()

  function closeSidebar() {
    if (window.innerWidth <= 991) {
      document.body.classList.remove('sidebar-open')
      document.body.classList.add('sidebar-collapse', 'sidebar-closed')
    }
  }

  // Auto-close sidebar on route change for mobile devices
  useEffect(() => {
    closeSidebar()
  }, [location.pathname])

  return (
    <div className="wrapper">
      <Navbar />
      <Sidebar />
      {/* AdminLTE overlay for mobile — shows automatically via CSS when .sidebar-open is present */}
      <div id="sidebar-overlay" onClick={closeSidebar} />
      
      <div className="content-wrapper" style={{ background: '#f0f2f5', minHeight: '100vh' }}>
        <div className="content-header">
          {/* Page header inserted by each page */}
        </div>
        <section className="content">
          <div className="container-fluid py-2">
            <Outlet />
          </div>
        </section>
      </div>
      <footer className="main-footer text-center" style={{ fontSize: '0.8rem', color: '#9ca3af', border: 'none' }}>
        <span style={{ fontFamily: 'Amiri, serif' }}>🕌 Sunni Jamma Masjid, Tambave</span>
        {' '}— Private Financial Records &copy; {new Date().getFullYear()}
      </footer>
      <aside className="control-sidebar control-sidebar-dark" />
    </div>
  )
}
