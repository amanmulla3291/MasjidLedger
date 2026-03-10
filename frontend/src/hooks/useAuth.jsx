import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase, signOut, isWhitelisted, getUserRole, upsertUser } from '../lib/supabaseClient'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const handlingUser = useRef(false)
  const didInit = useRef(false)

  useEffect(() => {
    // Hard fallback — never stay stuck more than 5s no matter what
    const hardTimeout = setTimeout(() => {
      setLoading(false)
    }, 5000)

    // On PWA reopen, proactively check the existing session immediately.
    // This handles the case where onAuthStateChange fires too late.
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
        // Skip if getSession() already handled it
        if (didInit.current) return
        didInit.current = true
        clearTimeout(hardTimeout)
        if (session?.user) {
          await handleUser(session.user)
        } else {
          setLoading(false)
        }
      } else if (event === 'SIGNED_IN') {
        clearTimeout(hardTimeout)
        if (session?.user) await handleUser(session.user)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setRole(null)
        setLoading(false)
      } else if (event === 'TOKEN_REFRESHED') {
        // Silent refresh — just update state, no loading flash
        if (session?.user) {
          setUser(session.user)
          setRole(getUserRole(session.user.email))
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
      if (!isWhitelisted(authUser.email)) {
        toast.error('Access denied. Contact the administrator to get access.')
        await signOut()
        setUser(null)
        setRole(null)
        setLoading(false)
        return
      }

      const userRole = getUserRole(authUser.email)
      setUser(authUser)
      setRole(userRole)
      setLoading(false)

      // Sync user record in background
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