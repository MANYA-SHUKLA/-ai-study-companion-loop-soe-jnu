'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, session } = useAuth()
  const router = useRouter()
  const [hasRedirected, setHasRedirected] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Wait for loading to complete, then check session
    if (!loading && isChecking) {
      // Check if we just logged in (flag set by login page)
      const justLoggedIn = typeof window !== 'undefined' && 
        sessionStorage.getItem('just_logged_in') === 'true'
      
      // Check login timestamp - if it's very recent (within last 10 seconds), we just logged in
      const loginTimestamp = typeof window !== 'undefined' ? 
        parseInt(sessionStorage.getItem('login_timestamp') || '0') : 0
      const recentlyLoggedIn = loginTimestamp > 0 && (Date.now() - loginTimestamp) < 10000
      
      // Check if there's any Supabase session in localStorage
      const checkForSession = () => {
        if (typeof window === 'undefined') return false
        return Object.keys(localStorage).some(key => 
          (key.includes('supabase') || key.includes('sb-')) && 
          localStorage.getItem(key)
        )
      }
      
      const hasSupabaseSession = checkForSession()
      
      // If we just logged in OR have a session in storage, wait much longer
      const waitTime = (justLoggedIn || recentlyLoggedIn || hasSupabaseSession) ? 8000 : 2000
      
      console.log('ProtectedRoute: Checking auth...', { 
        justLoggedIn, 
        recentlyLoggedIn, 
        hasSupabaseSession, 
        waitTime,
        user: !!user,
        session: !!session
      })
      
      // Add a delay to ensure INITIAL_SESSION has been processed
      const timer = setTimeout(() => {
        // If we just logged in or have a session, wait longer for AuthProvider
        if ((justLoggedIn || recentlyLoggedIn || hasSupabaseSession) && !user && !session) {
          // Keep checking every 500ms for up to 15 more seconds
          let attempts = 0
          const maxAttempts = 30 // 30 * 500ms = 15 seconds
          const checkInterval = setInterval(() => {
            attempts++
            console.log(`ProtectedRoute: Checking attempt ${attempts}/${maxAttempts}`, { user: !!user, session: !!session })
            
            if (user || session) {
              // Session found! Stop checking and show content
              console.log('ProtectedRoute: Session found! Showing content.')
              clearInterval(checkInterval)
              setIsChecking(false)
              // Clear flags
              if (typeof window !== 'undefined') {
                sessionStorage.removeItem('just_logged_in')
                sessionStorage.removeItem('login_timestamp')
              }
            } else if (attempts >= maxAttempts) {
              // Give up checking, verify session directly
              console.log('ProtectedRoute: Max attempts reached, verifying session...')
              clearInterval(checkInterval)
              setIsChecking(false)
              verifyAndRedirect()
            }
          }, 500)
        } else {
          // No session in storage or we already have user/session, verify and redirect if needed
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('just_logged_in')
            sessionStorage.removeItem('login_timestamp')
          }
          setIsChecking(false)
          verifyAndRedirect()
        }
      }, waitTime)
      
      const verifyAndRedirect = () => {
        // Check session directly from Supabase
        import('@/lib/supabase').then(({ supabase }) => {
          supabase.auth.getSession().then(({ data: { session: currentSession }, error }) => {
            console.log('ProtectedRoute: Verified session', { 
              hasSession: !!currentSession, 
              hasUser: !!currentSession?.user,
              error: error?.message 
            })
            
            // Only redirect if we're absolutely sure there's no session
            // Don't redirect if we just logged in (within last 60 seconds)
            const justLoggedIn = typeof window !== 'undefined' && 
              (sessionStorage.getItem('just_logged_in') === 'true' ||
               (parseInt(sessionStorage.getItem('login_timestamp') || '0') > 0 && 
                (Date.now() - parseInt(sessionStorage.getItem('login_timestamp') || '0')) < 60000))
            
            if ((error || !currentSession || !currentSession.user) && !user && !session && !hasRedirected && !justLoggedIn) {
              console.log('ProtectedRoute: No session found, redirecting to login')
              setHasRedirected(true)
              window.location.href = '/login'
            } else if (currentSession && currentSession.user) {
              console.log('ProtectedRoute: Session verified, should show content')
              // Session exists, clear flags
              if (typeof window !== 'undefined') {
                sessionStorage.removeItem('just_logged_in')
                sessionStorage.removeItem('login_timestamp')
              }
            } else if (justLoggedIn) {
              console.log('ProtectedRoute: Just logged in, waiting for session to be ready...')
              // Keep waiting, don't redirect yet
            }
          }).catch((err) => {
            console.error('ProtectedRoute: Error verifying session', err)
            // Only redirect on error if we're sure there's no auth
            if (!user && !session && !hasRedirected) {
              setHasRedirected(true)
              window.location.href = '/login'
            }
          })
        })
      }
      
      return () => clearTimeout(timer)
    }
  }, [loading, isChecking, hasRedirected, user, session])

  // Check if we just logged in (flag set by login page)
  const justLoggedIn = typeof window !== 'undefined' && 
    sessionStorage.getItem('just_logged_in') === 'true'
  
  // Check login timestamp - if it's very recent (within last 60 seconds), we just logged in
  const loginTimestamp = typeof window !== 'undefined' ? 
    parseInt(sessionStorage.getItem('login_timestamp') || '0') : 0
  const recentlyLoggedIn = loginTimestamp > 0 && (Date.now() - loginTimestamp) < 60000
  
  // Check if there's a Supabase session in localStorage
  const hasSupabaseSessionInStorage = typeof window !== 'undefined' && 
    Object.keys(localStorage).some(key => 
      (key.includes('supabase') || key.includes('sb-')) && 
      localStorage.getItem(key)
    )

  // If we have user or session, show content immediately
  if (user || session) {
    // Clear the just_logged_in flag if it exists
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('just_logged_in')
      sessionStorage.removeItem('login_timestamp')
    }
    return <>{children}</>
  }

  // If we just logged in OR have a session in storage, show loading (don't redirect yet)
  // This prevents redirect loops
  // CRITICAL: Always show loading if we have any indication of a session, even if user/session state isn't ready yet
  if (justLoggedIn || recentlyLoggedIn || hasSupabaseSessionInStorage) {
    console.log('ProtectedRoute: Showing loading because we just logged in or have session in storage', {
      justLoggedIn,
      recentlyLoggedIn,
      hasSupabaseSessionInStorage,
      user: !!user,
      session: !!session
    })
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Show loading state while checking authentication or during initial check
  if (loading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // If redirecting, show nothing
  if (hasRedirected) {
    return null
  }

  // If no user and no session, show nothing (redirect will happen)
  return null
}

