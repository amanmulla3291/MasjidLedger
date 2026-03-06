import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isWhitelisted, upsertUser, signOut } from '../lib/supabaseClient'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function initSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return

        if (session?.user) {
          await handleUser(session.user, mounted)
        } else {
          if (mounted) setLoading(false)
        }
      } catch {
        if (mounted) setLoading(false)
      }
    }

    initSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      if (event === 'SIGNED_OUT') {
        setUser(null)
        setLoading(false)
        return
      }

      if (event === 'SIGNED_IN' && session?.user) {
        // Only handle if user is not already set to avoid loop
        if (user?.id !== session.user.id) {
          await handleUser(session.user, mounted)
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleUser(authUser, mounted = true) {
    const email = authUser.email

    if (!isWhitelisted(email)) {
      toast.error('Access denied. This application is private.')
      await signOut()
      if (mounted) {
        setUser(null)
        setLoading(false)
      }
      return
    }

    try {
      await upsertUser(authUser)
    } catch {
      // Non-fatal, continue
    }

    if (mounted) {
      setUser(authUser)
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}