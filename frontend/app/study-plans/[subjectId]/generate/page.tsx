'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { studyPlansApi, subjectsApi, notesApi, topicsApi } from '@/lib/api'
import ProtectedRoute from '@/components/ProtectedRoute'
import { ArrowLeft, Calendar, Clock, Sparkles, Loader2, BookOpen, Target, Zap, TrendingUp, Brain, Star, Upload, FileText } from 'lucide-react'
import EmptyState from '@/components/EmptyState'
import { motion } from 'framer-motion'
import { studyPlanGenerateSchema, type StudyPlanGenerateInput } from '@/lib/validations'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

interface Subject {
  id: string
  name: string
  description?: string
  exam_date?: string
}

function GenerateStudyPlanContent() {
  const params = useParams()
  const router = useRouter()
  const subjectId = params.subjectId as string
  const [subject, setSubject] = useState<Subject | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [availableHours, setAvailableHours] = useState(3.0)
  const [loading, setLoading] = useState(true)
  const [hasNotes, setHasNotes] = useState(false)
  const [hasTopics, setHasTopics] = useState(false)
  const [checkingContent, setCheckingContent] = useState(true)

  useEffect(() => {
    if (subjectId) {
      fetchSubject()
      checkSubjectContent()
    }
  }, [subjectId])

  const checkSubjectContent = async () => {
    try {
      // Check for notes
      const notesResponse = await notesApi.getBySubject(subjectId)
      setHasNotes(notesResponse.data && notesResponse.data.length > 0)
      
      // Check for topics
      const topicsResponse = await topicsApi.getBySubject(subjectId)
      setHasTopics(topicsResponse.data && topicsResponse.data.length > 0)
    } catch (error) {
      console.error('Error checking subject content:', error)
      // If error, assume no content (will show upload prompt)
      setHasNotes(false)
      setHasTopics(false)
    } finally {
      setCheckingContent(false)
    }
  }

  useEffect(() => {
    // Set default dates
    const today = new Date().toISOString().split('T')[0]
    setStartDate(today)
    
    if (subject?.exam_date) {
      // Ensure exam_date is in YYYY-MM-DD format (handle both date strings and timestamps)
      let examDateStr = subject.exam_date
      if (examDateStr.includes('T')) {
        // It's a timestamp, extract just the date part
        examDateStr = examDateStr.split('T')[0]
      }
      setEndDate(examDateStr)
    } else {
      // Default to 30 days from now
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)
      setEndDate(futureDate.toISOString().split('T')[0])
    }
  }, [subject])

  const fetchSubject = async () => {
    try {
      const response = await subjectsApi.getById(subjectId)
      setSubject(response.data)
    } catch (error) {
      console.error('Error fetching subject:', error)
      setError('Failed to load subject')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setGenerating(true)
    setError(null)

    // Check if notes or topics exist
    if (!hasNotes && !hasTopics) {
      setError('Please upload notes first before generating a study plan')
      setGenerating(false)
      return
    }

    // Validate dates before submitting
    if (!startDate || !endDate) {
      setError('Please select both start date and exam date')
      setGenerating(false)
      return
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(startDate)) {
      setError('Start date must be in YYYY-MM-DD format')
      setGenerating(false)
      return
    }
    if (!dateRegex.test(endDate)) {
      setError('Exam date must be in YYYY-MM-DD format')
      setGenerating(false)
      return
    }

    const start = new Date(startDate + 'T00:00:00')
    const end = new Date(endDate + 'T00:00:00')
    
    // Check if dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setError('Invalid date format. Please select valid dates.')
      setGenerating(false)
      return
    }

    if (end <= start) {
      setError('Exam date must be after the start date')
      setGenerating(false)
      return
    }

    // Ensure availableHours is a valid number
    const hours = parseFloat(availableHours.toString())
    if (isNaN(hours) || hours < 0.5 || hours > 24) {
      setError('Available hours per day must be between 0.5 and 24')
      setGenerating(false)
      return
    }

    // Show persistent loading toast for AI generation
    const { ToastMessages, TOAST_IDS, getToastConfig } = await import('@/lib/constants/toast')
    const { dismissAndShowSuccess, dismissAndShowError } = await import('@/lib/utils/toast')
    const loadingToastId = toast.loading(
      ToastMessages.GENERATING_STUDY_PLAN,
      getToastConfig.persistentLoading(ToastMessages.GENERATING_STUDY_PLAN, TOAST_IDS.GENERATING_STUDY_PLAN)
    )

    try {
      // Ensure data types are correct and validate one more time
      const hours = parseFloat(availableHours.toString()) || 3.0
      if (hours < 0.5 || hours > 24) {
        setError('Available hours per day must be between 0.5 and 24')
        setGenerating(false)
        return
      }

      const requestData = {
        subject_id: subjectId,
        plan_type: 'daily' as const,
        start_date: startDate.trim(),
        end_date: endDate.trim(),
        available_hours_per_day: hours,
      }

      // Log request data for debugging
      console.log('Generating study plan with data:', requestData)

      const response = await studyPlansApi.generate(requestData)

      // Dismiss loading toast and show success
      dismissAndShowSuccess(
        loadingToastId,
        'Study roadmap generated successfully!',
        TOAST_IDS.STUDY_PLAN_UPDATED
      )
      
      // Small delay for better UX before redirect to subject notes page
      // This allows the user to see the "View Study Roadmap" button
      setTimeout(() => {
        router.push(`/subjects/${subjectId}/notes`)
      }, 500)
    } catch (err: any) {
      // Dismiss loading toast and show error
      dismissAndShowError(loadingToastId, err, ToastMessages.GENERATION_FAILED)
      
      // Extract detailed error message
      let errorMsg = ToastMessages.GENERATION_FAILED
      
      // Log full error for debugging (safely)
      console.error('Generation error:', err)
      if (err.response) {
        console.error('Error status:', err.response.status)
        console.error('Error statusText:', err.response.statusText)
        if (err.response.data && Object.keys(err.response.data).length > 0) {
          console.error('Error data:', err.response.data)
        } else {
          console.error('Error response exists but data is empty')
        }
      } else {
        console.error('No error response (network error?)')
        console.error('Error message:', err.message)
        console.error('Error code:', err.code)
      }
      console.error('Request data that was sent:', requestData)
      
      // Extract error message from various possible locations
      if (err.response?.data) {
        const errorData = err.response.data
        
        console.log('Full error response data:', JSON.stringify(errorData, null, 2))
        
        // Handle Pydantic validation errors (array format) - FastAPI returns 422 for validation errors
        if (Array.isArray(errorData.detail)) {
          const errors = errorData.detail.map((e: any) => {
            const field = e.loc?.join('.') || 'field'
            const msg = e.msg || 'Invalid value'
            return `${field}: ${msg}`
          }).join(', ')
          errorMsg = `Validation error: ${errors}`
          console.log('Pydantic validation errors:', errors)
        }
        // Handle single detail string (HTTPException with detail)
        else if (typeof errorData.detail === 'string' && errorData.detail.trim()) {
          errorMsg = errorData.detail
          console.log('Error detail (string):', errorData.detail)
        }
        // Handle detail object
        else if (errorData.detail && typeof errorData.detail === 'object' && !Array.isArray(errorData.detail)) {
          // Try to extract meaningful message from object
          if (errorData.detail.message) {
            errorMsg = errorData.detail.message
          } else {
            errorMsg = JSON.stringify(errorData.detail)
          }
          console.log('Error detail (object):', errorData.detail)
        }
        // Handle message field
        else if (typeof errorData.message === 'string' && errorData.message.trim()) {
          errorMsg = errorData.message
          console.log('Error message:', errorData.message)
        }
        // Handle error field
        else if (typeof errorData.error === 'string' && errorData.error.trim()) {
          errorMsg = errorData.error
          console.log('Error field:', errorData.error)
        }
        // If we still don't have a message, log the whole data structure
        if (errorMsg === ToastMessages.GENERATION_FAILED) {
          console.log('Could not extract error message, full errorData:', errorData)
          errorMsg = `Error: ${JSON.stringify(errorData)}`
        }
      }
      
      // Fallback to error message if no response data
      if (errorMsg === ToastMessages.GENERATION_FAILED) {
        if (err.message) {
          errorMsg = err.message
        } else if (err.response?.status === 400) {
          errorMsg = 'Bad request. Please check your input and try again.'
        } else if (err.response?.status === 500) {
          errorMsg = 'Server error. Please try again later.'
        } else if (!err.response) {
          errorMsg = 'Network error. Please check your connection and try again.'
        }
      }
      
      setError(errorMsg)
    } finally {
      setGenerating(false)
    }
  }

  if (loading || checkingContent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-primary-600 dark:text-primary-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            {loading ? 'Loading subject...' : 'Checking for notes and topics...'}
          </p>
        </div>
      </div>
    )
  }

  // Calculate days between dates
  const calculateDays = () => {
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const diffTime = Math.abs(end.getTime() - start.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays
    }
    return 0
  }

  const totalDays = calculateDays()
  const totalHours = totalDays * availableHours

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Hero Header */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent-600 via-primary-700 to-accent-600">
          <motion.div
            className="absolute inset-0"
            animate={{
              backgroundPosition: ['0% 0%', '100% 100%'],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
            style={{
              backgroundImage: 'linear-gradient(135deg, oklch(0.55 0.30 320), oklch(0.50 0.30 250), oklch(0.55 0.30 320))',
              backgroundSize: '200% 200%',
            }}
          />
        </div>
        
        {/* Animated mesh gradient overlay */}
        <div className="absolute inset-0">
          <motion.div
            className="absolute top-0 left-0 w-full h-full opacity-30"
            animate={{
              x: [0, 100, 0],
              y: [0, -50, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{
              background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.3) 0%, transparent 50%)',
            }}
          />
          <motion.div
            className="absolute bottom-0 right-0 w-full h-full opacity-20"
            animate={{
              x: [0, -80, 0],
              y: [0, 60, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{
              background: 'radial-gradient(circle at 70% 80%, rgba(255,255,255,0.2) 0%, transparent 50%)',
            }}
          />
        </div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        
        {/* Content */}
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link
              href={`/subjects/${subjectId}`}
              className="inline-flex items-center text-white/80 hover:text-white mb-6 transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Subject
            </Link>
            <div className="flex items-center gap-3 mb-4">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                className="p-3 bg-white/20 backdrop-blur-md rounded-2xl"
              >
                <Target className="h-8 w-8 text-white" />
              </motion.div>
              <div>
                <h1 className="text-5xl md:text-6xl font-bold text-white mb-2 drop-shadow-2xl">
                  Generate Study Plan
                </h1>
                <p className="text-xl text-white/90 font-medium">
                  {subject?.name || 'Create your personalized roadmap'}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Floating particles */}
        {typeof window !== 'undefined' && [...Array(8)].map((_, i) => {
          const randomX = Math.random() * (window.innerWidth || 1920)
          const randomY = Math.random() * 300
          return (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white/40 rounded-full"
              initial={{
                x: randomX,
                y: randomY,
                opacity: 0,
              }}
              animate={{
                y: [null, randomY - 100],
                opacity: [0, 0.6, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
                ease: "easeOut"
              }}
            />
          )
        })}
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 -mt-12 relative z-20">

        {/* Check if subject has notes/topics */}
        {!checkingContent && !hasNotes && !hasTopics && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <EmptyState
              icon={Upload}
              title="Upload Notes First"
              description="To generate a personalized study roadmap, please upload your study notes first. The AI will extract topics from your notes and create a customized study plan based on your content."
              actionLabel="Upload Notes"
              actionHref={`/notes/upload?subject_id=${subjectId}`}
            />
          </motion.div>
        )}

        {/* Generation Form - Requires notes/topics before generation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-6 md:p-8 lg:p-10 border border-gray-200/50 dark:border-gray-700/50 ${!hasNotes && !hasTopics ? 'opacity-50' : ''}`}
        >
          {!hasNotes && !hasTopics && !checkingContent && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 dark:text-red-300 mb-1">
                    Notes Required
                  </h3>
                  <p className="text-sm text-red-800 dark:text-red-400 mb-3">
                    You must upload notes before generating a study plan. The AI needs your study materials to create a personalized roadmap based on your actual content.
                  </p>
                  <Link
                    href={`/notes/upload?subject_id=${subjectId}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors text-sm"
                  >
                    <Upload className="h-4 w-4" />
                    Upload Notes Now
                  </Link>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleGenerate} className="space-y-6 md:space-y-8">
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg flex-shrink-0">
                    <Target className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-900 dark:text-red-300 mb-1">
                      Error Generating Study Plan
                    </h3>
                    <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">{error}</p>
                    {error.toLowerCase().includes('upload notes') && (
                      <Link
                        href={`/notes/upload?subject_id=${subjectId}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors text-sm mt-2"
                      >
                        <Upload className="h-4 w-4" />
                        Upload Notes Now
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Stats Preview */}
            {startDate && endDate && totalDays > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-gradient-to-br from-primary-50 to-accent-50 dark:from-primary-900/20 dark:to-accent-900/20 rounded-2xl border border-primary-200/50 dark:border-primary-800/50"
              >
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-700 dark:text-primary-300">{totalDays}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Days</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent-700 dark:text-accent-300">{totalHours.toFixed(1)}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Total Hours</div>
                </div>
                <div className="text-center col-span-2 md:col-span-1">
                  <div className="text-2xl font-bold text-primary-700 dark:text-primary-300">{availableHours}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Hours/Day</div>
                </div>
              </motion.div>
            )}

            <div className="space-y-6">
              <div>
                <label htmlFor="start_date" className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  <Calendar className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                  Start Date
                </label>
                <input
                  id="start_date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  disabled={!hasNotes && !hasTopics}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3.5 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-1">
                  When do you want to start studying?
                </p>
              </div>

              <div>
                <label htmlFor="end_date" className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  <Target className="h-4 w-4 text-accent-600 dark:text-accent-400" />
                  Exam Date
                </label>
                <input
                  id="end_date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  disabled={!hasNotes && !hasTopics}
                  min={startDate || new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3.5 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-1">
                  {subject?.exam_date ? 'Using exam date from subject' : 'When is your exam?'}
                </p>
              </div>

              <div>
                <label htmlFor="hours" className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  <Clock className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                  Available Hours Per Day
                </label>
                <div className="relative">
                  <input
                    id="hours"
                    type="number"
                    value={availableHours}
                    onChange={(e) => setAvailableHours(parseFloat(e.target.value) || 0)}
                    min="0.5"
                    max="12"
                    step="0.5"
                    required
                    disabled={!hasNotes && !hasTopics}
                    className="w-full px-4 py-3.5 pr-12 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <Clock className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-1">
                  How many hours can you study per day? (e.g., 2.5, 3, 4)
                </p>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-purple-900/20 dark:via-blue-900/20 dark:to-pink-900/20 border-2 border-purple-200/50 dark:border-purple-800/50 rounded-2xl p-6"
            >
              <div className="flex items-start gap-4">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  className="p-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex-shrink-0"
                >
                  <Brain className="h-6 w-6 text-white" />
                </motion.div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-lg text-purple-900 dark:text-purple-300">
                      Generate Study Roadmap
                    </h3>
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  </div>
                  <p className="text-sm text-purple-800 dark:text-purple-400 mb-3 font-medium">
                    AI creates a personalized daily study plan based on your exam date and available time
                  </p>
                  <ul className="space-y-2 text-sm text-purple-700 dark:text-purple-400">
                    <li className="flex items-start gap-2">
                      <span className="text-purple-500 dark:text-purple-400 mt-1">•</span>
                      <span><strong>Day-by-day breakdown</strong> of what to study</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-500 dark:text-purple-400 mt-1">•</span>
                      <span><strong>Activities:</strong> Learn new content, Revise, Practice</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-500 dark:text-purple-400 mt-1">•</span>
                      <span><strong>Time allocation</strong> based on your schedule</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-500 dark:text-purple-400 mt-1">•</span>
                      <span><strong>Spaced repetition</strong> for better retention</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-500 dark:text-purple-400 mt-1">•</span>
                      <span>Focus on your <strong>weak areas</strong> (if any)</span>
                    </li>
                  </ul>
                  <div className="mt-4 pt-4 border-t border-purple-200/50 dark:border-purple-700/50">
                    <p className="text-xs text-purple-600/70 dark:text-purple-400/70 flex items-center gap-2">
                      <Zap className="h-3 w-3" />
                      Powered by: Gemini-1.5-flash
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.button
              type="submit"
              disabled={generating || (!hasNotes && !hasTopics)}
              whileHover={{ scale: (generating || (!hasNotes && !hasTopics)) ? 1 : 1.02 }}
              whileTap={{ scale: (generating || (!hasNotes && !hasTopics)) ? 1 : 0.98 }}
              className="group/btn relative w-full flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-primary-600 via-primary-600 to-accent-600 text-white rounded-2xl font-bold shadow-xl shadow-primary-500/30 hover:shadow-2xl hover:shadow-primary-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden text-lg"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-primary-700 to-accent-700 opacity-0 group-hover/btn:opacity-100 transition-opacity"
              />
              {generating ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin relative z-10" />
                  <span className="relative z-10">Generating Study Plan...</span>
                </>
              ) : (!hasNotes && !hasTopics) ? (
                <>
                  <Upload className="h-6 w-6 relative z-10" />
                  <span className="relative z-10">Upload Notes First</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-6 w-6 relative z-10" />
                  <span className="relative z-10">Generate Study Plan</span>
                  <Zap className="h-5 w-5 relative z-10 group-hover/btn:scale-110 transition-transform" />
                </>
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}

export default function GenerateStudyPlanPage() {
  return (
    <ProtectedRoute>
      <GenerateStudyPlanContent />
    </ProtectedRoute>
  )
}

