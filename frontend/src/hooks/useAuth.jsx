import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isWhitelisted, upsertUser, signOut } from '../lib/supabaseClient'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await handleUser(session.user)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await handleUser(session.user)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleUser(authUser) {
    const email = authUser.email

    if (!isWhitelisted(email)) {
      toast.error('Access denied. This application is private.')
      await signOut()
      setUser(null)
      return
    }

    // Upsert user in our users table
    await upsertUser(authUser)
    setUser(authUser)
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
