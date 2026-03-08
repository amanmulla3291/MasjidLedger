import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase, isWhitelisted, upsertUser, signOut, getUserRole } from '../lib/supabaseClient'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const handlingUser = useRef(false)

  useEffect(() => {
    // Hard timeout — stop loading after 4s no matter what
    const timeout = setTimeout(() => setLoading(false), 4000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      clearTimeout(timeout)

      if (event === 'INITIAL_SESSION') {
        if (session?.user) {
          await handleUser(session.user)
        } else {
          setLoading(false)
        }
      } else if (event === 'SIGNED_IN') {
        if (session?.user) await handleUser(session.user)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setRole(null)
        setLoading(false)
      } else if (event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          setUser(session.user)
          setRole(getUserRole(session.user.email))
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    })

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  async function handleUser(authUser) {
    if (handlingUser.current) return
    handlingUser.current = true

    try {
      if (!isWhitelisted(authUser.email)) {
        toast.error('Access denied. This application is private.')
        await signOut()
        setUser(null)
        setRole(null)
        setLoading(false)
        return
      }

      setUser(authUser)
      setRole(getUserRole(authUser.email))
      setLoading(false)

      // Fire upsert in background (non-blocking)
      upsertUser(authUser).catch(() => {})
    } catch {
      setLoading(false)
    } finally {
      handlingUser.current = false
    }
  }

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}