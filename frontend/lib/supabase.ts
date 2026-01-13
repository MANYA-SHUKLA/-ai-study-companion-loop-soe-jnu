/**
 * Supabase client configuration
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Check if Supabase is properly configured
const isSupabaseConfigured = supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('placeholder') && 
  supabaseUrl.startsWith('https://') &&
  supabaseUrl.includes('.supabase.co')

if (!isSupabaseConfigured) {
  // Only throw in production, allow development with placeholder values
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set')
  }
  // Use placeholder values for development if not set
  console.warn('⚠️  Supabase environment variables not set. Using placeholder values.')
  console.warn('📝 Create frontend/.env.local with your Supabase credentials. See ENV_SETUP.md for instructions.')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
)

// Export a helper to check if Supabase is configured
export const isSupabaseReady = () => isSupabaseConfigured

/**
 * Get current session token for API requests
 */
export async function getSessionToken(): Promise<string | null> {
  try {
    // First try to get the session
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Error getting session:', error)
      return null
    }
    
    if (session?.access_token) {
      return session.access_token
    }
    
    // If no session, try to refresh
    const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
    
    if (refreshError) {
      console.error('Error refreshing session:', refreshError)
      return null
    }
    
    return refreshedSession?.access_token || null
  } catch (error) {
    console.error('Error in getSessionToken:', error)
    return null
  }
}

/**
 * Get current user ID
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id || null
}

