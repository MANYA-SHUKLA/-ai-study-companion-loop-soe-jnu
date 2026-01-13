'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { subjectsApi, studyPlansApi } from '@/lib/api'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/components/AuthProvider'
import { Calendar, BookOpen, ArrowRight, Plus, Clock, Sparkles, Target, CheckCircle2, TrendingUp, Zap, Map, List } from 'lucide-react'
import EmptyState from '@/components/EmptyState'
import SkeletonLoader from '@/components/SkeletonLoader'

interface Subject {
  id: string
  name: string
  description?: string
  exam_date?: string
}

interface StudyPlan {
  id: string
  subject_id: string
  is_active: boolean
  created_at: string
  start_date: string
  end_date: string
  plan_data?: {
    days?: any[]
    start_date?: string
    end_date?: string
  }
  subjects?: {
    id: string
    name: string
  }
}

function StudyPlansContent() {
  const router = useRouter()
  const { user, session, loading: authLoading } = useAuth()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [studyPlans, setStudyPlans] = useState<Record<string, StudyPlan[]>>({})
  const [allPlans, setAllPlans] = useState<StudyPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingPlans, setLoadingPlans] = useState<Record<string, boolean>>({})
  const [loadingAllPlans, setLoadingAllPlans] = useState(false)
  const [viewMode, setViewMode] = useState<'subjects' | 'roadmaps'>('roadmaps')
  const isFetchingSubjectsRef = useRef(false)

  const fetchStudyPlans = useCallback(async (subjectId: string) => {
    // Set loading state - use functional update to check and set atomically
    setLoadingPlans(prev => {
      // If already loading, don't start another fetch
      if (prev[subjectId]) return prev
      return { ...prev, [subjectId]: true }
    })
    
    try {
      const response = await studyPlansApi.getBySubject(subjectId)
      const plansData = response.data
      // Ensure we always set an array (backend now always returns array)
      const plansArray = Array.isArray(plansData) ? plansData : (plansData ? [plansData] : [])
      setStudyPlans(prev => ({
        ...prev,
        [subjectId]: plansArray
      }))
    } catch (error: any) {
      // Only log non-404 errors (404 means subject not found or no plans, which is expected)
      if (error.response?.status !== 404) {
        console.error(`Error fetching study plans for subject ${subjectId}:`, error)
      }
      // Always set empty array on error (graceful degradation)
      setStudyPlans(prev => ({
        ...prev,
        [subjectId]: []
      }))
    } finally {
      setLoadingPlans(prev => {
        // Only set to false if we're the one that set it to true
        if (prev[subjectId]) {
          return { ...prev, [subjectId]: false }
        }
        return prev
      })
    }
  }, []) // Empty dependencies - function is stable and doesn't need to recreate

  const fetchAllStudyPlans = useCallback(async () => {
    setLoadingAllPlans(true)
    try {
      const response = await studyPlansApi.getAll()
      const plansData = response.data || []
      setAllPlans(Array.isArray(plansData) ? plansData : [])
    } catch (error: any) {
      console.error('Error fetching all study plans:', error)
      setAllPlans([])
    } finally {
      setLoadingAllPlans(false)
    }
  }, [])

  const fetchSubjects = useCallback(async () => {
    // Prevent multiple simultaneous calls using ref
    if (isFetchingSubjectsRef.current) return
    isFetchingSubjectsRef.current = true
    setLoading(true)
    
    try {
      const response = await subjectsApi.getAll()
      const fetchedSubjects = response.data
      setSubjects(fetchedSubjects)
      
      // Fetch study plans for all subjects (don't await - fire and forget)
      fetchedSubjects.forEach((subject: Subject) => {
        fetchStudyPlans(subject.id)
      })
      
      // Also fetch all study plans for roadmaps view
      fetchAllStudyPlans()
    } catch (error: any) {
      // Log network errors in detail
      if (!error.response) {
        console.error('Network error fetching subjects:', {
          message: error.message,
          code: error.code,
          config: error.config ? {
            url: error.config.url,
            baseURL: error.config.baseURL,
            method: error.config.method
          } : null
        })
        // Network error - backend might not be reachable
        if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
          console.error('⚠️ Cannot connect to backend. Make sure:')
          console.error('1. Backend is running on http://localhost:8000')
          console.error('2. Check backend logs for errors')
          console.error('3. Try: curl http://localhost:8000/health')
        }
      } else if (error.response?.status === 401) {
        // 401 is expected if not authenticated - don't log as error
        // The API interceptor will handle this
      } else {
        // Other HTTP errors
        console.error('Error fetching subjects:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        })
      }
    } finally {
      setLoading(false)
      isFetchingSubjectsRef.current = false
    }
  }, [fetchStudyPlans, fetchAllStudyPlans]) // Keep dependencies - they're now stable

  useEffect(() => {
    // Only fetch subjects if user is authenticated
    if (!authLoading && (user || session)) {
      fetchSubjects()
    } else if (!authLoading && !user && !session) {
      // If not authenticated and not loading, stop loading state
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, session, authLoading]) // Remove fetchSubjects from dependencies to prevent infinite loop

  const subjectImages = [
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&h=600&fit=crop&q=80',
  ]

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
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                className="p-3 bg-white/20 backdrop-blur-md rounded-2xl"
              >
                <Target className="h-8 w-8 text-white" />
              </motion.div>
              <div>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-2 drop-shadow-2xl">
                  Study Plans
                </h1>
                <p className="text-xl md:text-2xl text-white/90 font-medium">
                  AI-powered personalized roadmaps to success
                </p>
              </div>
            </div>
            {subjects.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-6 text-white/80"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  <span className="text-sm font-medium">
                    {subjects.length} {subjects.length === 1 ? 'Subject' : 'Subjects'} Available
                  </span>
                </div>
                {Object.values(studyPlans).flat().length > 0 && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {Object.values(studyPlans).flat().length} Active {Object.values(studyPlans).flat().length === 1 ? 'Plan' : 'Plans'}
                    </span>
                  </div>
                )}
              </motion.div>
            )}
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
        {/* View Toggle */}
        {!loading && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex items-center justify-between"
          >
            <div className="flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-1 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
              <button
                onClick={() => setViewMode('roadmaps')}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-2 ${
                  viewMode === 'roadmaps'
                    ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Map className="h-4 w-4" />
                All Roadmaps {!loadingAllPlans && `(${allPlans.length})`}
              </button>
              {subjects.length > 0 && (
                <button
                  onClick={() => setViewMode('subjects')}
                  className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-2 ${
                    viewMode === 'subjects'
                      ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-lg'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <BookOpen className="h-4 w-4" />
                  By Subject
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Roadmaps View - Show all study plans */}
        {!loading && viewMode === 'roadmaps' && (
          <>
            {loadingAllPlans ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonLoader key={i} variant="card" />
                ))}
              </div>
            ) : allPlans.length === 0 ? (
              <EmptyState
                icon={Target}
                title="No study roadmaps yet"
                description="Generate your first study roadmap by creating a study plan for any subject. Upload notes and let AI create a personalized daily roadmap for you."
                actionLabel="View Subjects"
                actionHref="/subjects"
              />
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {allPlans.map((plan, index) => {
                  const planData = typeof plan.plan_data === 'string' 
                    ? JSON.parse(plan.plan_data) 
                    : plan.plan_data || {}
                  const days = planData.days || []
                  const subjectName = plan.subjects?.name || 'Unknown Subject'
                  const totalDays = days.length
                  
                  return (
                    <motion.div
                      key={plan.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.6, ease: "easeOut" }}
                      whileHover={{ y: -8 }}
                      className="group"
                    >
                      <Link href={`/study-plans/plan/${plan.id}`}>
                        <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 border border-gray-200/50 dark:border-gray-700/50 overflow-hidden h-full flex flex-col cursor-pointer">
                          {/* Gradient border effect on hover */}
                          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-accent-500/0 via-primary-500/0 to-accent-500/0 group-hover:from-accent-500/20 group-hover:via-primary-500/10 group-hover:to-accent-500/20 transition-all duration-500 -z-10 blur-xl" />
                          
                          {/* Header */}
                          <div className="relative h-32 bg-gradient-to-br from-primary-600 via-primary-700 to-accent-600 p-6">
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                            <div className="relative z-10">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <h3 className="text-xl font-bold text-white mb-1 line-clamp-1">
                                    {subjectName}
                                  </h3>
                                  <p className="text-sm text-white/80">Study Roadmap</p>
                                </div>
                                {plan.is_active && (
                                  <div className="flex items-center gap-1 px-2 py-1 bg-green-500/90 backdrop-blur-md rounded-lg border border-green-400/30">
                                    <CheckCircle2 className="h-3 w-3 text-white" />
                                    <span className="text-xs font-semibold text-white">Active</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 p-6 flex flex-col">
                            <div className="flex-1 mb-4">
                              <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border border-blue-200 dark:border-blue-800">
                                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                                    {totalDays}
                                  </div>
                                  <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                    Days
                                  </div>
                                </div>
                                <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl border border-purple-200 dark:border-purple-800">
                                  <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                                    {days.reduce((sum: number, day: any) => sum + (day.total_hours || 0), 0).toFixed(1)}
                                  </div>
                                  <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                                    Total Hours
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                  <Calendar className="h-4 w-4" />
                                  <span>
                                    {new Date(plan.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(plan.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                  <Clock className="h-4 w-4" />
                                  <span>Created {new Date(plan.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                </div>
                              </div>
                            </div>

                            {/* View Button */}
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                              <div className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-xl font-semibold text-sm hover:from-primary-700 hover:to-accent-700 transition-all group/btn">
                                <Target className="h-4 w-4" />
                                <span>View Roadmap</span>
                                <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* Subjects View - Original view */}
        {!loading && viewMode === 'subjects' && (
          <>
            {subjects.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No subjects yet"
                description="Create a subject and upload notes to generate your first study plan. AI will create a personalized roadmap based on your exam date and available study time."
                actionLabel="Add Subject"
                actionHref="/subjects/new"
              />
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {subjects.map((subject, index) => {
              const subjectImage = subjectImages[index % subjectImages.length]
              const plansData = studyPlans[subject.id]
              // Ensure plans is always an array - defensive check
              let plans: StudyPlan[] = []
              if (Array.isArray(plansData)) {
                plans = plansData
              } else if (plansData) {
                // If it's a single object, wrap it in an array
                plans = [plansData]
              }
              // Safe to use .find() now since plans is guaranteed to be an array
              const activePlan = plans.find(p => p && p.is_active) || null
              const isLoadingPlan = loadingPlans[subject.id]
              
              return (
                <motion.div
                  key={subject.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.6, ease: "easeOut" }}
                  whileHover={{ y: -8 }}
                  className="group"
                >
                  <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 border border-gray-200/50 dark:border-gray-700/50 overflow-hidden h-full flex flex-col">
                    {/* Gradient border effect on hover */}
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-accent-500/0 via-primary-500/0 to-accent-500/0 group-hover:from-accent-500/20 group-hover:via-primary-500/10 group-hover:to-accent-500/20 transition-all duration-500 -z-10 blur-xl" />
                    
                    {/* Image Header */}
                    <div className="relative h-40 overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary-600/20 to-accent-600/20" />
                      <img
                        src={subjectImage}
                        alt={subject.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      
                      {/* Status Badge */}
                      <div className="absolute top-4 right-4">
                        {isLoadingPlan ? (
                          <div className="h-8 w-20 bg-white/20 backdrop-blur-md rounded-xl animate-pulse" />
                        ) : activePlan ? (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/90 backdrop-blur-md rounded-xl border border-green-400/30">
                            <CheckCircle2 className="h-4 w-4 text-white" />
                            <span className="text-xs font-semibold text-white">Active Plan</span>
                          </div>
                        ) : plans.length > 0 ? (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/90 backdrop-blur-md rounded-xl border border-blue-400/30">
                            <Calendar className="h-4 w-4 text-white" />
                            <span className="text-xs font-semibold text-white">{plans.length} Plan{plans.length !== 1 ? 's' : ''}</span>
                          </div>
                        ) : null}
                      </div>
                      
                      {/* Icon */}
                      <div className="absolute bottom-4 left-4 p-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30">
                        <BookOpen className="h-6 w-6 text-white" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6 flex flex-col">
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                          {subject.name}
                        </h3>

                        {subject.description && (
                          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed">
                            {subject.description}
                          </p>
                        )}

                        {/* Exam Date */}
                        {subject.exam_date && (
                          <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 rounded-xl border border-gray-200 dark:border-gray-600">
                            <Calendar className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Exam: {new Date(subject.exam_date).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        )}

                        {/* Study Plan Info */}
                        {activePlan && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800"
                          >
                            <div className="flex items-center gap-2 text-sm">
                              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                              <span className="text-green-700 dark:text-green-300 font-medium">
                                Active study plan running
                              </span>
                            </div>
                            <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                              {new Date(activePlan.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(activePlan.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                          </motion.div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2 mt-4">
                        {activePlan ? (
                          <Link
                            href={`/study-plans/plan/${activePlan.id}`}
                            className="group/btn flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 font-semibold shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 hover:scale-105"
                          >
                            <Target className="h-4 w-4" />
                            <span>View Active Plan</span>
                            <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                          </Link>
                        ) : (
                          <Link
                            href={`/study-plans/${subject.id}/generate`}
                            className="group/btn flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-primary-600 via-primary-600 to-accent-600 text-white rounded-xl hover:from-primary-700 hover:via-primary-700 hover:to-accent-700 transition-all duration-300 font-semibold shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 hover:scale-105 overflow-hidden relative"
                          >
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-primary-700 to-accent-700 opacity-0 group-hover/btn:opacity-100 transition-opacity"
                            />
                            <Sparkles className="h-4 w-4 relative z-10" />
                            <span className="relative z-10">Generate Study Plan</span>
                            <Zap className="h-4 w-4 relative z-10 group-hover/btn:scale-110 transition-transform" />
                          </Link>
                        )}
                        
                        {plans.length > 0 && !activePlan && (
                          <Link
                            href={`/study-plans/${subject.id}/generate`}
                            className="text-center text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors py-2"
                          >
                            View {plans.length} previous {plans.length === 1 ? 'plan' : 'plans'} or create new
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
              })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function StudyPlansPage() {
  return (
    <ProtectedRoute>
      <StudyPlansContent />
    </ProtectedRoute>
  )
}

