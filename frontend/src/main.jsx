import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import { supabase } from './lib/supabaseClient'
import './styles/app.css'

/**
 * OAuth callback interceptor for HashRouter.
 *
 * Problem: Supabase implicit OAuth flow returns tokens as a hash fragment
 *   (#access_token=xxx&refresh_token=yyy). But HashRouter also uses the
 *   hash for routing, so it reads this as a route path and immediately
 *   redirects to /#/dashboard — wiping the tokens before Supabase can
 *   parse them.
 *
 * Fix: Detect the OAuth callback hash BEFORE React renders, extract the
 *   tokens, feed them to supabase.auth.setSession(), then clean the URL
 *   so HashRouter can work normally.
 */
async function bootstrap() {
  const hash = window.location.hash

  if (hash && hash.includes('access_token=')) {
    const params = new URLSearchParams(hash.substring(1)) // strip leading #
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    if (accessToken && refreshToken) {
      // Feed tokens to Supabase before React mounts
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
    }

    // Clean the URL so HashRouter sees a proper route
    window.history.replaceState(null, '', window.location.pathname + '#/dashboard')
  }

  // Now render the app — session is already established
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <HashRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#1f2937',
              color: '#fff',
              borderRadius: '8px',
              fontSize: '0.875rem',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </HashRouter>
    </React.StrictMode>
  )
}

bootstrap()