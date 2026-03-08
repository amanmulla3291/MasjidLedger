import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase, signOut } from '../lib/supabaseClient'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const handlingUser = useRef(false)

  useEffect(() => {
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
        if (session?.user) await handleUser(session.user)
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
      // ── Check database for this user's role ──────────────
      // This replaces the hardcoded WHITELISTED_USERS array so
      // any user added via the Users page can log in immediately.
      const { data: dbUser, error } = await supabase
        .from('users')
        .select('role')
        .eq('email', authUser.email.toLowerCase())
        .single()

      if (error || !dbUser) {
        // Not in the users table — access denied
        toast.error('Access denied. Contact the administrator to get access.')
        await signOut()
        setUser(null)
        setRole(null)
        setLoading(false)
        return
      }

      // User exists in DB — set them up
      setUser(authUser)
      setRole(dbUser.role)
      setLoading(false)

      // Update their name in background in case it changed
      supabase
        .from('users')
        .update({ name: authUser.user_metadata?.full_name || authUser.email })
        .eq('email', authUser.email.toLowerCase())
        .then(() => {})

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