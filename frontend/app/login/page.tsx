'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import { GraduationCap, Mail, Lock, ArrowRight, Sparkles, Send } from 'lucide-react'
import { motion } from 'framer-motion'
import Image from 'next/image'

export default function LoginPage() {
  const router = useRouter()
  const { user, loading: authLoading, session } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showResendConfirmation, setShowResendConfirmation] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const isLoggingIn = useRef(false)
  const hasRedirected = useRef(false)

  // Redirect to dashboard when user becomes available (after successful login or if already logged in)
  useEffect(() => {
    if (user && session && !authLoading && !hasRedirected.current) {
      console.log('✅ User session detected, redirecting to dashboard...')
      hasRedirected.current = true
      // Clear the flag if it exists
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('just_logged_in')
        sessionStorage.removeItem('login_timestamp')
      }
      // Use window.location for a hard redirect
      window.location.href = '/dashboard'
    }
  }, [user, session, authLoading])

  const handleGoogleLogin = async () => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
        setError('Supabase is not configured. Please set up your environment variables.')
        return
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })

      if (error) {
        setError(error.message || 'Failed to sign in with Google')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google. Please try again.')
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation() // Stop event propagation
    
    if (isLoggingIn.current) {
      console.log('⚠️ Already logging in, ignoring request')
      return // Prevent multiple login attempts
    }
    
    console.log('🚀 Starting login process...')
    isLoggingIn.current = true
    setLoading(true)
    setError(null)
    setShowResendConfirmation(false)
    setResendSuccess(false)

    try {
      // Check if Supabase is properly configured
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
        setError('Supabase is not configured. Please set up your environment variables. See ENV_SETUP.md for instructions.')
        setLoading(false)
        return
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      console.log('Login response:', { hasData: !!data, hasError: !!error, hasUser: !!data?.user, hasSession: !!data?.session })

      if (error) {
        console.error('Login error:', error)
        throw error
      }

      if (!data) {
        console.error('No data returned from login')
        throw new Error('No data returned from login')
      }

      if (!data.user || !data.session) {
        console.error('Missing user or session:', { hasUser: !!data.user, hasSession: !!data.session })
        throw new Error('Login succeeded but user or session is missing')
      }

      console.log('✅ Login successful! User:', data.user.email, 'Session exists:', !!data.session)
      
      // Set a flag in sessionStorage to tell ProtectedRoute we just logged in
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('just_logged_in', 'true')
        sessionStorage.setItem('login_timestamp', Date.now().toString())
      }
      
      // Wait a moment for the session to be properly set in Supabase
      // Verify session is actually set before redirecting
      setLoading(false)
      isLoggingIn.current = false
      
      // Wait a bit longer and verify session before redirecting
      setTimeout(async () => {
        try {
          // Verify session is actually available
          const { data: { session: verifiedSession }, error: verifyError } = await supabase.auth.getSession()
          
          if (verifyError) {
            console.error('Error verifying session after login:', verifyError)
          }
          
          if (verifiedSession && verifiedSession.access_token) {
            console.log('🔄 Session verified, redirecting to /dashboard...')
            hasRedirected.current = true
            // Use window.location for a hard redirect to ensure clean state
            window.location.href = '/dashboard'
          } else {
            console.warn('⚠️ Session not ready yet, waiting a bit more...')
            // Wait a bit more and try again
            setTimeout(() => {
              console.log('🔄 Retrying redirect to /dashboard...')
              hasRedirected.current = true
              window.location.href = '/dashboard'
            }, 1000)
          }
        } catch (err) {
          console.error('Error in redirect logic:', err)
          // Still redirect even if verification fails
          hasRedirected.current = true
          window.location.href = '/dashboard'
        }
      }, 800)
      
      return
    } catch (error: any) {
      console.error('❌ Login catch block:', error)
      // Handle email not confirmed error
      if (error?.message?.includes('email_not_confirmed') || error?.message?.includes('Email not confirmed')) {
        setError('Please confirm your email address before signing in. Check your inbox for the confirmation email.')
        setShowResendConfirmation(true)
      } else if (error?.message?.includes('Failed to fetch') || error?.message?.includes('ERR_NAME_NOT_RESOLVED')) {
        setError('Unable to connect to authentication service. Please check your internet connection and Supabase configuration.')
      } else if (error?.message) {
        setError(error.message)
      } else {
        setError('An error occurred during login. Please try again.')
      }
      setLoading(false)
      isLoggingIn.current = false
    }
  }

  const handleResendConfirmation = async () => {
    if (!email) {
      setError('Please enter your email address first.')
      return
    }

    setResendLoading(true)
    setResendSuccess(false)
    setError(null)

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      })

      if (error) throw error

      setResendSuccess(true)
      setError(null)
    } catch (error: any) {
      setError(error?.message || 'Failed to resend confirmation email. Please try again.')
    } finally {
      setResendLoading(false)
    }
  }

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // Don't render login form if we're redirecting after successful login
  if (hasRedirected.current) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-400">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center relative overflow-hidden px-4 py-12">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950" />
      
      {/* Animated gradient orbs */}
      <motion.div
        animate={{
          x: [0, 100, 0],
          y: [0, 50, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-full blur-3xl"
      />
      <motion.div
        animate={{
          x: [0, -80, 0],
          y: [0, -60, 0],
          scale: [1, 1.3, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute bottom-20 right-20 w-[500px] h-[500px] bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-indigo-500/20 rounded-full blur-3xl"
      />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      <div className="relative z-10 max-w-md w-full">
        {/* Logo/Icon Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <motion.div
            animate={{ 
              y: [0, -10, 0],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="inline-block mb-6"
          >
            <div className="relative">
              {/* Glow effect */}
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl blur-2xl"
              />
              {/* Icon container */}
              <div className="relative bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-5 rounded-3xl shadow-2xl shadow-indigo-500/50">
                <GraduationCap className="h-12 w-12 text-white" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-3xl" />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="absolute -top-1 -right-1"
                >
                  <Sparkles className="h-5 w-5 text-yellow-400 drop-shadow-lg" />
                </motion.div>
              </div>
            </div>
          </motion.div>
          
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3">
            <span className="text-white">Welcome Back</span>
          </h1>
          <p className="text-xl text-gray-400">
            Sign in to continue to AI Study Companion
          </p>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative"
        >
          {/* Glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/30 via-purple-500/30 to-pink-500/30 rounded-3xl blur-xl opacity-50" />
          
          {/* Card */}
          <div className="relative bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-gray-800/50">
            <form onSubmit={handleLogin} className="space-y-6" noValidate>
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm backdrop-blur-sm"
                >
                  {error}
                </motion.div>
              )}

              {resendSuccess && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-xl text-sm backdrop-blur-sm"
                >
                  Confirmation email sent! Please check your inbox and click the confirmation link.
                </motion.div>
              )}

              {showResendConfirmation && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 space-y-3"
                >
                  <p className="text-sm text-gray-300">
                    Need a new confirmation email?
                  </p>
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={resendLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/50 text-indigo-300 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                  >
                    {resendLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-indigo-300 border-t-transparent rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Resend Confirmation Email
                      </>
                    )}
                  </button>
                </motion.div>
              )}

              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="block w-full pl-12 pr-4 py-3.5 border border-gray-700/50 rounded-xl bg-gray-800/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-300"
                    placeholder="shuklamanya99@gmail.com"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="block w-full pl-12 pr-4 py-3.5 border border-gray-700/50 rounded-xl bg-gray-800/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-300"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700/50"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-gray-900/80 text-gray-400">Or continue with</span>
                </div>
              </div>

              {/* Google OAuth Button */}
              <motion.button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                className="w-full relative group overflow-hidden bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl transition-all duration-300"
              >
                <div className="relative flex items-center justify-center px-6 py-3.5">
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-200 font-semibold">
                    Sign in with Google
                  </span>
                </div>
              </motion.button>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                className="w-full relative group overflow-hidden"
              >
                {/* Gradient background */}
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                {/* Hover gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                {/* Content */}
                <div className="relative flex items-center justify-center px-6 py-4 text-white font-bold text-lg rounded-xl shadow-lg shadow-indigo-500/50">
                  {loading ? (
                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </div>
                {/* Shine effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                {/* Disabled overlay */}
                {loading && (
                  <div className="absolute inset-0 bg-gray-900/50 rounded-xl" />
                )}
              </motion.button>
            </form>

            {/* Sign Up Link */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-400">
                Don't have an account?{' '}
                <Link 
                  href="/signup" 
                  className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors inline-flex items-center gap-1 group"
                >
                  Sign up
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

