'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { studyPlansApi, topicsApi, subjectsApi } from '@/lib/api'
import ProtectedRoute from '@/components/ProtectedRoute'
import { ArrowLeft, Calendar, Clock, BookOpen, CheckCircle2, RotateCcw, TrendingUp, Target, Zap, Star, Brain, Sparkles, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import StudyFlowVisualization from '@/components/StudyFlowVisualization'
import LoadingSpinner from '@/components/LoadingSpinner'
import ErrorMessage from '@/components/ErrorMessage'
import ProgressBar from '@/components/ProgressBar'
import ChapterProgress from '@/components/ChapterProgress'
import toast from 'react-hot-toast'
import ConfirmationDialog from '@/components/ConfirmationDialog'

interface Activity {
  topic: string
  activity: 'learn' | 'revise' | 'quiz'
  hours: number
}

interface PlanDay {
  date: string
  activities: Activity[]
  total_hours: number
  completed?: boolean
  completed_at?: string
}

interface StudyPlan {
  id: string
  subject_id: string
  plan_type: string
  start_date: string
  end_date: string
  plan_data: {
    plan_type: string
    start_date: string
    end_date: string
    days: PlanDay[]
  }
  is_active: boolean
  created_at: string
}

function StudyPlanContent() {
  const params = useParams()
  const router = useRouter()
  const planId = params.planId as string
  const [plan, setPlan] = useState<StudyPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [topics, setTopics] = useState<any[]>([])
  const [loadingTopics, setLoadingTopics] = useState(false)
  const [subjectName, setSubjectName] = useState<string>('')
  const [confirmRegenerate, setConfirmRegenerate] = useState(false)

  useEffect(() => {
    if (planId) {
      fetchPlan()
    }
  }, [planId])

  useEffect(() => {
    if (plan?.subject_id) {
      fetchTopicsWithProgress()
    }
  }, [plan?.subject_id])

  const fetchPlan = async () => {
    try {
      const response = await studyPlansApi.getById(planId)
      setPlan(response.data)
      
      // Fetch subject name for visualization
      if (response.data.subject_id) {
        try {
          const subjectResponse = await subjectsApi.getById(response.data.subject_id)
          setSubjectName(subjectResponse.data.name)
        } catch {
          // Ignore errors fetching subject name
        }
      }
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to load study plan. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchTopicsWithProgress = async () => {
    if (!plan?.subject_id) return
    
    setLoadingTopics(true)
    try {
      // Try to get topics with progress, fallback to regular topics
      try {
        const response = await topicsApi.getBySubjectWithProgress(plan.subject_id)
        setTopics(response.data || [])
      } catch {
        // Fallback to regular topics if endpoint doesn't exist
        const response = await topicsApi.getBySubject(plan.subject_id)
        setTopics(response.data || [])
      }
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to load topics. Please try again.')
    } finally {
      setLoadingTopics(false)
    }
  }

  const handleRegenerateClick = () => {
    setConfirmRegenerate(true)
  }

  const handleRegenerate = async () => {
    setRegenerating(true)
    setError(null)
    setConfirmRegenerate(false)

    try {
      const response = await studyPlansApi.regenerate(planId)
      setPlan(response.data)
      toast.success('Study plan regenerated successfully!')
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to regenerate study plan. Please try again.'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setRegenerating(false)
    }
  }

  const handleToggleDayCompletion = async (dayIndex: number) => {
    if (!plan) return
    
    try {
      const response = await studyPlansApi.toggleDayCompletion(planId, dayIndex)
      setPlan(response.data.plan)
      
      if (response.data.completed) {
        toast.success(`Day ${dayIndex + 1} marked as completed! 🎉`)
      } else {
        toast('Day marked as not completed', { icon: '📝' })
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to update completion status. Please try again.'
      toast.error(errorMsg)
    }
  }

  const getActivityIcon = (activity: string) => {
    switch (activity) {
      case 'learn':
        return <BookOpen className="h-4 w-4" />
      case 'revise':
        return <RotateCcw className="h-4 w-4" />
      case 'quiz':
        return <Target className="h-4 w-4" />
      default:
        return <BookOpen className="h-4 w-4" />
    }
  }

  const getActivityColor = (activity: string) => {
    switch (activity) {
      case 'learn':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'revise':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
      case 'quiz':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getActivityLabel = (activity: string) => {
    switch (activity) {
      case 'learn':
        return 'Learn'
      case 'revise':
        return 'Revise'
      case 'quiz':
        return 'Quiz'
      default:
        return activity
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading study plan..." />
      </div>
    )
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <ErrorMessage 
            message={error || 'Study plan not found'} 
            type="error"
          />
          <Link
            href="/dashboard"
            className="mt-4 inline-flex items-center text-primary-600 dark:text-primary-400 hover:underline"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const planData = typeof plan.plan_data === 'string' 
    ? JSON.parse(plan.plan_data) 
    : plan.plan_data

  const days = planData?.days || []
  // Calculate progress based on actual completion status, not just date
  const completedDays = days.filter((day: PlanDay) => day.completed === true).length
  const planProgress = days.length > 0 ? (completedDays / days.length) * 100 : 0

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
        </div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        
        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link
              href={`/subjects/${plan.subject_id}`}
              className="inline-flex items-center text-white/80 hover:text-white mb-6 transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Subject
            </Link>
            
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  className="p-3 bg-white/20 backdrop-blur-md rounded-2xl"
                >
                  <Target className="h-8 w-8 text-white" />
                </motion.div>
                <div>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-2 drop-shadow-2xl">
                    Study Plan
                  </h1>
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-lg text-white/90 font-medium">
                      {formatDate(planData.start_date)} - {formatDate(planData.end_date)}
                    </p>
                    <span className="text-xs text-white/80 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full border border-white/30">
                      <Sparkles className="h-3 w-3 inline mr-1" />
                      Gemini-1.5-flash
                    </span>
                  </div>
                </div>
              </div>
              <motion.button
                onClick={handleRegenerateClick}
                disabled={regenerating}
                whileHover={{ scale: regenerating ? 1 : 1.05 }}
                whileTap={{ scale: regenerating ? 1 : 0.95 }}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-white/20 backdrop-blur-md border border-white/30 rounded-xl hover:bg-white/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {regenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4" />
                    Regenerate
                  </>
                )}
              </motion.button>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 -mt-12 relative z-20">
        {/* Error Message */}
        {error && (
          <div className="mb-6">
            <ErrorMessage 
              message={error} 
              onDismiss={() => setError(null)}
              type="error"
            />
          </div>
        )}

        {/* Study Plan Features Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-purple-900/20 dark:via-blue-900/20 dark:to-pink-900/20 border-2 border-purple-200/50 dark:border-purple-800/50 rounded-2xl p-6"
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
                  Your Personalized Study Roadmap
                </h3>
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              </div>
              <p className="text-sm text-purple-800 dark:text-purple-400 mb-3">
                This AI-generated study plan includes:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-purple-700 dark:text-purple-400">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-500 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Day-by-day breakdown</strong> of what to study</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-500 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Activities:</strong> Learn, Revise, Practice</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-500 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Time allocation</strong> based on your schedule</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-500 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Spaced repetition</strong> for better retention</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Study Plan Progress */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 md:p-8 overflow-hidden">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-primary-500/0 via-accent-500/0 to-primary-500/0 hover:from-primary-500/5 hover:via-accent-500/5 hover:to-primary-500/5 transition-all duration-500 -z-10 blur-xl" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-primary-100 to-accent-100 dark:from-primary-900/30 dark:to-accent-900/30 rounded-2xl">
                    <TrendingUp className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Study Plan Progress</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Track your learning journey
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {Math.round(planProgress)}%
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {completedDays} of {days.length} days
                  </span>
                </div>
              </div>
              <ProgressBar
                value={planProgress}
                showPercentage={true}
                color="primary"
                size="lg"
              />
            </div>
          </div>
        </motion.div>

        {/* Chapter Progress */}
        {topics.length > 0 && !loadingTopics && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <ChapterProgress 
              chapters={topics} 
              subjectName={subjectName}
              onProgressUpdate={fetchTopicsWithProgress}
            />
          </motion.div>
        )}

        {/* Study Flow Visualization */}
        {topics.length > 0 && !loadingTopics && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <StudyFlowVisualization topics={topics} subjectName={subjectName} />
          </motion.div>
        )}

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8"
        >
          <motion.div
            whileHover={{ y: -8, scale: 1.02 }}
            className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden"
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-blue-500/0 group-hover:from-blue-500/10 group-hover:via-blue-500/5 group-hover:to-blue-500/10 transition-all duration-500 -z-10 blur-xl" />
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-2xl">
                <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Total Days</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{days.length}</p>
              </div>
            </div>
          </motion.div>
          <motion.div
            whileHover={{ y: -8, scale: 1.02 }}
            className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden"
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-500/0 via-purple-500/0 to-purple-500/0 group-hover:from-purple-500/10 group-hover:via-purple-500/5 group-hover:to-purple-500/10 transition-all duration-500 -z-10 blur-xl" />
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 rounded-2xl">
                <Clock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Avg Hours/Day</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {days.length > 0
                    ? (days.reduce((sum: number, day: PlanDay) => sum + (day.total_hours || 0), 0) / days.length).toFixed(1)
                    : '0'}
                </p>
              </div>
            </div>
          </motion.div>
          <motion.div
            whileHover={{ y: -8, scale: 1.02 }}
            className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden"
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-green-500/0 via-green-500/0 to-green-500/0 group-hover:from-green-500/10 group-hover:via-green-500/5 group-hover:to-green-500/10 transition-all duration-500 -z-10 blur-xl" />
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-2xl">
                <Target className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Total Activities</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {days.reduce((sum: number, day: PlanDay) => sum + (day.activities?.length || 0), 0)}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Days List */}
        {days.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-12 text-center border border-gray-200/50 dark:border-gray-700/50"
          >
            <p className="text-gray-600 dark:text-gray-400">No days scheduled in this plan.</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="space-y-4"
          >
            {days.map((day: PlanDay, index: number) => {
              const dayDate = new Date(day.date)
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              const isPast = dayDate < today
              const isToday = dayDate.toDateString() === today.toDateString()
              const isCompleted = day.completed === true
              
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  whileHover={{ y: -8, scale: 1.01 }}
                  className={`group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-xl border-2 overflow-hidden transition-all duration-500 ${
                    isCompleted
                      ? 'border-green-500 dark:border-green-400 shadow-2xl shadow-green-500/30'
                      : isToday
                      ? 'border-primary-500 dark:border-primary-400 shadow-2xl shadow-primary-500/30'
                      : 'border-gray-200/50 dark:border-gray-700/50'
                  }`}
                >
                {/* Gradient border effect */}
                <div className={`absolute inset-0 rounded-3xl -z-10 blur-xl transition-opacity duration-500 ${
                  isCompleted
                    ? 'bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-green-500/20 opacity-100'
                    : isToday
                    ? 'bg-gradient-to-r from-primary-500/20 via-accent-500/20 to-primary-500/20 opacity-100'
                    : 'bg-gradient-to-r from-gray-500/5 via-gray-500/5 to-gray-500/5 opacity-0 group-hover:opacity-100'
                }`} />
                
                <div className={`px-6 md:px-8 py-5 border-b ${
                  isCompleted
                    ? 'bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 dark:from-green-900/30 dark:via-emerald-900/30 dark:to-green-900/30 border-green-200 dark:border-green-800'
                    : isToday
                    ? 'bg-gradient-to-r from-primary-50 via-accent-50 to-primary-50 dark:from-primary-900/30 dark:via-accent-900/30 dark:to-primary-900/30 border-primary-200 dark:border-primary-800'
                    : 'bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50 dark:from-gray-900/50 dark:via-gray-800/50 dark:to-gray-900/50 border-gray-200 dark:border-gray-700'
                }`}>
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      {isCompleted && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl cursor-pointer"
                          onClick={() => handleToggleDayCompletion(index)}
                          title="Click to mark as not completed"
                        >
                          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </motion.div>
                      )}
                      {!isCompleted && (
                        <button
                          onClick={() => handleToggleDayCompletion(index)}
                          className="p-2 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600"
                          title="Click to mark as completed"
                        >
                          <CheckCircle2 className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                        </button>
                      )}
                      {isToday && !isCompleted && (
                        <motion.div
                          animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="w-3 h-3 bg-primary-500 rounded-full shadow-lg shadow-primary-500/50"
                        />
                      )}
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          Day {index + 1} - {formatDate(day.date)}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
                          <span>{formatShortDate(day.date)}</span>
                          {isCompleted && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-semibold">
                              <CheckCircle2 className="h-3 w-3" />
                              Completed
                            </span>
                          )}
                          {isToday && !isCompleted && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-xs font-bold"
                            >
                              <Zap className="h-3 w-3" />
                              Today
                            </motion.span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                      <Clock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      <span className="font-bold text-gray-900 dark:text-white">{day.total_hours || 0}h</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 md:p-8">
                  {day.activities && day.activities.length > 0 ? (
                    <div className="space-y-3">
                      {day.activities.map((activity, actIndex) => (
                        <motion.div
                          key={actIndex}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + index * 0.05 + actIndex * 0.03 }}
                          whileHover={{ x: 4 }}
                          className="group/activity flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-all duration-300"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <motion.div
                              whileHover={{ scale: 1.1, rotate: 5 }}
                              className={`p-3 rounded-xl ${getActivityColor(activity.activity)}`}
                            >
                              {getActivityIcon(activity.activity)}
                            </motion.div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="font-semibold text-gray-900 dark:text-white text-base">
                                  {activity.topic}
                                </span>
                                <span className={`px-3 py-1 rounded-lg text-xs font-bold ${getActivityColor(activity.activity)}`}>
                                  {getActivityLabel(activity.activity)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
                            <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                            <span className="font-semibold text-gray-900 dark:text-white text-sm">{activity.hours}h</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500 dark:text-gray-400">
                        No activities scheduled for this day
                      </p>
                    </div>
                  )}
                </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </div>

      <ConfirmationDialog
        isOpen={confirmRegenerate}
        onClose={() => setConfirmRegenerate(false)}
        onConfirm={handleRegenerate}
        title="Regenerate Study Plan"
        message="This will replace your current study plan with a new one. Continue?"
        confirmText="Regenerate"
        cancelText="Cancel"
        variant="warning"
        isLoading={regenerating}
      />
    </div>
  )
}

export default function StudyPlanPage() {
  return (
    <ProtectedRoute>
      <StudyPlanContent />
    </ProtectedRoute>
  )
}

