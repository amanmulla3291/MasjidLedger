import { useState } from 'react'
import { signInWithGoogle } from '../lib/supabaseClient'
import toast from 'react-hot-toast'

export default function Login() {
  const [loading, setLoading] = useState(false)

  async function handleGoogleLogin() {
    console.log('[Login] Button clicked — starting Google OAuth...')
    console.log('[Login] Current URL:', window.location.href)
    console.log('[Login] Origin:', window.location.origin)
    setLoading(true)
    try {
      const { data, error } = await signInWithGoogle()
      console.log('[Login] signInWithGoogle response:', { data, error })
      if (error) {
        console.error('[Login] OAuth error:', error)
        toast.error('Login failed: ' + error.message)
        setLoading(false)
      } else {
        console.log('[Login] OAuth redirect initiated, URL:', data?.url)
      }
    } catch (err) {
      console.error('[Login] Unexpected error:', err)
      toast.error('Login failed: ' + err.message)
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Decorative top */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '3.5rem', lineHeight: 1 }}>🕌</div>
        </div>

        <div className="login-logo">Sunni Jamma Masjid, Tambave</div>
        <div className="login-subtitle">Private Financial Records System</div>

        {/* Decorative divider */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          marginBottom: '28px', color: 'rgba(201,162,39,0.4)'
        }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(201,162,39,0.2)' }} />
          <span style={{ fontSize: '1.2rem' }}>✦</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(201,162,39,0.2)' }} />
        </div>

        <button
          className="btn-google"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm" />
              Signing in...
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
                <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <p className="login-privacy">
          🔒 Access restricted to authorized members only
        </p>

        <div style={{
          marginTop: '24px',
          padding: '14px',
          background: 'rgba(201,162,39,0.08)',
          borderRadius: '8px',
          border: '1px solid rgba(201,162,39,0.15)',
        }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', margin: 0, lineHeight: 1.6 }}>
            This application is for recording Masjid finances including Friday Sadaqah collections,
            repair expenses, and Ramzan Hafiz contributions.
          </p>
        </div>
      </div>
    </div>
  )
}
