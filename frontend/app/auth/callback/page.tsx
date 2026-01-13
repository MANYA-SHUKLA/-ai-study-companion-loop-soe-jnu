'use client'

export const dynamic = 'force-dynamic'
export const ssr = false

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Verifying your email...')

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the hash from URL (Supabase sends tokens in hash fragment for OAuth)
        if (typeof window === 'undefined') return
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const error = hashParams.get('error')
        const errorDescription = hashParams.get('error_description')

        // Also check query params (some configurations use query params)
        const queryError = searchParams.get('error')
        const queryErrorDescription = searchParams.get('error_description')

        if (error || queryError) {
          setStatus('error')
          setMessage(errorDescription || queryErrorDescription || 'Authentication failed. Please try again.')
          setTimeout(() => {
            router.push('/login')
          }, 3000)
          return
        }

        if (accessToken && refreshToken) {
          // Set the session (works for both email confirmation and OAuth)
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (sessionError) throw sessionError

          if (data.session) {
            setStatus('success')
            setMessage('Authentication successful! Redirecting to dashboard...')
            setTimeout(() => {
              router.push('/dashboard')
            }, 1500)
          } else {
            throw new Error('Failed to create session')
          }
        } else {
          // Try to get session from Supabase (it might have been set automatically)
          // This is common for OAuth flows where Supabase handles the redirect
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()
          
          if (sessionError) throw sessionError

          if (session) {
            setStatus('success')
            setMessage('Authentication successful! Redirecting to dashboard...')
            setTimeout(() => {
              router.push('/dashboard')
            }, 1500)
          } else {
            // No tokens found, might need to check email confirmation status
            setStatus('error')
            setMessage('Unable to complete authentication. Please try again.')
            setTimeout(() => {
              router.push('/login')
            }, 3000)
          }
        }
      } catch (error: any) {
        console.error('Auth callback error:', error)
        setStatus('error')
        setMessage(error?.message || 'An error occurred during authentication. Please try again.')
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      }
    }

    handleAuthCallback()
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950" />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 max-w-md w-full"
      >
        <div className="bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-gray-800/50 text-center">
          {status === 'loading' && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="mx-auto w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mb-6"
              >
                <Loader2 className="h-10 w-10 text-white animate-spin" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-2">Verifying Email</h2>
              <p className="text-gray-400">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-6"
              >
                <CheckCircle2 className="h-12 w-12 text-white" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-2">Email Confirmed!</h2>
              <p className="text-gray-400">{message}</p>
            </>
          )}

          {status === 'error' && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="mx-auto w-20 h-20 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center mb-6"
              >
                <XCircle className="h-12 w-12 text-white" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-2">Verification Failed</h2>
              <p className="text-gray-400 mb-6">{message}</p>
              <button
                onClick={() => router.push('/login')}
                className="px-6 py-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                Go to Sign In
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <Loader2 className="h-12 w-12 text-indigo-500 animate-spin" />
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}

