import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isWhitelisted, upsertUser, signOut } from '../lib/supabaseClient'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
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
      }
    })

    return () => subscription.unsubscribe()
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