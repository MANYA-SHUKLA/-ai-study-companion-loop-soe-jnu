'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { subjectsApi, topicsApi, notesApi } from '@/lib/api'
import { Plus, Edit, Trash2, Calendar, BookOpen, ArrowRight, Search, Sparkles, FileText, Layers, TrendingUp, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { TOAST_DURATIONS } from '@/lib/constants/toast'
import EmptyState from '@/components/EmptyState'
import { SubjectCardSkeleton } from '@/components/SkeletonLoader'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/components/AuthProvider'
import ConfirmationDialog from '@/components/ConfirmationDialog'

interface Subject {
  id: string
  name: string
  description?: string
  exam_date?: string
  created_at: string
}

interface SubjectStats {
  topicsCount: number
  notesCount: number
  studyPlansCount: number
}

function SubjectsContent() {
  const { user, session, loading: authLoading } = useAuth()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subjectStats, setSubjectStats] = useState<Record<string, SubjectStats>>({})
  const [loading, setLoading] = useState(true)
  const [loadingStats, setLoadingStats] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [deleting, setDeleting] = useState<Record<string, boolean>>({})
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null })

  const fetchSubjectStats = useCallback(async (subjectId: string) => {
    if (loadingStats[subjectId]) return
    
    setLoadingStats(prev => ({ ...prev, [subjectId]: true }))
    try {
      const [topicsRes, notesRes] = await Promise.allSettled([
        topicsApi.getBySubject(subjectId),
        notesApi.getBySubject(subjectId)
      ])
      
      const topicsCount = topicsRes.status === 'fulfilled' ? topicsRes.value.data?.length || 0 : 0
      const notesCount = notesRes.status === 'fulfilled' ? notesRes.value.data?.length || 0 : 0
      
      setSubjectStats(prev => ({
        ...prev,
        [subjectId]: {
          topicsCount,
          notesCount,
          studyPlansCount: 0 // Can be added later if needed
        }
      }))
    } catch (error) {
      console.error(`Error fetching stats for subject ${subjectId}:`, error)
    } finally {
      setLoadingStats(prev => ({ ...prev, [subjectId]: false }))
    }
  }, [loadingStats])

  const fetchSubjects = useCallback(async () => {
    try {
      const response = await subjectsApi.getAll()
      const fetchedSubjects = response.data
      setSubjects(fetchedSubjects)
      
      // Fetch stats for all subjects
      fetchedSubjects.forEach((subject: Subject) => {
        fetchSubjectStats(subject.id)
      })
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
    }
  }, [fetchSubjectStats])

  useEffect(() => {
    // Only fetch subjects if user is authenticated
    if (!authLoading && (user || session)) {
      fetchSubjects()
    } else if (!authLoading && !user && !session) {
      // If not authenticated and not loading, stop loading state
      setLoading(false)
    }
  }, [user, session, authLoading, fetchSubjects])

  const handleDeleteClick = (id: string) => {
    setConfirmDelete({ isOpen: true, id })
  }

  const handleDelete = async (id: string) => {
    // Double-click protection: prevent multiple simultaneous deletions
    if (deleting[id]) return
    setDeleting(prev => ({ ...prev, [id]: true }))
    setConfirmDelete({ isOpen: false, id: null })

    // Store original state for rollback
    const originalSubjects = [...subjects]
    
    // Optimistic update
    setSubjects(prev => prev.filter(s => s.id !== id))

    try {
      await subjectsApi.delete(id)
      
      // Success - fetch fresh data
      await fetchSubjects()
      
      const { ToastMessages, TOAST_IDS, getToastConfig } = await import('@/lib/constants/toast')
      toast.success(
        ToastMessages.SUBJECT_DELETED, 
        getToastConfig.shortSuccess(ToastMessages.SUBJECT_DELETED, TOAST_IDS.SUBJECT_DELETED)
      )
    } catch (error: any) {
      console.error('Error deleting subject:', error)
      
      // Rollback on error
      setSubjects(originalSubjects)
      
      const { ToastMessages, TOAST_IDS, getToastConfig } = await import('@/lib/constants/toast')
      
      // Show dedicated network error toast if status === 0
      if (error.response?.status === 0 || error.isNetworkError || !error.response) {
        toast.error(ToastMessages.NETWORK_ERROR, getToastConfig.networkError())
      } else {
        const errorMessage = error.response?.data?.detail || ToastMessages.DELETE_FAILED('subject')
        toast.error(errorMessage, { 
          id: TOAST_IDS.DELETE_FAILED,
          duration: TOAST_DURATIONS.STANDARD,
        })
      }
    } finally {
      setDeleting(prev => {
        const updated = { ...prev }
        delete updated[id]
        return updated
      })
    }
  }

  const filteredSubjects = subjects.filter(subject =>
    subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    subject.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
                <BookOpen className="h-8 w-8 text-white" />
              </motion.div>
              <div>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-2 drop-shadow-2xl">
                  Your Subjects
                </h1>
                <p className="text-xl md:text-2xl text-white/90 font-medium">
                  Organize, learn, and excel
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
                    {subjects.length} {subjects.length === 1 ? 'Subject' : 'Subjects'}
                  </span>
                </div>
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
        {/* Header Actions */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10"
        >
          <div className="flex-1 w-full sm:max-w-md">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
              <input
                type="text"
                placeholder="Search subjects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 rounded-2xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all text-gray-900 dark:text-white placeholder-gray-400 shadow-xl hover:shadow-2xl"
              />
            </div>
          </div>
          <Link
            href="/subjects/new"
            className="group relative px-6 py-3.5 bg-gradient-to-r from-primary-600 via-primary-600 to-accent-600 text-white rounded-2xl font-semibold shadow-xl shadow-primary-500/30 hover:shadow-2xl hover:shadow-primary-500/40 transition-all duration-300 hover:scale-105 flex items-center gap-2 whitespace-nowrap overflow-hidden"
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-primary-700 to-accent-700 opacity-0 group-hover:opacity-100 transition-opacity"
            />
            <Plus className="h-5 w-5 relative z-10" />
            <span className="relative z-10">New Subject</span>
            <ArrowRight className="h-4 w-4 relative z-10 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>

        {loading ? (
          <div className="grid gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <SubjectCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredSubjects.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title={searchQuery ? 'No subjects found' : 'No subjects yet'}
            description={searchQuery ? 'Try a different search term or create a new subject to get started.' : 'Get started by creating your first subject. Add your syllabus, extract topics, and generate personalized study plans.'}
            actionLabel={!searchQuery ? 'Add Subject' : undefined}
            actionHref={!searchQuery ? '/subjects/new' : undefined}
            secondaryActionLabel={searchQuery ? 'Clear Search' : undefined}
            secondaryActionHref={searchQuery ? '/subjects' : undefined}
          />
        ) : (
          <div className="grid gap-6 md:gap-8">
            {filteredSubjects.map((subject, index) => {
              const subjectImage = subjectImages[index % subjectImages.length]
              const stats = subjectStats[subject.id]
              const isLoadingStats = loadingStats[subject.id]
              
              return (
                <motion.div
                  key={subject.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08, duration: 0.6, ease: "easeOut" }}
                  whileHover={{ y: -4 }}
                  className="group"
                >
                  <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                    {/* Gradient border effect on hover */}
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-primary-500/0 via-primary-500/0 to-accent-500/0 group-hover:from-primary-500/20 group-hover:via-primary-500/10 group-hover:to-accent-500/20 transition-all duration-500 -z-10 blur-xl" />
                    
                    <div className="md:flex">
                      {/* Image Section */}
                      <div className="relative h-56 md:h-auto md:w-72 flex-shrink-0 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary-600/20 to-accent-600/20" />
                        <img
                          src={subjectImage}
                          alt={subject.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        <div className="absolute top-6 left-6 p-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30">
                          <BookOpen className="h-7 w-7 text-white" />
                        </div>
                        
                        {/* Stats overlay on image */}
                        {stats && !isLoadingStats && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute bottom-6 left-6 right-6 flex gap-3"
                          >
                            <div className="flex-1 bg-white/10 backdrop-blur-md rounded-xl px-3 py-2 border border-white/20">
                              <div className="flex items-center gap-2 text-white">
                                <Layers className="h-4 w-4" />
                                <span className="text-sm font-semibold">{stats.topicsCount}</span>
                                <span className="text-xs opacity-80">topics</span>
                              </div>
                            </div>
                            <div className="flex-1 bg-white/10 backdrop-blur-md rounded-xl px-3 py-2 border border-white/20">
                              <div className="flex items-center gap-2 text-white">
                                <FileText className="h-4 w-4" />
                                <span className="text-sm font-semibold">{stats.notesCount}</span>
                                <span className="text-xs opacity-80">notes</span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>

                      {/* Content Section */}
                      <div className="flex-1 p-8 md:p-10">
                        <div className="flex flex-col h-full">
                          <div className="flex-1">
                            <Link
                              href={`/subjects/${subject.id}`}
                              className="block group/link mb-4"
                            >
                              <h3 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3 group-hover/link:text-primary-600 dark:group-hover/link:text-primary-400 transition-colors">
                                {subject.name}
                              </h3>
                            </Link>
                            {subject.description && (
                              <p className="text-gray-600 dark:text-gray-400 mb-6 line-clamp-2 leading-relaxed text-lg">
                                {subject.description}
                              </p>
                            )}
                            
                            {/* Stats Row */}
                            {isLoadingStats ? (
                              <div className="flex items-center gap-4 mb-6">
                                <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                                <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                              </div>
                            ) : stats ? (
                              <div className="flex items-center gap-4 mb-6 flex-wrap">
                                <div className="flex items-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-900/20 rounded-xl border border-primary-200 dark:border-primary-800">
                                  <Layers className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                                  <span className="text-sm font-semibold text-primary-700 dark:text-primary-300">
                                    {stats.topicsCount} {stats.topicsCount === 1 ? 'Topic' : 'Topics'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-accent-50 dark:bg-accent-900/20 rounded-xl border border-accent-200 dark:border-accent-800">
                                  <FileText className="h-4 w-4 text-accent-600 dark:text-accent-400" />
                                  <span className="text-sm font-semibold text-accent-700 dark:text-accent-300">
                                    {stats.notesCount} {stats.notesCount === 1 ? 'Note' : 'Notes'}
                                  </span>
                                </div>
                              </div>
                            ) : null}
                            
                            <div className="flex items-center gap-6 flex-wrap">
                              {subject.exam_date && (
                                <motion.div
                                  whileHover={{ scale: 1.05 }}
                                  className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm"
                                >
                                  <Calendar className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                                  <span className="font-medium">
                                    Exam: {new Date(subject.exam_date).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                    })}
                                  </span>
                                </motion.div>
                              )}
                              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                <Clock className="h-4 w-4" />
                                <span>Created {new Date(subject.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex items-center justify-between gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <Link
                              href={`/subjects/${subject.id}`}
                              className="group/btn flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all duration-300 font-semibold shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 hover:scale-105"
                            >
                              <span>View Details</span>
                              <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                            </Link>
                            
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/subjects/${subject.id}/edit`}
                                className="p-3 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-all duration-200"
                                title="Edit"
                              >
                                <Edit className="h-5 w-5" />
                              </Link>
                              <button
                                onClick={() => handleDeleteClick(subject.id)}
                                disabled={deleting[subject.id]}
                                aria-label={`Delete subject: ${subject.name}`}
                                className="p-3 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                title={deleting[subject.id] ? "Deleting..." : "Delete subject"}
                              >
                                <Trash2 className="h-5 w-5" aria-hidden="true" />
                                {deleting[subject.id] && (
                                  <span className="sr-only">Deleting subject...</span>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      <ConfirmationDialog
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null })}
        onConfirm={() => confirmDelete.id && handleDelete(confirmDelete.id)}
        title="Delete Subject"
        message="Are you sure you want to delete this subject? This action cannot be undone and will delete all associated notes, topics, and study plans."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={confirmDelete.id ? deleting[confirmDelete.id] : false}
      />
    </div>
  )
}

export default function SubjectsPage() {
  return (
    <ProtectedRoute>
      <SubjectsContent />
    </ProtectedRoute>
  )
}
