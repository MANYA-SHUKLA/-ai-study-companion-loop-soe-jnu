'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { subjectsApi, notesApi, studyPlansApi } from '@/lib/api'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/components/AuthProvider'
import { 
  BookOpen, 
  Plus, 
  Calendar, 
  TrendingUp, 
  Target,
  FileText,
  Sparkles,
  ArrowRight,
  Clock,
  Award,
  BarChart3
} from 'lucide-react'
import LoadingSpinner from '@/components/LoadingSpinner'
import ErrorMessage from '@/components/ErrorMessage'
import { SubjectCardSkeleton } from '@/components/SkeletonLoader'
import EmptyState from '@/components/EmptyState'

interface Subject {
  id: string
  name: string
  description?: string
  exam_date?: string
  created_at: string
}


function FloatingParticles() {
  if (typeof window === 'undefined') return null
  
  return (
    <>
      {[...Array(6)].map((_, i) => {
        const randomX = Math.random() * window.innerWidth
        const randomY = Math.random() * 400
        const randomDelay = Math.random() * 2
        const randomDuration = 3 + Math.random() * 2
        
        return (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full"
            initial={{
              x: randomX,
              y: randomY,
              opacity: 0,
            }}
            animate={{
              y: [null, randomY - 100],
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: randomDuration,
              repeat: Infinity,
              delay: randomDelay,
              ease: "easeOut"
            }}
          />
        )
      })}
    </>
  )
}

function DashboardContent() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [notesCount, setNotesCount] = useState(0)
  const [studyPlansCount, setStudyPlansCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Only fetch subjects when user is authenticated
    if (user) {
      fetchDashboardData()
    }
  }, [user])

  const fetchDashboardData = async () => {
    try {
      // Add a small delay to ensure session is ready after login
      const justLoggedIn = typeof window !== 'undefined' && 
        sessionStorage.getItem('just_logged_in') === 'true'
      
      if (justLoggedIn) {
        // Wait a bit longer for session to be fully initialized
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      // Fetch subjects
      const subjectsResponse = await subjectsApi.getAll()
      setSubjects(subjectsResponse.data)
      
      // Fetch notes count
      try {
        const notesResponse = await notesApi.getAll()
        setNotesCount(notesResponse.data?.length || 0)
      } catch (notesError) {
        console.error('Error fetching notes:', notesError)
        setNotesCount(0)
      }
      
      // Fetch study plans count for all subjects
      try {
        let totalPlans = 0
        for (const subject of subjectsResponse.data) {
          try {
            const planResponse = await studyPlansApi.getBySubject(subject.id)
            const plans = Array.isArray(planResponse.data) ? planResponse.data : (planResponse.data ? [planResponse.data] : [])
            if (plans.length > 0) {
              totalPlans++
            }
          } catch (planError) {
            // Subject might not have a plan, that's okay
            if ((planError as any).response?.status !== 404) {
              console.error(`Error fetching plan for subject ${subject.id}:`, planError)
            }
          }
        }
        setStudyPlansCount(totalPlans)
      } catch (plansError) {
        console.error('Error fetching study plans:', plansError)
        setStudyPlansCount(0)
      }
      
      setError(null)
      setLoading(false)
    } catch (error: any) {
      // If it's a 401, check if we just logged in - if so, retry once
      if (error.response?.status === 401) {
        const justLoggedIn = typeof window !== 'undefined' && 
          (sessionStorage.getItem('just_logged_in') === 'true' ||
           (parseInt(sessionStorage.getItem('login_timestamp') || '0') > 0 && 
            (Date.now() - parseInt(sessionStorage.getItem('login_timestamp') || '0')) < 30000))
        
        if (justLoggedIn) {
          // Retry once after a delay
          console.log('401 error after login, retrying after delay...')
          setTimeout(async () => {
            try {
              await fetchDashboardData()
            } catch (retryError: any) {
              // If retry also fails, let the interceptor handle it
              console.error('Retry also failed:', retryError)
              setLoading(false)
            }
          }, 2000)
          return // Don't set loading to false yet, wait for retry
        }
        // If not just logged in, the interceptor will handle redirect
      } else {
        setError(error.response?.data?.detail || 'Failed to load dashboard data. Please refresh the page.')
      }
      setLoading(false)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
      },
    },
  }

  const stats = [
    {
      label: 'Active Subjects',
      value: subjects.length,
      icon: BookOpen,
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      label: 'Upcoming Exams',
      value: subjects.filter(s => s.exam_date && new Date(s.exam_date) > new Date()).length,
      icon: Calendar,
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      label: 'Study Plans',
      value: studyPlansCount,
      icon: Target,
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      label: 'Notes Uploaded',
      value: notesCount,
      icon: FileText,
      gradient: 'from-orange-500 to-red-500',
    },
  ]

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 pt-20">
      {/* Animated Floating Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
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
          className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-br from-blue-400/30 via-purple-400/30 to-pink-400/30 rounded-full blur-3xl"
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
          className="absolute bottom-20 right-20 w-[500px] h-[500px] bg-gradient-to-br from-purple-400/30 via-pink-400/30 to-indigo-400/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, 60, 0],
            y: [0, -40, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-1/2 left-1/2 w-80 h-80 bg-gradient-to-br from-cyan-400/20 via-blue-400/20 to-purple-400/20 rounded-full blur-3xl"
        />
      </div>

      {/* Hero Header */}
      <div className="relative h-96 overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-accent-600">
        {/* Background Image with Parallax Effect */}
        <motion.div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1920&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/85 via-primary-800/90 to-accent-900/85" />
        
        {/* Animated Grid Pattern */}
        <motion.div 
          className="absolute inset-0 opacity-10"
          animate={{
            opacity: [0.1, 0.15, 0.1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"
            }}
          />
        </motion.div>

        {/* Floating Particles */}
        {mounted ? <FloatingParticles /> : null}

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <div className="w-full">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 mb-4"
            >
              <motion.div
                animate={{ 
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                className="text-5xl"
              >
                👋
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl md:text-6xl font-bold text-white mb-3 drop-shadow-2xl"
              >
                Welcome Back!
              </motion.h1>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl md:text-2xl text-white/90 font-medium"
            >
              Here's your study overview and progress
            </motion.p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-20 pb-12">
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

        {/* Stats Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
        >
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ 
                  y: -12, 
                  scale: 1.05,
                  rotateY: 5,
                }}
                className="group relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all duration-500 border border-gray-200/50 dark:border-gray-700/50 overflow-hidden"
              >
                {/* Animated gradient background on hover */}
                <motion.div 
                  className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500`}
                  animate={{
                    backgroundPosition: ['0% 0%', '100% 100%'],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "linear"
                  }}
                />
                
                {/* Shine effect on hover */}
                <motion.div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100"
                  initial={{ x: '-100%' }}
                  whileHover={{ x: '100%' }}
                  transition={{ duration: 0.6 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
                </motion.div>
                
                {/* Icon with enhanced animation */}
                <motion.div 
                  whileHover={{ 
                    scale: 1.15, 
                    rotate: [0, -10, 10, -10, 0],
                  }}
                  transition={{
                    rotate: { duration: 0.5 }
                  }}
                  className={`relative inline-flex p-4 bg-gradient-to-br ${stat.gradient} rounded-2xl mb-4 shadow-lg group-hover:shadow-2xl transition-all duration-300`}
                >
                  <Icon className="h-7 w-7 text-white" />
                  {/* Glow effect */}
                  <motion.div
                    className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} rounded-2xl blur-xl opacity-0 group-hover:opacity-50`}
                    animate={{
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                </motion.div>
                
                <motion.div 
                  className="relative text-4xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors"
                  animate={{
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: index * 0.2,
                    ease: "easeInOut"
                  }}
                >
                  {stat.value}
                </motion.div>
                <div className="relative text-sm text-gray-600 dark:text-gray-400 font-medium">
                  {stat.label}
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Quick Actions</h2>
              <p className="text-gray-600 dark:text-gray-400">Get started with these actions</p>
            </div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
            <Link
              href="/subjects/new"
                className="group relative px-6 py-3 bg-gradient-to-r from-primary-600 via-primary-700 to-accent-600 text-white rounded-xl font-semibold shadow-lg shadow-primary-500/50 hover:shadow-xl hover:shadow-primary-500/70 transition-all duration-300 flex items-center gap-2 overflow-hidden"
              >
                {/* Animated gradient background */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-primary-500 via-purple-500 to-accent-500"
                  animate={{
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                />
                {/* Shine effect */}
                <motion.div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100"
                  initial={{ x: '-100%' }}
                  whileHover={{ x: '100%' }}
                  transition={{ duration: 0.6 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12" />
                </motion.div>
                <span className="relative z-10 flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Subject
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
            </Link>
            </motion.div>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { 
                href: '/notes/upload', 
                icon: FileText, 
                label: 'Upload Notes',
                gradient: 'from-blue-500/20 via-purple-500/20 to-pink-500/20',
                image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80'
              },
              { 
                href: '/study-plans', 
                icon: Target, 
                label: 'Study Plans',
                gradient: 'from-purple-500/20 via-pink-500/20 to-red-500/20',
                image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80'
              },
              { 
                href: '/subjects', 
                icon: TrendingUp, 
                label: 'All Subjects',
                gradient: 'from-green-500/20 via-emerald-500/20 to-teal-500/20',
                image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80'
              },
            ].map((action, index) => {
              const Icon = action.icon
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                >
                  <Link
                    href={action.href}
                    className="group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-xl hover:shadow-2xl transition-all duration-500 border border-gray-200 dark:border-gray-700 block"
                  >
                    {/* Background Image with Overlay */}
                    <div className="relative h-40 overflow-hidden">
                      <motion.div
                        className="absolute inset-0"
                        style={{
                          backgroundImage: `url(${action.image})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                        whileHover={{ scale: 1.1 }}
                        transition={{ duration: 0.5 }}
                      />
                      <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient}`} />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300" />
                      
                      {/* Icon with animation */}
                      <motion.div
                        className="relative h-full flex items-center justify-center"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                      >
                        <div className="relative z-10 p-4 bg-white/20 dark:bg-gray-900/30 backdrop-blur-md rounded-2xl border border-white/30">
                          <Icon className="h-10 w-10 text-white" />
                  </div>
                      </motion.div>
                      
                      {/* Shine effect */}
                      <motion.div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100"
                        initial={{ x: '-100%' }}
                        whileHover={{ x: '100%' }}
                        transition={{ duration: 0.6 }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12" />
                      </motion.div>
                    </div>
                    <div className="p-5">
                      <motion.div 
                        className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors"
                        whileHover={{ x: 4 }}
                      >
                        {action.label}
                        <ArrowRight className="inline-block h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </motion.div>
                  </div>
                </Link>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Subjects Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Your Subjects</h2>
          
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <SubjectCardSkeleton key={i} />
              ))}
            </div>
          ) : subjects.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No subjects yet"
              description="Get started by creating your first subject. Upload your syllabus and let AI create a personalized study plan for you."
              actionLabel="Add Subject"
              actionHref="/subjects/new"
            />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map((subject, index) => (
                <motion.div
                  key={subject.id}
                  initial={{ opacity: 0, y: 30, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ 
                    delay: index * 0.1,
                    type: "spring",
                    stiffness: 100,
                    damping: 15
                  }}
                  whileHover={{ 
                    y: -12, 
                    scale: 1.02,
                    rotateY: 2,
                  }}
                  className="group"
                >
                  <Link href={`/subjects/${subject.id}`}>
                    <div className="relative h-full bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 border border-gray-200 dark:border-gray-700">
                      {/* Background gradient on hover */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-br from-primary-500/10 via-purple-500/10 to-accent-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                        animate={{
                          backgroundPosition: ['0% 0%', '100% 100%'],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          repeatType: "reverse",
                          ease: "linear"
                        }}
                      />
                      
                      {/* Shine effect */}
                      <motion.div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100"
                        initial={{ x: '-100%' }}
                        whileHover={{ x: '100%' }}
                        transition={{ duration: 0.7 }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
                      </motion.div>
                      
                      <div className="relative p-6">
                        <div className="flex items-start justify-between mb-4">
                          <motion.div 
                            className="inline-flex p-4 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl shadow-lg group-hover:shadow-2xl transition-all duration-300"
                            whileHover={{ 
                              scale: 1.1, 
                              rotate: [0, -5, 5, -5, 0],
                            }}
                            transition={{
                              rotate: { duration: 0.5 }
                            }}
                          >
                            <BookOpen className="h-6 w-6 text-white" />
                            {/* Glow effect */}
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl blur-xl opacity-0 group-hover:opacity-50"
                              animate={{
                                scale: [1, 1.2, 1],
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                            />
                          </motion.div>
                          {subject.exam_date && (
                            <motion.div 
                              className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-600"
                              whileHover={{ scale: 1.05 }}
                            >
                              <Calendar className="h-4 w-4" />
                              {new Date(subject.exam_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </motion.div>
                          )}
                        </div>
                        
                        <motion.h3 
                          className="text-xl font-bold mb-2 text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors"
                          whileHover={{ x: 4 }}
                        >
                          {subject.name}
                        </motion.h3>
                        
                        {subject.description && (
                          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                            {subject.description}
                          </p>
                        )}
                        
                        <motion.div 
                          className="flex items-center text-primary-600 dark:text-primary-400 font-medium text-sm group-hover:gap-2 transition-all"
                          whileHover={{ x: 4 }}
                        >
                          View Details
                          <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-2 transition-transform duration-300" />
                        </motion.div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}
