'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseReady } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if Supabase is configured before attempting auth
    if (!isSupabaseReady()) {
      console.warn('Supabase is not configured. Authentication features will be limited.')
      setLoading(false)
      return
    }

    // Set loading to false immediately to allow initial render
    // Auth will be handled by onAuthStateChange
    setLoading(false)

    // Get initial session with error handling (non-blocking)
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.warn('Error getting session:', error.message)
          return
        }
        if (session) {
          setSession(session)
          setUser(session.user ?? null)
        }
      } catch (error) {
        console.warn('Failed to get session:', error)
      }
    }
    
    // Initialize auth asynchronously without blocking
    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email)
      
      // For INITIAL_SESSION, set loading to false but keep checking
      if (event === 'INITIAL_SESSION') {
        if (session) {
          setSession(session)
          setUser(session.user ?? null)
        }
        setLoading(false)
        return
      }
      
      // Update state immediately for other events
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      
      // For SIGNED_IN event, ensure we have the latest session
      if (event === 'SIGNED_IN' && session) {
        // Force a session refresh to ensure we have the latest data
        // Add a small delay to ensure Supabase has fully processed the session
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session: latestSession } }) => {
            if (latestSession) {
              console.log('AuthProvider: Session refreshed after SIGNED_IN', latestSession.user?.email)
              setSession(latestSession)
              setUser(latestSession.user ?? null)
            }
          }).catch((err) => {
            console.error('AuthProvider: Error refreshing session after SIGNED_IN', err)
          })
        }, 500)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    try {
      // Clear local state first
      setUser(null)
      setSession(null)
      
      // Sign out from Supabase (this clears the session and localStorage)
      const { error } = await supabase.auth.signOut({ scope: 'global' })
      if (error) {
        console.error('Error signing out:', error)
      }
      
      // Clear any remaining session data from localStorage and sessionStorage
      if (typeof window !== 'undefined') {
        // Clear Supabase auth storage from localStorage
        const supabaseStorageKey = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`
        localStorage.removeItem(supabaseStorageKey)
        
        // Clear all Supabase-related keys from localStorage
        Object.keys(localStorage).forEach(key => {
          if (key.includes('supabase') || key.includes('sb-')) {
            localStorage.removeItem(key)
          }
        })
        
        // Clear all Supabase-related keys from sessionStorage
        Object.keys(sessionStorage).forEach(key => {
          if (key.includes('supabase') || key.includes('sb-')) {
            sessionStorage.removeItem(key)
          }
        })
      }
    } catch (error) {
      console.error('Error during sign out:', error)
      // Still clear local state even if there's an error
      setUser(null)
      setSession(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

