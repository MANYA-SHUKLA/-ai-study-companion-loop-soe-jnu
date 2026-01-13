'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { subjectsApi, notesApi, studyPlansApi } from '@/lib/api'
import FileUpload from '@/components/FileUpload'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/components/AuthProvider'
import { ArrowLeft, BookOpen, FileText, Upload as UploadIcon, Sparkles, Map, Calendar, Clock, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { showErrorToast } from '@/lib/utils/toast'
import { ToastMessages } from '@/lib/constants/toast'
import { motion } from 'framer-motion'

interface Subject {
  id: string
  name: string
  description?: string
}

function UploadNotesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, session, loading: authLoading } = useAuth()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('')
  const [selectedTopicId, setSelectedTopicId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [fetchingSubjects, setFetchingSubjects] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [studyPlans, setStudyPlans] = useState<any[]>([])
  const [loadingPlans, setLoadingPlans] = useState(false)

  useEffect(() => {
    // Only fetch subjects when authentication is ready and user is authenticated
    const fetchSubjectsIfReady = async () => {
      if (!authLoading && (user || session)) {
        // Ensure we have a valid session token before making the request
        try {
          const { getSessionToken } = await import('@/lib/supabase')
          const token = await getSessionToken()
          if (token) {
            await fetchSubjects()
          } else {
            console.warn('No session token available, waiting for authentication...')
            // Wait a bit and try again if session exists but token isn't ready yet
            if (session) {
              setTimeout(() => {
                getSessionToken().then((retryToken) => {
                  if (retryToken) {
                    fetchSubjects()
                  } else {
                    setLoading(false)
                  }
                })
              }, 1000)
            } else {
              setLoading(false)
            }
          }
        } catch (error) {
          console.error('Error getting session token:', error)
          setLoading(false)
        }
      } else if (!authLoading && !user && !session) {
        // If auth is done but no user, set loading to false
        setLoading(false)
      }
    }
    
    fetchSubjectsIfReady()
  }, [authLoading, user, session])

  useEffect(() => {
    // Set subject from query parameter if provided
    const subjectIdParam = searchParams.get('subject_id')
    if (subjectIdParam && subjects.length > 0) {
      const subject = subjects.find(s => s.id === subjectIdParam)
      if (subject) {
        setSelectedSubjectId(subjectIdParam)
      }
    }
  }, [searchParams, subjects])

  useEffect(() => {
    // Fetch study plans when subject is selected and upload is successful
    if (uploadSuccess && selectedSubjectId) {
      fetchStudyPlans()
    }
  }, [uploadSuccess, selectedSubjectId])

  const fetchStudyPlans = async () => {
    if (!selectedSubjectId) return
    
    setLoadingPlans(true)
    try {
      const response = await studyPlansApi.getBySubject(selectedSubjectId)
      const plans = Array.isArray(response.data) ? response.data : [response.data]
      setStudyPlans(plans.filter((p: any) => p)) // Filter out null/undefined
    } catch (error) {
      console.error('Error fetching study plans:', error)
      setStudyPlans([])
    } finally {
      setLoadingPlans(false)
    }
  }

  const fetchSubjects = async () => {
    // Prevent multiple simultaneous calls
    if (fetchingSubjects) {
      return
    }
    
    setFetchingSubjects(true)
    try {
      // Double-check we have a token before making the request
      const { getSessionToken } = await import('@/lib/supabase')
      const token = await getSessionToken()
      
      if (!token) {
        console.error('Cannot fetch subjects: No authentication token available')
        console.log('Auth state:', { user: !!user, session: !!session, authLoading })
        setLoading(false)
        setFetchingSubjects(false)
        return
      }
      
      console.log('Fetching subjects with token (prefix):', token.substring(0, 20))
      const response = await subjectsApi.getAll()
      setSubjects(response.data)
      if (response.data.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(response.data[0].id)
      }
    } catch (error: any) {
      console.error('Error fetching subjects:', error)
      
      // Log full error structure for debugging
      console.error('Full error object:', {
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        hasResponse: !!error.response,
        hasRequest: !!error.request,
        message: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack?.substring(0, 200), // First 200 chars of stack
      })
      
      // Check if it's a network error (no response from server)
      if (!error.response) {
        console.error('Network error - Backend may not be reachable:', {
          message: error.message,
          code: error.code,
          request: error.request ? 'Request was made' : 'No request made',
          config: error.config ? {
            url: error.config.url,
            baseURL: error.config.baseURL,
            method: error.config.method
          } : 'No config'
        })
        showErrorToast(error, ToastMessages.NETWORK_ERROR)
      } else {
        // Server responded but with an error
        // Log each property separately to avoid serialization issues
        console.error('=== ERROR RESPONSE DETAILS ===')
        console.error('Status:', error.response?.status)
        console.error('Status Text:', error.response?.statusText)
        console.error('Data:', error.response?.data)
        console.error('Headers:', error.response?.headers)
        console.error('Error Message:', error.message)
        console.error('Full Error Object:', error)
        
        // Try to stringify the response data if it exists
        try {
          if (error.response?.data) {
            console.error('Response Data (stringified):', JSON.stringify(error.response.data, null, 2))
          }
        } catch (e) {
          console.error('Could not stringify response data:', e)
        }
        
        // If it's a 401, show more details
        const status = error.response?.status || (error.response ? 'unknown' : 'no response')
        console.error('Response Status:', status)
        
        if (status === 401) {
          console.error('=== 401 UNAUTHORIZED - AUTHENTICATION FAILED ===')
          console.error('Please check:')
          console.error('1. Are you logged in? Check AuthProvider state')
          console.error('2. Is the token being sent? Check Network tab -> Headers -> Authorization')
          console.error('3. Does SUPABASE_JWT_SECRET in backend .env match your Supabase project JWT Secret?')
          console.error('   - Get JWT Secret from: Supabase Dashboard -> Settings -> API -> JWT Secret')
          
          // Show token info if available
          if (typeof window !== 'undefined') {
            import('@/lib/supabase').then(({ getSessionToken }) => {
              getSessionToken().then(token => {
                if (token) {
                  console.error('Current token prefix:', token.substring(0, 30))
                  console.error('Token length:', token.length)
                } else {
                  console.error('No token available!')
                }
              })
            })
          }
        }
        console.error('=== END ERROR DETAILS ===')
      }
      // If it's an auth error, the API interceptor will handle sign out
    } finally {
      setLoading(false)
      setFetchingSubjects(false)
    }
  }

  const handleUploadSuccess = () => {
    // Set upload success state to show roadmap options
    setUploadSuccess(true)
    // Don't redirect immediately - let user see the options
  }

  return (
    <div className="min-h-screen pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="inline-flex p-3 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl">
              <UploadIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Upload Notes
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Upload your syllabus or study materials (PDF, TXT, MD)
              </p>
            </div>
          </div>
        </div>

        {/* Subject Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            <BookOpen className="h-5 w-5 inline-block mr-2" />
            Select Subject (Required)
          </label>
          {loading ? (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent"></div>
            </div>
          ) : subjects.length === 0 ? (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-yellow-800 dark:text-yellow-300 text-sm">
                No subjects found. Please create a subject first.{' '}
                <Link href="/subjects/new" className="underline font-medium">
                  Create Subject
                </Link>
              </p>
            </div>
          ) : (
            <select
              value={selectedSubjectId}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value)
                setSelectedTopicId('') // Reset topic when subject changes
              }}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          )}
          {selectedSubjectId && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Selected: {subjects.find(s => s.id === selectedSubjectId)?.name}
            </p>
          )}
        </div>

        {/* Chapter/Topic Selection (Optional) */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            <FileText className="h-5 w-5 inline-block mr-2" />
            Chapter/Topic (Optional)
          </label>
          <input
            type="text"
            value={selectedTopicId}
            onChange={(e) => setSelectedTopicId(e.target.value)}
            placeholder="e.g., Chapter 1, Introduction, etc."
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            You can tag this note with a specific chapter or topic name
          </p>
        </div>

        {/* File Upload */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Upload File
          </h2>
          {selectedSubjectId ? (
            <FileUpload
              subjectId={selectedSubjectId}
              topicId={selectedTopicId || undefined}
              onUploadSuccess={handleUploadSuccess}
            />
          ) : (
            <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                Please select a subject first to upload notes
              </p>
            </div>
          )}
        </div>

        {/* Roadmap Options - Show after successful upload */}
        {uploadSuccess && selectedSubjectId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-purple-900/20 dark:via-blue-900/20 dark:to-pink-900/20 rounded-2xl shadow-xl p-6 md:p-8 border-2 border-purple-200/50 dark:border-purple-800/50 mt-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="inline-flex p-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl">
                <Map className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Study Roadmap
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  Generate a personalized study plan or view existing roadmaps
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Generate New Roadmap */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-purple-200 dark:border-purple-800"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Generate New Roadmap
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Create a personalized daily study plan based on your uploaded notes and exam date.
                </p>
                <Link
                  href={`/study-plans/${selectedSubjectId}/generate`}
                  className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-700 hover:to-accent-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Sparkles className="h-4 w-4" />
                  Generate Roadmap
                </Link>
              </motion.div>

              {/* View Existing Roadmaps */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-purple-200 dark:border-purple-800"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
                    <Map className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Existing Roadmaps
                  </h3>
                </div>
                {loadingPlans ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent"></div>
                  </div>
                ) : studyPlans.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {studyPlans.map((plan: any) => {
                      const planData = typeof plan.plan_data === 'string' 
                        ? JSON.parse(plan.plan_data) 
                        : plan.plan_data || {}
                      const startDate = planData.start_date || plan.start_date
                      const endDate = planData.end_date || plan.end_date
                      
                      return (
                        <Link
                          key={plan.id}
                          href={`/study-plans/plan/${plan.id}`}
                          className="block p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 transition-all group"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Calendar className="h-4 w-4 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {startDate && endDate 
                                    ? `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
                                    : 'Study Plan'
                                  }
                                </span>
                                {plan.is_active && (
                                  <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                                    Active
                                  </span>
                                )}
                              </div>
                              {planData.days && (
                                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {planData.days.length} days
                                  </span>
                                </div>
                              )}
                            </div>
                            <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 flex-shrink-0 transition-colors" />
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      No roadmaps found for this subject yet.
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Generate your first roadmap to get started!
                    </p>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link
                href={`/subjects/${selectedSubjectId}/notes`}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-medium border border-gray-300 dark:border-gray-600 transition-all"
              >
                <FileText className="h-4 w-4" />
                View Notes
              </Link>
              <button
                onClick={() => {
                  setUploadSuccess(false)
                  setStudyPlans([])
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-all"
              >
                Upload Another File
              </button>
            </div>
          </motion.div>
        )}

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
            Supported File Types
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
            <li>• PDF files (.pdf) - Best for syllabi and textbooks</li>
            <li>• Text files (.txt) - Plain text documents</li>
            <li>• Markdown (.md, .markdown) - Formatted text documents</li>
          </ul>
          <p className="text-sm text-blue-700 dark:text-blue-500 mt-3">
            After uploading, you can extract topics from your notes and generate a study plan.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function UploadNotesPage() {
  return (
    <ProtectedRoute>
      <UploadNotesContent />
    </ProtectedRoute>
  )
}

