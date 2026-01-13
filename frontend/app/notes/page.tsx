'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { notesApi, subjectsApi } from '@/lib/api'
import { FileText, Plus, Trash2, Search, Sparkles, BookOpen, Calendar, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { TOAST_DURATIONS } from '@/lib/constants/toast'
import EmptyState from '@/components/EmptyState'
import { SubjectCardSkeleton } from '@/components/SkeletonLoader'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/components/AuthProvider'
import ConfirmationDialog from '@/components/ConfirmationDialog'

interface Note {
  id: string
  title: string
  content: string
  file_type: string
  subject_id?: string
  topic_id?: string
  created_at: string
  embeddings_stored?: boolean
}

interface Subject {
  id: string
  name: string
}

function NotesContent() {
  const { user, session, loading: authLoading } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [subjects, setSubjects] = useState<Record<string, Subject>>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleting, setDeleting] = useState<Record<string, boolean>>({})
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null })
  const [reindexingAll, setReindexingAll] = useState(false)

  const fetchNotes = useCallback(async () => {
    try {
      console.log('📋 Fetching notes...')
      const response = await notesApi.getAll()
      console.log('📋 Notes API response:', response)
      const notesData = response.data || []
      console.log(`📋 Found ${notesData.length} notes:`, notesData)
      setNotes(notesData)
      
      // Fetch subject names for notes that have subject_id
      const subjectIds = Array.from(new Set(notesData.map((note: any) => note.subject_id).filter(Boolean)))
      if (subjectIds.length > 0) {
        try {
          const subjectsResponse = await subjectsApi.getAll()
          const subjectsData = subjectsResponse.data || []
          const subjectsMap: Record<string, Subject> = {}
          subjectsData.forEach((subject: Subject) => {
            subjectsMap[subject.id] = subject
          })
          setSubjects(subjectsMap)
        } catch (error) {
          console.error('Error fetching subjects:', error)
        }
      }
    } catch (error: any) {
      console.error('❌ ERROR FETCHING NOTES')
      console.error('=====================================')
      
      // Log network errors in detail
      if (!error.response) {
        console.error('Network error fetching notes:', {
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
          
          // Show user-friendly error
          toast.error('Cannot connect to server. Please make sure the backend is running.')
        }
      } else if (error.response?.status === 401) {
        console.error('❌ Authentication error - not authenticated or token invalid')
        console.error('   Status:', error.response.status)
        console.error('   Detail:', error.response.data?.detail)
        // 401 is handled by the API interceptor - user will be redirected to login
      } else {
        // Other HTTP errors
        console.error('HTTP error fetching notes:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        })
        
        if (error.response?.status === 500) {
          toast.error('Server error. Please try again or contact support.')
        }
      }
      
      console.error('Full error:', error)
      console.error('=====================================')

    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Only fetch notes if user is authenticated
    if (!authLoading && (user || session)) {
      fetchNotes()
    } else if (!authLoading && !user && !session) {
      // If not authenticated and not loading, stop loading state
      setLoading(false)
    }
  }, [user, session, authLoading, fetchNotes])

  const handleDeleteClick = (id: string) => {
    setConfirmDelete({ isOpen: true, id })
  }

  const handleReindexAll = async () => {
    const notesNeedingReindex = notes.filter(note => !note.embeddings_stored)
    
    if (notesNeedingReindex.length === 0) {
      toast.success('All notes are already indexed!')
      return
    }
    
    setReindexingAll(true)
    try {
      const response = await notesApi.reindexAllEmbeddings()
      const { reindexed_count, failed_count } = response.data
      
      if (reindexed_count > 0) {
        toast.success(`Successfully re-indexed ${reindexed_count} note${reindexed_count > 1 ? 's' : ''}!`)
      }
      if (failed_count > 0) {
        toast.error(`Failed to re-index ${failed_count} note${failed_count > 1 ? 's' : ''}. Please try again.`)
      }
      
      // Refresh notes to update embedding status
      await fetchNotes()
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Failed to re-index embeddings. Please try again.'
      toast.error(errorMsg)
    } finally {
      setReindexingAll(false)
    }
  }

  const handleDelete = async (id: string) => {
    // Double-click protection
    if (deleting[id]) return
    setDeleting(prev => ({ ...prev, [id]: true }))
    setConfirmDelete({ isOpen: false, id: null })

    // Store original state for rollback
    const originalNotes = [...notes]
    
    // Optimistic update
    setNotes(prev => prev.filter(n => n.id !== id))

    try {
      await notesApi.delete(id)
      
      // Success - fetch fresh data
      await fetchNotes()
      
      const { ToastMessages, TOAST_IDS, getToastConfig } = await import('@/lib/constants/toast')
      toast.success(
        ToastMessages.NOTE_DELETED, 
        getToastConfig.shortSuccess(ToastMessages.NOTE_DELETED, TOAST_IDS.NOTE_DELETED)
      )
    } catch (error: any) {
      console.error('Error deleting note:', error)
      
      // Rollback on error
      setNotes(originalNotes)
      
      const { ToastMessages, TOAST_IDS, getToastConfig } = await import('@/lib/constants/toast')
      
      if (error.response?.status === 0 || error.isNetworkError || !error.response) {
        toast.error(ToastMessages.NETWORK_ERROR, getToastConfig.networkError())
      } else {
        const errorMessage = error.response?.data?.detail || ToastMessages.DELETE_FAILED('note')
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

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (note.subject_id && subjects[note.subject_id]?.name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType?.toLowerCase()) {
      case 'pdf':
        return '📄'
      case 'md':
      case 'markdown':
        return '📝'
      case 'txt':
        return '📋'
      default:
        return '📄'
    }
  }

  const getFileTypeLabel = (fileType: string) => {
    return fileType?.toUpperCase() || 'FILE'
  }

  return (
    <div className="min-h-screen pt-20">
      {/* Hero Header */}
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-accent-600">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1920&h=600&fit=crop&q=80"
            alt="Notes background"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary-900/80 to-accent-900/80" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">
              All Notes
            </h1>
            <p className="text-xl text-white/90">View and manage all your study notes</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 -mt-8 relative z-20">
        {/* Header Actions */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8"
        >
          <div className="flex-1 w-full sm:max-w-md">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-gray-900 dark:text-white placeholder-gray-400 shadow-lg"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!loading && notes.filter(note => !note.embeddings_stored).length > 0 && (
              <button
                onClick={handleReindexAll}
                disabled={reindexingAll}
                className="group relative px-6 py-3 bg-gradient-to-r from-yellow-600 to-yellow-700 text-white rounded-xl font-semibold shadow-lg shadow-yellow-500/50 hover:shadow-xl hover:shadow-yellow-500/50 transition-all duration-300 hover:scale-105 flex items-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {reindexingAll ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Re-indexing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-5 w-5" />
                    Re-index All ({notes.filter(note => !note.embeddings_stored).length})
                  </>
                )}
              </button>
            )}
            <Link
              href="/notes/upload"
              className="group relative px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl font-semibold shadow-lg shadow-primary-500/50 hover:shadow-xl hover:shadow-primary-500/50 transition-all duration-300 hover:scale-105 flex items-center gap-2 whitespace-nowrap"
            >
              <Plus className="h-5 w-5" />
              Upload Note
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </motion.div>

        {loading ? (
          <div className="grid gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <SubjectCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredNotes.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title={searchQuery ? 'No notes found' : 'No notes yet'}
            description={searchQuery ? 'Try a different search term or upload a new note.' : 'Get started by uploading your first note. Upload PDFs, text files, or markdown documents to begin organizing your study materials.'}
            actionLabel={!searchQuery ? 'Upload Note' : undefined}
            actionHref={!searchQuery ? '/notes/upload' : undefined}
            secondaryActionLabel={searchQuery ? 'Clear Search' : undefined}
            secondaryActionHref={searchQuery ? '/notes' : undefined}
          />
        ) : (
          <div className="grid gap-6">
            {filteredNotes.map((note, index) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.5 }}
                whileHover={{ scale: 1.02 }}
                className="group"
              >
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="inline-flex p-3 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex-shrink-0">
                          <FileText className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
                            {note.title}
                          </h3>
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium">
                              <span>{getFileTypeIcon(note.file_type)}</span>
                              {getFileTypeLabel(note.file_type)}
                            </span>
                            {note.subject_id && subjects[note.subject_id] && (
                              <Link
                                href={`/subjects/${note.subject_id}`}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-lg text-sm font-medium hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors"
                              >
                                <BookOpen className="h-4 w-4" />
                                {subjects[note.subject_id].name}
                              </Link>
                            )}
                            <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                              <Calendar className="h-4 w-4" />
                              {new Date(note.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </div>
                            {note.embeddings_stored && (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium">
                                <span>✓</span>
                                Indexed
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {note.subject_id && (
                          <Link
                            href={`/subjects/${note.subject_id}/notes`}
                            className="px-4 py-2 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-xl hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors font-medium text-sm flex items-center gap-2"
                          >
                            View
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        )}
                        <button
                          onClick={() => handleDeleteClick(note.id)}
                          disabled={deleting[note.id]}
                          aria-label={`Delete note: ${note.title}`}
                          className="p-2.5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={deleting[note.id] ? "Deleting..." : "Delete note"}
                        >
                          <Trash2 className="h-5 w-5" aria-hidden="true" />
                          {deleting[note.id] && (
                            <span className="sr-only">Deleting note...</span>
                          )}
                        </button>
                      </div>
                    </div>
                    {note.content && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3 leading-relaxed">
                        {note.content.substring(0, 200)}...
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <ConfirmationDialog
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null })}
        onConfirm={() => confirmDelete.id && handleDelete(confirmDelete.id)}
        title="Delete Note"
        message="Are you sure you want to delete this note? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={confirmDelete.id ? deleting[confirmDelete.id] : false}
      />
    </div>
  )
}

export default function NotesPage() {
  return (
    <ProtectedRoute>
      <NotesContent />
    </ProtectedRoute>
  )
}

