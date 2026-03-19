import { useAuth } from '../hooks/useAuth'
import { signOut } from '../lib/supabaseClient'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function Navbar() {
  const { user } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    const { error } = await signOut()
    if (!error) {
      navigate('/login')
      toast.success('Signed out successfully')
    }
  }

  function toggleSidebar(e) {
    e.preventDefault()
    if (window.innerWidth <= 991) {
      if (document.body.classList.contains('sidebar-open')) {
        document.body.classList.remove('sidebar-open')
        document.body.classList.add('sidebar-collapse')
      } else {
        document.body.classList.add('sidebar-open')
        document.body.classList.remove('sidebar-collapse')
      }
    } else {
      document.body.classList.toggle('sidebar-collapse')
    }
  }

  const name = user?.user_metadata?.full_name || user?.email || 'Admin'
  const avatar = user?.user_metadata?.avatar_url

  return (
    <nav className="main-header navbar navbar-expand navbar-white navbar-light">
      {/* Left side */}
      <ul className="navbar-nav">
        <li className="nav-item">
          <a className="nav-link" href="#" role="button" onClick={toggleSidebar}>
            <i className="fas fa-bars" />
          </a>
        </li>
        <li className="nav-item d-none d-sm-flex align-items-center">
          <span style={{ fontFamily: 'Amiri, serif', fontSize: '1.05rem', color: '#1a5c2a', fontWeight: '700' }}>
            🕌 Sunni Jamma Masjid, Tambave
          </span>
        </li>
      </ul>

      {/* Right side */}
      <ul className="navbar-nav ml-auto">
        {/* Year badge */}
        <li className="nav-item d-none d-sm-flex align-items-center mr-3">
          <span className="badge badge-success" style={{ fontSize: '0.8rem', padding: '6px 10px' }}>
            {new Date().getFullYear()}
          </span>
        </li>

        {/* User dropdown */}
        <li className="nav-item dropdown">
          <a className="nav-link dropdown-toggle d-flex align-items-center" href="#" data-toggle="dropdown">
            {avatar ? (
              <img
                src={avatar}
                alt={name}
                className="img-circle"
                style={{ width: '32px', height: '32px', marginRight: '8px', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: '#1a5c2a', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.85rem', fontWeight: '700', marginRight: '8px'
                }}
              >
                {name[0]?.toUpperCase()}
              </div>
            )}
            <span className="d-none d-sm-inline" style={{ fontSize: '0.875rem', fontWeight: '500' }}>
              {name.split(' ')[0]}
            </span>
          </a>
          <div className="dropdown-menu dropdown-menu-right">
            <div className="dropdown-item-text">
              <small className="text-muted d-block">{user?.email}</small>
            </div>
            <div className="dropdown-divider" />
            <button
              className="dropdown-item text-danger"
              onClick={handleSignOut}
            >
              <i className="fas fa-sign-out-alt mr-2" />
              Sign Out
            </button>
          </div>
        </li>
      </ul>
    </nav>
  )
}
