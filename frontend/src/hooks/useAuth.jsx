import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isWhitelisted, upsertUser, signOut } from '../lib/supabaseClient'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Hard timeout — no matter what, stop loading after 5 seconds
    const timeout = setTimeout(() => {
      setLoading(false)
    }, 5000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      clearTimeout(timeout)

      if (event === 'INITIAL_SESSION') {
        if (session?.user) {
          await handleUser(session.user)
        } else {
          setLoading(false)
        }
      } else if (event === 'SIGNED_IN') {
        if (session?.user) {
          await handleUser(session.user)
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setLoading(false)
      } else if (event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          setUser(session.user)
          setLoading(false)
        }
      } else {
        // Any other event — make sure loading stops
        setLoading(false)
      }
    })

    // Also directly check session as backup
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user && !user) {
        await handleUser(session.user)
      } else if (!session?.user) {
        setLoading(false)
      }
      clearTimeout(timeout)
    }).catch(() => {
      setLoading(false)
      clearTimeout(timeout)
    })

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  async function handleUser(authUser) {
    if (!isWhitelisted(authUser.email)) {
      toast.error('Access denied. This application is private.')
      await signOut()
      setUser(null)
      setLoading(false)
      return
    }
    try { await upsertUser(authUser) } catch {}
    setUser(authUser)
    setLoading(false)
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