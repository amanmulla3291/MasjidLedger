import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

export default function Layout() {
  return (
    <div className="wrapper">
      <Navbar />
      <Sidebar />
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
