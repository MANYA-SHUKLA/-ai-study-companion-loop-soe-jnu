'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { notesApi, subjectsApi, studyPlansApi, topicsApi } from '@/lib/api'
import ProtectedRoute from '@/components/ProtectedRoute'
import TopicExtraction from '@/components/TopicExtraction'
import WeakAreasDashboard from '@/components/WeakAreasDashboard'
import EmptyState from '@/components/EmptyState'
import { ArrowLeft, FileText, Plus, Calendar, Trash2, BookOpen, Upload as UploadIcon, Brain, RefreshCw, CheckCircle2, AlertCircle, X, Target } from 'lucide-react'
import { motion } from 'framer-motion'
import LoadingSpinner from '@/components/LoadingSpinner'
import ErrorMessage from '@/components/ErrorMessage'
import { NoteCardSkeleton } from '@/components/SkeletonLoader'
import toast from 'react-hot-toast'
import { TOAST_DURATIONS } from '@/lib/constants/toast'
import ConfirmationDialog from '@/components/ConfirmationDialog'

interface Note {
  id: string
  title: string
  content: string
  file_type: string
  created_at: string
  topic_id?: string
  subject_id?: string
  embeddings_stored?: boolean
}

interface Subject {
  id: string
  name: string
  description?: string
}

function SubjectNotesContent() {
  const params = useParams()
  const router = useRouter()
  const subjectId = params.id as string
  const [notes, setNotes] = useState<Note[]>([])
  const [subject, setSubject] = useState<Subject | null>(null)
  const [loading, setLoading] = useState(true)
  const [studyPlanId, setStudyPlanId] = useState<string | null>(null)
  const [reindexing, setReindexing] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [extractingTopics, setExtractingTopics] = useState<Record<string, boolean>>({})
  const [extractedTopics, setExtractedTopics] = useState<Record<string, any[]>>({})
  const [showExtractModal, setShowExtractModal] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [deleting, setDeleting] = useState<Record<string, boolean>>({})
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null })
  const [reindexingAll, setReindexingAll] = useState(false)

  useEffect(() => {
    if (subjectId) {
      fetchSubject()
      fetchNotes()
    }
  }, [subjectId])

  // Refresh study plan when component becomes visible (handles back navigation)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && subjectId) {
        // Refresh study plan when page becomes visible
        fetchSubject()
      }
    }

    // Refresh when window gets focus (handles navigation back)
    const handleFocus = () => {
      if (subjectId) {
        fetchSubject()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [subjectId])

  const fetchSubject = async () => {
    try {
      const response = await subjectsApi.getById(subjectId)
      setSubject(response.data)
      
      // Try to get active study plan for this subject
      try {
        const planResponse = await studyPlansApi.getBySubject(subjectId)
        const plans = Array.isArray(planResponse.data) ? planResponse.data : [planResponse.data]
        const activePlan = plans.find((p: any) => p?.is_active) || plans[0]
        if (activePlan?.id) {
          setStudyPlanId(activePlan.id)
        }
      } catch {
        // No study plan yet, that's okay
      }
    } catch (error) {
      console.error('Error fetching subject:', error)
    }
  }

  const fetchNotes = async () => {
    try {
      const response = await notesApi.getBySubject(subjectId)
      setNotes(response.data)
    } catch (error: any) {
      // Error will be handled by UI state
      if (error.response?.status !== 401) {
        // Non-auth errors can be shown to user if needed
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = (noteId: string) => {
    setConfirmDelete({ isOpen: true, id: noteId })
  }

  const handleDelete = async (noteId: string) => {
    // Double-click protection: prevent multiple simultaneous deletions
    if (deleting[noteId]) return
    setDeleting(prev => ({ ...prev, [noteId]: true }))
    setConfirmDelete({ isOpen: false, id: null })

    // OPTIMISTIC UPDATE: Remove from UI immediately
    const noteToDelete = notes.find(note => note.id === noteId)
    const previousNotes = [...notes]
    setNotes(notes.filter(note => note.id !== noteId))

    try {
      await notesApi.delete(noteId)
      
      // Success - note already removed from UI
      const { ToastMessages, TOAST_IDS, getToastConfig } = await import('@/lib/constants/toast')
      toast.success(
        ToastMessages.NOTE_DELETED, 
        getToastConfig.shortSuccess(ToastMessages.NOTE_DELETED, TOAST_IDS.NOTE_DELETED)
      )
    } catch (error: any) {
      // ROLLBACK: Restore note on error
      setNotes(previousNotes)
      
      const { ToastMessages, TOAST_IDS, getToastConfig } = await import('@/lib/constants/toast')
      
      // Show dedicated network error toast if status === 0
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
        delete updated[noteId]
        return updated
      })
    }
  }

  const handleReindexAllEmbeddings = async () => {
    const notesNeedingReindex = notes.filter(note => !note.embeddings_stored)
    
    if (notesNeedingReindex.length === 0) {
      toast.success('All notes are already indexed!')
      return
    }
    
    setReindexingAll(true)
    try {
      const response = await notesApi.reindexAllEmbeddings(subjectId)
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

  const handleReindexEmbeddings = async (noteId: string) => {
    // Double-click protection: prevent multiple simultaneous reindex operations
    if (reindexing[noteId]) return
    
    setReindexing(prev => ({ ...prev, [noteId]: true }))
    setError(null)

    // Store original state for rollback
    const originalNotes = [...notes]

    try {
      const response = await notesApi.reindexEmbeddings(noteId)
      
      // Update note in state
      setNotes(notes.map(note => 
        note.id === noteId 
          ? { ...note, embeddings_stored: response.data.embeddings_stored }
          : note
      ))
      
      const { ToastMessages, TOAST_IDS, getToastConfig } = await import('@/lib/constants/toast')
      toast.success(
        ToastMessages.EMBEDDINGS_REINDEXED,
        getToastConfig.standardSuccess(ToastMessages.EMBEDDINGS_REINDEXED, TOAST_IDS.EMBEDDINGS_REINDEXED)
      )
    } catch (err: any) {
      // Rollback on error
      setNotes(originalNotes)
      
      const { ToastMessages, TOAST_IDS, getToastConfig } = await import('@/lib/constants/toast')
      const { showErrorToast } = await import('@/lib/utils/toast')
      
      // Show dedicated network error toast if status === 0
      if (err.response?.status === 0 || err.isNetworkError || !err.response) {
        toast.error(ToastMessages.NETWORK_ERROR, getToastConfig.networkError())
      } else {
        showErrorToast(err, ToastMessages.UPLOAD_ERROR, TOAST_IDS.UPLOAD_FAILED)
      }
    } finally {
      setReindexing(prev => {
        const updated = { ...prev }
        delete updated[noteId]
        return updated
      })
    }
  }

  const handleExtractTopics = async (noteId: string) => {
    setExtractingTopics({ ...extractingTopics, [noteId]: true })
    setError(null)
    setShowExtractModal({ ...showExtractModal, [noteId]: true })

    try {
      const response = await notesApi.extractTopics(noteId, subjectId)
      const topics = response.data.topics || []
      setExtractedTopics({ ...extractedTopics, [noteId]: topics })
      if (topics.length > 0) {
        toast.success(`Extracted ${topics.length} topic${topics.length > 1 ? 's' : ''} from note`)
      } else {
        toast('No topics found in this note', { icon: 'ℹ️' })
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to extract topics. Please try again.'
      setError(errorMsg)
      toast.error(errorMsg)
      setShowExtractModal({ ...showExtractModal, [noteId]: false })
    } finally {
      setExtractingTopics({ ...extractingTopics, [noteId]: false })
    }
  }

  const handleSaveExtractedTopics = async (noteId: string) => {
    const topics = extractedTopics[noteId] || []
    if (topics.length === 0) return

    setSaving({ ...saving, [noteId]: true })
    setError(null)

    try {
      await topicsApi.saveExtractedTopics(subjectId, topics)
      setExtractedTopics({ ...extractedTopics, [noteId]: [] })
      setShowExtractModal({ ...showExtractModal, [noteId]: false })
      toast.success(`Saved ${topics.length} topic${topics.length > 1 ? 's' : ''} to subject`)
      // Refresh to show new topics
      router.refresh()
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to save topics. Please try again.'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setSaving({ ...saving, [noteId]: false })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getFileTypeLabel = (fileType: string) => {
    return fileType.toUpperCase()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="inline-flex p-3 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {subject?.name || 'Subject Notes'}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {notes.length} {notes.length === 1 ? 'note' : 'notes'} uploaded
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {!loading && notes.filter(note => !note.embeddings_stored).length > 0 && (
                <button
                  onClick={handleReindexAllEmbeddings}
                  disabled={reindexingAll}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-600 to-yellow-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
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
              {studyPlanId ? (
                <Link
                  href={`/study-plans/plan/${studyPlanId}`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <Target className="h-5 w-5" />
                  View Study Roadmap
                </Link>
              ) : notes.length > 0 ? (
                <Link
                  href={`/study-plans/${subjectId}/generate`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <Brain className="h-5 w-5" />
                  Generate Study Roadmap
                </Link>
              ) : null}
              <Link
                href={`/notes/upload?subject_id=${subjectId}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <Plus className="h-5 w-5" />
                Upload Notes
              </Link>
            </div>
          </div>
        </div>

        {/* Weak Areas Dashboard */}
        {!loading && (
          <div className="mb-8">
            <WeakAreasDashboard subjectId={subjectId} studyPlanId={studyPlanId || undefined} />
          </div>
        )}

        {/* Notes List */}
        {loading ? (
          <div className="text-center py-20">
            <LoadingSpinner size="lg" text="Loading notes..." />
          </div>
        ) : notes.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No notes yet"
            description="Upload your syllabus or study materials to get started. You can extract topics and generate a study plan from your notes."
            actionLabel="Upload Notes"
            actionHref={`/notes/upload?subject_id=${subjectId}`}
          />
        ) : (
          <>
            {/* Error Message */}
            {error && (
              <div className="mb-6">
                <ErrorMessage message={error} type="error" />
              </div>
            )}

            {/* Topic Extraction Section */}
            {notes.length > 0 && (
              <div className="mb-8">
                <TopicExtraction
                  noteId={notes[0].id}
                  subjectId={subjectId}
                  onExtractionComplete={() => {
                    router.refresh()
                  }}
                />
              </div>
            )}

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {notes.map((note, index) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -4 }}
                  className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200/50 dark:border-gray-700/50 overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="inline-flex p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                        <FileText className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Reindex Button */}
                        <button
                          onClick={() => handleReindexEmbeddings(note.id)}
                          disabled={reindexing[note.id]}
                          aria-label={`Reindex embeddings for ${note.title}`}
                          aria-disabled={reindexing[note.id]}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          title="Reindex embeddings for semantic search"
                        >
                          {reindexing[note.id] ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                              <span className="sr-only">Reindexing embeddings...</span>
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4" aria-hidden="true" />
                              <span className="sr-only">Reindex embeddings</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteClick(note.id)}
                          disabled={deleting[note.id]}
                          aria-label={`Delete note: ${note.title}`}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={deleting[note.id] ? "Deleting..." : "Delete note"}
                        >
                          <Trash2 className="h-5 w-5" aria-hidden="true" />
                          {deleting[note.id] && (
                            <span className="sr-only">Deleting note...</span>
                          )}
                        </button>
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                      {note.title}
                    </h3>

                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <span className="inline-flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {getFileTypeLabel(note.file_type)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(note.created_at)}
                      </span>
                    </div>

                    {/* Embeddings Status */}
                    <div className="mb-4">
                      {note.embeddings_stored ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg">
                          <CheckCircle2 className="h-3 w-3" />
                          Indexed for Search
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg">
                          <AlertCircle className="h-3 w-3" />
                          Not Indexed
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4">
                      {note.content.substring(0, 150)}...
                    </p>

                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        onClick={() => handleExtractTopics(note.id)}
                        disabled={extractingTopics[note.id]}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        title="Extract topics from this note"
                      >
                        {extractingTopics[note.id] ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Extracting...
                          </>
                        ) : (
                          <>
                            <Brain className="h-4 w-4" />
                            Extract Topics
                          </>
                        )}
                      </button>
                      <Link
                        href={`/notes/${note.id}`}
                        className="inline-flex items-center text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium text-sm transition-colors"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {/* Extract Topics Modal */}
        {Object.entries(showExtractModal).map(([noteId, show]) => {
          if (!show) return null
          const topics = extractedTopics[noteId] || []
          const note = notes.find(n => n.id === noteId)
          
          return (
            <div
              key={noteId}
              className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4"
              onClick={() => setShowExtractModal({ ...showExtractModal, [noteId]: false })}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              >
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                        <Brain className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          Extracted Topics
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {note?.title}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowExtractModal({ ...showExtractModal, [noteId]: false })}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  {topics.length === 0 ? (
                    <div className="text-center py-12">
                      <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">
                        No topics extracted yet. Click "Extract Topics" to analyze this note.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {topics.filter(t => !t.parent_topic_title).map((topic, index) => {
                        const subtopics = topics.filter(t => t.parent_topic_title === topic.title)
                        return (
                          <div
                            key={index}
                            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 dark:text-white">
                                  {topic.title}
                                </h4>
                                {topic.description && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {topic.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-3 ml-4">
                                <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                  Level {topic.difficulty_level}/5
                                </span>
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  {topic.estimated_hours}h
                                </span>
                              </div>
                            </div>
                            {subtopics.length > 0 && (
                              <div className="mt-3 ml-4 space-y-2 border-l-2 border-purple-300 dark:border-purple-700 pl-4">
                                {subtopics.map((subtopic, subIndex) => (
                                  <div key={subIndex} className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                        {subtopic.title}
                                      </p>
                                      {subtopic.description && (
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                          {subtopic.description}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 ml-3">
                                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                        Level {subtopic.difficulty_level}/5
                                      </span>
                                      <span className="text-xs text-gray-600 dark:text-gray-400">
                                        {subtopic.estimated_hours}h
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {topics.length > 0 && (
                  <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {topics.length} {topics.length === 1 ? 'topic' : 'topics'} extracted
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setShowExtractModal({ ...showExtractModal, [noteId]: false })}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveExtractedTopics(noteId)}
                        className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-medium hover:shadow-lg transition-all duration-300"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Save Topics
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )
        })}
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

export default function SubjectNotesPage() {
  return (
    <ProtectedRoute>
      <SubjectNotesContent />
    </ProtectedRoute>
  )
}

