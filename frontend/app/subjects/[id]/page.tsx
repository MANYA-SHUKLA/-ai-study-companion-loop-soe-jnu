'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { subjectsApi, notesApi, topicsApi, studyPlansApi } from '@/lib/api'
import ProtectedRoute from '@/components/ProtectedRoute'
import LoadingSpinner from '@/components/LoadingSpinner'
import ErrorMessage from '@/components/ErrorMessage'
import { 
  ArrowLeft, 
  BookOpen, 
  FileText, 
  Calendar, 
  Target, 
  Upload as UploadIcon,
  Plus,
  TrendingUp,
  Clock,
  Brain,
  Edit,
  ArrowRight,
  Zap,
  Star,
  Layers
} from 'lucide-react'

interface Subject {
  id: string
  name: string
  description?: string
  exam_date?: string
  created_at: string
}

function SubjectDetailContent() {
  const params = useParams()
  const router = useRouter()
  const subjectId = params.id as string
  const [subject, setSubject] = useState<Subject | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    notesCount: 0,
    topicsCount: 0,
    hasStudyPlan: false,
    studyPlanId: null as string | null
  })

  useEffect(() => {
    if (subjectId) {
      fetchData()
    }
  }, [subjectId])

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch subject
      const subjectResponse = await subjectsApi.getById(subjectId)
      setSubject(subjectResponse.data)

      // Fetch stats in parallel
      const [notesResponse, topicsResponse, studyPlanResponse] = await Promise.allSettled([
        notesApi.getBySubject(subjectId),
        topicsApi.getBySubject(subjectId),
        studyPlansApi.getBySubject(subjectId)
      ])

      // Process notes count
      if (notesResponse.status === 'fulfilled') {
        setStats(prev => ({ ...prev, notesCount: notesResponse.value.data?.length || 0 }))
      }

      // Process topics count
      if (topicsResponse.status === 'fulfilled') {
        setStats(prev => ({ ...prev, topicsCount: topicsResponse.value.data?.length || 0 }))
      }

      // Process study plan
      if (studyPlanResponse.status === 'fulfilled') {
        const plans = studyPlanResponse.value.data || []
        const activePlan = Array.isArray(plans) ? plans.find((p: any) => p.is_active) : null
        setStats(prev => ({ 
          ...prev, 
          hasStudyPlan: plans.length > 0,
          studyPlanId: activePlan?.id || (Array.isArray(plans) && plans.length > 0 ? plans[0].id : null)
        }))
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load subject. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading subject..." />
      </div>
    )
  }

  if (error && !subject) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <ErrorMessage message={error} type="error" />
          <Link
            href="/subjects"
            className="mt-4 inline-flex items-center text-primary-600 dark:text-primary-400 hover:underline"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Subjects
          </Link>
        </div>
      </div>
    )
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const daysUntilExam = subject?.exam_date 
    ? Math.ceil((new Date(subject.exam_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null

  const subjectImages = [
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&h=600&fit=crop&q=80',
  ]
  const subjectImage = subjectImages[parseInt(subjectId.slice(-1), 16) % subjectImages.length]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Hero Header */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-accent-600">
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
              backgroundImage: 'linear-gradient(135deg, oklch(0.50 0.30 250), oklch(0.55 0.30 320), oklch(0.50 0.30 250))',
              backgroundSize: '200% 200%',
            }}
          />
        </div>
        
        {/* Background image overlay */}
        <div className="absolute inset-0">
          <img
            src={subjectImage}
            alt={subject?.name}
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary-900/80 to-accent-900/80" />
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
              href="/subjects"
              className="inline-flex items-center text-white/80 hover:text-white mb-6 transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Subjects
            </Link>
            
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  className="p-3 bg-white/20 backdrop-blur-md rounded-2xl"
                >
                  <BookOpen className="h-8 w-8 text-white" />
                </motion.div>
                <div>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-2 drop-shadow-2xl">
                    {subject?.name || 'Subject'}
                  </h1>
                  {subject?.description && (
                    <p className="text-xl text-white/90 font-medium">
                      {subject.description}
                    </p>
                  )}
                </div>
              </div>
              <Link
                href={`/subjects/${subjectId}/edit`}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-white/20 backdrop-blur-md border border-white/30 rounded-xl hover:bg-white/30 transition-all flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Link>
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
            <ErrorMessage message={error} onDismiss={() => setError(null)} type="error" />
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ y: -8, scale: 1.02 }}
            className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden"
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-blue-500/0 group-hover:from-blue-500/10 group-hover:via-blue-500/5 group-hover:to-blue-500/10 transition-all duration-500 -z-10 blur-xl" />
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-2xl">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              {stats.notesCount}
            </div>
            <div className="text-sm font-semibold text-gray-600 dark:text-gray-400">
              Notes
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ y: -8, scale: 1.02 }}
            className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden"
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-500/0 via-purple-500/0 to-purple-500/0 group-hover:from-purple-500/10 group-hover:via-purple-500/5 group-hover:to-purple-500/10 transition-all duration-500 -z-10 blur-xl" />
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 rounded-2xl">
                <Layers className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              {stats.topicsCount}
            </div>
            <div className="text-sm font-semibold text-gray-600 dark:text-gray-400">
              Topics
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ y: -8, scale: 1.02 }}
            className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden"
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-green-500/0 via-green-500/0 to-green-500/0 group-hover:from-green-500/10 group-hover:via-green-500/5 group-hover:to-green-500/10 transition-all duration-500 -z-10 blur-xl" />
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-2xl">
                <Target className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              {stats.hasStudyPlan ? '1' : '0'}
            </div>
            <div className="text-sm font-semibold text-gray-600 dark:text-gray-400">
              Study Plan{stats.hasStudyPlan ? '' : 's'}
            </div>
          </motion.div>

          {subject?.exam_date && daysUntilExam !== null && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden"
            >
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-orange-500/0 via-orange-500/0 to-orange-500/0 group-hover:from-orange-500/10 group-hover:via-orange-500/5 group-hover:to-orange-500/10 transition-all duration-500 -z-10 blur-xl" />
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 rounded-2xl">
                  <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                {daysUntilExam > 0 ? daysUntilExam : daysUntilExam === 0 ? '0' : Math.abs(daysUntilExam)}
              </div>
              <div className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                {daysUntilExam > 0 ? 'Days Left' : daysUntilExam === 0 ? 'Today!' : 'Days Ago'}
              </div>
            </motion.div>
          )}
        </div>

        {/* Exam Date Card */}
        {subject?.exam_date && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="relative bg-gradient-to-r from-primary-600 via-primary-700 to-accent-600 rounded-3xl p-6 md:p-8 mb-8 text-white shadow-2xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary-500/50 to-accent-500/50 opacity-0 hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  className="p-4 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30"
                >
                  <Calendar className="h-8 w-8" />
                </motion.div>
                <div>
                  <div className="text-sm font-semibold opacity-90 mb-1">Exam Date</div>
                  <div className="text-3xl md:text-4xl font-bold mb-2">{formatDate(subject.exam_date)}</div>
                  {daysUntilExam !== null && (
                    <div className="flex items-center gap-2 text-sm font-medium opacity-90">
                      {daysUntilExam > 0 ? (
                        <>
                          <Clock className="h-4 w-4" />
                          <span>{daysUntilExam} day{daysUntilExam !== 1 ? 's' : ''} remaining</span>
                        </>
                      ) : daysUntilExam === 0 ? (
                        <>
                          <Zap className="h-4 w-4" />
                          <span>Exam is today!</span>
                        </>
                      ) : (
                        <>
                          <Clock className="h-4 w-4" />
                          <span>Exam was {Math.abs(daysUntilExam)} day{Math.abs(daysUntilExam) !== 1 ? 's' : ''} ago</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link href={`/subjects/${subjectId}/notes`}>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-gray-200/50 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-500 cursor-pointer overflow-hidden"
            >
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-blue-500/0 group-hover:from-blue-500/10 group-hover:via-blue-500/5 group-hover:to-blue-500/10 transition-all duration-500 -z-10 blur-xl" />
              <div className="flex items-center gap-4 mb-4">
                <div className="p-4 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-2xl">
                  <FileText className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Notes</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                View and manage your study notes
              </p>
              <div className="flex items-center text-blue-600 dark:text-blue-400 font-semibold group-hover:translate-x-2 transition-transform">
                View Notes
                <ArrowRight className="h-5 w-5 ml-2" />
              </div>
            </motion.div>
          </Link>

          <Link href={stats.hasStudyPlan && stats.studyPlanId ? `/study-plans/plan/${stats.studyPlanId}` : `/study-plans/${subjectId}/generate`}>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-gray-200/50 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-500 cursor-pointer overflow-hidden"
            >
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-500/0 via-purple-500/0 to-purple-500/0 group-hover:from-purple-500/10 group-hover:via-purple-500/5 group-hover:to-purple-500/10 transition-all duration-500 -z-10 blur-xl" />
              <div className="flex items-center gap-4 mb-4">
                <div className="p-4 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 rounded-2xl">
                  <Target className="h-7 w-7 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Study Plan</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                {stats.hasStudyPlan ? 'View your personalized study plan' : 'Generate a personalized study plan'}
              </p>
              <div className="flex items-center text-purple-600 dark:text-purple-400 font-semibold group-hover:translate-x-2 transition-transform">
                {stats.hasStudyPlan ? 'View Plan' : 'Generate Plan'}
                <ArrowRight className="h-5 w-5 ml-2" />
              </div>
            </motion.div>
          </Link>
        </div>

        {/* Upload Notes Quick Action */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-gray-200/50 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden"
        >
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-primary-500/0 via-primary-500/0 to-accent-500/0 group-hover:from-primary-500/10 group-hover:via-primary-500/5 group-hover:to-accent-500/10 transition-all duration-500 -z-10 blur-xl" />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="p-4 bg-gradient-to-br from-primary-100 to-accent-100 dark:from-primary-900/30 dark:to-accent-900/30 rounded-2xl"
              >
                <UploadIcon className="h-7 w-7 text-primary-600 dark:text-primary-400" />
              </motion.div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  Upload New Notes
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Add study materials to this subject
                </p>
              </div>
            </div>
            <Link
              href={`/notes/upload?subject_id=${subjectId}`}
              className="group/btn relative px-6 py-3.5 bg-gradient-to-r from-primary-600 via-primary-600 to-accent-600 text-white rounded-xl font-semibold shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all duration-300 hover:scale-105 flex items-center gap-2 overflow-hidden"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-primary-700 to-accent-700 opacity-0 group-hover/btn:opacity-100 transition-opacity"
              />
              <Plus className="h-5 w-5 relative z-10" />
              <span className="relative z-10">Upload Notes</span>
              <Zap className="h-4 w-4 relative z-10 group-hover/btn:scale-110 transition-transform" />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default function SubjectDetailPage() {
  return (
    <ProtectedRoute>
      <SubjectDetailContent />
    </ProtectedRoute>
  )
}

