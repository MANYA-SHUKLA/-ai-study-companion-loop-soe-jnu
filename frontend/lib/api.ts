/**
 * API client for backend communication
 */

import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Debug: Log API URL in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('API Base URL:', API_URL)
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token interceptor for Supabase JWT
api.interceptors.request.use(
  async (config) => {
    try {
      // Get Supabase session token
      const { getSessionToken } = await import('./supabase')
      let token = await getSessionToken()
      
      // If no token but we're making an authenticated request, wait a bit and retry
      // This handles race conditions where the session isn't fully ready yet
      if (!token && typeof window !== 'undefined') {
        // Small delay to allow session to be ready
        await new Promise(resolve => setTimeout(resolve, 100))
        token = await getSessionToken()
      }
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
        // Debug: Log token prefix in development
        if (process.env.NODE_ENV === 'development') {
          const tokenPrefix = token.substring(0, 20)
          console.log(`[API] Adding auth token to request ${config.url} (token prefix: ${tokenPrefix}...)`)
        }
      } else {
        console.warn('[API] No auth token available for API request to:', config.url)
        // Don't fail here - let the backend decide if auth is required
        // The backend will return 401 if auth is required
      }
    } catch (error) {
      console.error('Error getting session token:', error)
      // Continue with request - backend will handle auth errors
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle network failures (no response from server)
    if (!error.response) {
      // Check if it's a network error
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error' || error.request) {
        const { ToastMessages, getToastConfig } = await import('./constants/toast')
        const toast = (await import('react-hot-toast')).default
        
        // Only show network error toast if not already shown
        toast.error(ToastMessages.NETWORK_ERROR, getToastConfig.networkError())
        
        // Create a structured error for components to handle
        error.isNetworkError = true
        error.userMessage = ToastMessages.NETWORK_ERROR
      }
    }
    
    // Only handle 401 if we have a response (not network errors)
    // And only if it's actually an authentication error, not a connection issue
    if (error.response?.status === 401 && !error.isNetworkError) {
      // Check if we just logged in (within last 60 seconds) - don't sign out in this case
      const loginTimestamp = typeof window !== 'undefined' ? 
        parseInt(sessionStorage.getItem('login_timestamp') || '0') : 0
      const justLoggedIn = typeof window !== 'undefined' && 
        (sessionStorage.getItem('just_logged_in') === 'true' ||
         (loginTimestamp > 0 && (Date.now() - loginTimestamp) < 60000))
      
      // Check if this is a connection error (should not sign out on connection issues)
      const isConnectionError = error.code === 'ERR_CONNECTION_REFUSED' || 
                                error.code === 'ECONNREFUSED' ||
                                error.message?.includes('Connection refused') ||
                                error.message?.includes('Network Error')
      
      // Verify session is actually invalid before signing out
      let hasValidSession = false
      if (typeof window !== 'undefined' && !justLoggedIn && !isConnectionError) {
        try {
          const { supabase } = await import('./supabase')
          const { data: { session } } = await supabase.auth.getSession()
          hasValidSession = !!session && !!session.access_token
        } catch (e) {
          console.error('Error checking session:', e)
        }
      }
      
      // Only sign out if we're sure it's an auth error and we didn't just log in
      // AND it's not a connection error AND we've verified the session is actually invalid
      if (!justLoggedIn && !isConnectionError && !hasValidSession) {
        // Check if the error message indicates actual auth failure
        const errorMessage = error.response?.data?.detail || error.message || ''
        const isAuthError = errorMessage.toLowerCase().includes('authentic') || 
                          errorMessage.toLowerCase().includes('invalid') ||
                          errorMessage.toLowerCase().includes('unauthorized') ||
                          errorMessage.toLowerCase().includes('token') ||
                          errorMessage.toLowerCase().includes('not authenticated')
        
        if (isAuthError) {
          console.warn('Authentication error detected and session verified as invalid, signing out...', errorMessage)
          const { supabase } = await import('./supabase')
          await supabase.auth.signOut()
          
          // Only redirect if we're in the browser
          if (typeof window !== 'undefined') {
            window.location.href = '/login'
          }
        } else {
          console.log('401 error but not an auth error, ignoring sign out:', errorMessage)
        }
      } else {
        if (justLoggedIn) {
          console.log('Ignoring 401 error - user just logged in (within last 60 seconds)')
        }
        if (isConnectionError) {
          console.log('Ignoring 401 error - connection issue, not auth failure')
        }
        if (hasValidSession) {
          console.log('Ignoring 401 error - session is still valid, might be backend issue')
        }
      }
    }
    
    // Handle 422 validation errors with generic user-friendly message
    if (error.response?.status === 422) {
      // Replace raw validation error with generic message
      error.response.data = {
        ...error.response.data,
        detail: 'Invalid input. Please check your data and try again.',
      }
    }
    
    return Promise.reject(error)
  }
)

// Subjects API
export const subjectsApi = {
  getAll: () => api.get('/api/subjects/'),
  getById: (id: string) => api.get(`/api/subjects/${id}`),
  create: (data: { name: string; description?: string; exam_date?: string }) =>
    api.post('/api/subjects/', data),
  update: (id: string, data: any) => api.put(`/api/subjects/${id}`, data),
  delete: (id: string) => api.delete(`/api/subjects/${id}`),
}

// Topics API
export const topicsApi = {
  getBySubject: (subjectId: string) =>
    api.get(`/api/topics/subject/${subjectId}`),
  getBySubjectWithProgress: (subjectId: string) =>
    api.get(`/api/topics/subject/${subjectId}/with-progress`),
  getById: (id: string) => api.get(`/api/topics/${id}`),
  create: (data: any) => api.post('/api/topics/', data),
  createBatch: (data: { topics: any[] }) => api.post('/api/topics/batch', data),
  saveExtractedTopics: (subjectId: string, topics: any[]) =>
    api.post('/api/topics/batch-from-extraction', {
      subject_id: subjectId,
      topics: topics,
    }),
  update: (id: string, data: any) => api.put(`/api/topics/${id}`, data),
  delete: (id: string) => api.delete(`/api/topics/${id}`),
  toggleCompletion: (id: string) => api.post(`/api/topics/${id}/toggle-completion`, {}),
}

// Notes API
export const notesApi = {
  getAll: (params?: { subject_id?: string; topic_id?: string }) =>
    api.get('/api/notes/', { params }),
  getById: (id: string) => api.get(`/api/notes/${id}`),
  getBySubject: (subjectId: string) => api.get(`/api/notes/subject/${subjectId}`),
  upload: (file: File, subjectId?: string, topicId?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (subjectId) formData.append('subject_id', subjectId)
    if (topicId) formData.append('topic_id', topicId)
    return api.post('/api/notes/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  extractTopics: (noteId: string, subjectId: string) =>
    api.post(`/api/notes/${noteId}/extract-topics?subject_id=${subjectId}`),
  reindexEmbeddings: (noteId: string) =>
    api.post(`/api/notes/${noteId}/reindex-embeddings`),
  reindexAllEmbeddings: (subjectId?: string) =>
    api.post(`/api/notes/reindex-all${subjectId ? `?subject_id=${subjectId}` : ''}`),
  delete: (id: string) => api.delete(`/api/notes/${id}`),
}

// Study Plans API
export const studyPlansApi = {
  getAll: () => api.get('/api/study-plans/all'),
  generate: (data: {
    subject_id: string
    plan_type?: string
    start_date: string
    end_date: string
    available_hours_per_day?: number
  }) => api.post('/api/study-plans/generate', data),
  getBySubject: (subjectId: string) =>
    api.get(`/api/study-plans/subject/${subjectId}`),
  getById: (id: string) => api.get(`/api/study-plans/${id}`),
  update: (id: string, data: any) => api.put(`/api/study-plans/${id}`, data),
  regenerate: (id: string) => api.post(`/api/study-plans/${id}/regenerate`),
  toggleDayCompletion: (planId: string, dayIndex: number) =>
    api.post(`/api/study-plans/${planId}/toggle-day-completion?day_index=${dayIndex}`),
  updateWeakAreas: (planId: string) =>
    api.post(`/api/study-plans/${planId}/update-weak-areas`),
  getWeakAreas: (subjectId: string) =>
    api.get(`/api/study-plans/weak-areas/subject/${subjectId}`),
}

// Search API
export const searchApi = {
  search: (data: {
    query: string
    top_k?: number
    subject_id?: string
    topic_id?: string
    use_ai_fallback?: boolean
  }) => api.post('/api/search/', data),
}

export default api

