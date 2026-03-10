import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase, signOut, upsertUser } from '../lib/supabaseClient'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

// Primary admins — always have access even if DB is unreachable
const PRIMARY_ADMINS = ['amanmulla.aws@gmail.com', 'altabmulla36@gmail.com']

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const handlingUser = useRef(false)
  const didInit = useRef(false)

  useEffect(() => {
    // Hard fallback — never stay stuck more than 6s
    const hardTimeout = setTimeout(() => setLoading(false), 6000)

    // Proactively check session on mount (fixes PWA reopen freeze)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (didInit.current) return
      didInit.current = true
      clearTimeout(hardTimeout)
      if (session?.user) {
        handleUser(session.user)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') {
        if (didInit.current) return
        didInit.current = true
        clearTimeout(hardTimeout)
        if (session?.user) await handleUser(session.user)
        else setLoading(false)
      } else if (event === 'SIGNED_IN') {
        clearTimeout(hardTimeout)
        if (session?.user) await handleUser(session.user)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setRole(null)
        setLoading(false)
      } else if (event === 'TOKEN_REFRESHED') {
        // Silent refresh — no loading flash needed
        if (session?.user) {
          setUser(session.user)
        }
      } else {
        setLoading(false)
      }
    })

    return () => {
      clearTimeout(hardTimeout)
      subscription.unsubscribe()
    }
  }, [])

  async function handleUser(authUser) {
    if (handlingUser.current) return
    handlingUser.current = true

    try {
      const email = authUser.email?.toLowerCase()

      // Always allow primary admins (bootstrap safety net)
      if (PRIMARY_ADMINS.includes(email)) {
        setUser(authUser)
        setRole('admin')
        setLoading(false)
        upsertUser(authUser).catch(() => {})
        return
      }

      // Look up user in the database — this is the source of truth
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('email', email)
        .single()

      if (error || !data) {
        // Not in database = no access
        toast.error('Access denied. Ask an admin to add your email in User Management.')
        await signOut()
        setUser(null)
        setRole(null)
        setLoading(false)
        return
      }

      // User exists in DB — grant access with their role
      setUser(authUser)
      setRole(data.role)
      setLoading(false)

      // Keep DB record in sync with latest auth metadata
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