'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { notesApi, topicsApi, studyPlansApi, subjectsApi } from '@/lib/api'
import { Upload, FileText, CheckCircle2, XCircle, Loader2, RefreshCw, AlertCircle, Sparkles, Map } from 'lucide-react'
import toast from 'react-hot-toast'
import { TOAST_DURATIONS } from '@/lib/constants/toast'

interface FileUploadProps {
  subjectId?: string
  topicId?: string
  onUploadSuccess?: () => void
}

export default function FileUpload({
  subjectId,
  topicId,
  onUploadSuccess,
}: FileUploadProps) {
  const router = useRouter()
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [fileName, setFileName] = useState<string>('')
  const [uploadedNoteId, setUploadedNoteId] = useState<string | null>(null)
  const [embeddingsStored, setEmbeddingsStored] = useState<boolean | null>(null)
  const [reindexing, setReindexing] = useState(false)
  const [extractingTopics, setExtractingTopics] = useState(false)
  const [topicsExtracted, setTopicsExtracted] = useState(false)
  const [extractedTopicsCount, setExtractedTopicsCount] = useState<number | null>(null)
  const [roadmapReady, setRoadmapReady] = useState(false)
  const [generatingRoadmap, setGeneratingRoadmap] = useState(false)
  const [generatedPlanId, setGeneratedPlanId] = useState<string | null>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      await handleFile(e.target.files[0])
    }
  }

  const handleFile = async (file: File) => {
    const allowedTypes = ['.pdf', '.txt', '.md', '.markdown']
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase()

    if (!allowedTypes.includes(fileExt)) {
      setUploadStatus('error')
      setTimeout(() => setUploadStatus('idle'), 3000)
      return
    }

    setFileName(file.name)
    setUploading(true)
    setProgress(0)
    setUploadStatus('idle')

    try {
      // Simulate progress (in real app, use axios onUploadProgress)
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const response = await notesApi.upload(file, subjectId, topicId)

      clearInterval(progressInterval)
      setProgress(100)
      setUploadStatus('success')
      
      // Store note ID and embedding status
      if (response.data) {
        setUploadedNoteId(response.data.id)
        setEmbeddingsStored(response.data.embeddings_stored || false)
        
        // Check if study plan was automatically generated
        if (response.data.study_plan?.generated && response.data.study_plan?.plan_id) {
          setGeneratedPlanId(response.data.study_plan.plan_id)
          setRoadmapReady(true)
        } else if (response.data.study_plan?.error) {
          console.warn('Study plan generation error:', response.data.study_plan.error)
        }
      }

      // Show toast notification using centralized constants
      const { ToastMessages, TOAST_IDS, getToastConfig, TOAST_DURATIONS } = await import('@/lib/constants/toast')
      
      if (response.data?.embeddings_stored) {
        toast.success(
          ToastMessages.UPLOAD_SUCCESS_WITH_EMBEDDINGS,
          getToastConfig.standardSuccess(ToastMessages.UPLOAD_SUCCESS_WITH_EMBEDDINGS, TOAST_IDS.FILE_UPLOADED)
        )
      } else {
        toast.success(
          ToastMessages.UPLOAD_SUCCESS,
          {
            ...getToastConfig.standardSuccess(ToastMessages.UPLOAD_SUCCESS, TOAST_IDS.FILE_UPLOADED),
            icon: '⚠️',
          }
        )
        toast('Embeddings not indexed. Click "Re-index Embeddings" to enable semantic search.', {
          duration: TOAST_DURATIONS.LONG,
          icon: 'ℹ️',
        })
      }
      
      // Show notification about generated study roadmap
      if (response.data?.study_plan?.generated && response.data.study_plan?.plan_id) {
        toast.success(
          '🎯 Study roadmap generated successfully!',
          {
            duration: TOAST_DURATIONS.LONG,
            icon: '🎯',
            action: {
              label: 'View Roadmap',
              onClick: () => router.push(`/study-plans/plan/${response.data.study_plan.plan_id}`)
            }
          }
        )
      } else if (response.data?.study_plan && !response.data.study_plan.generated) {
        // Subject ID was provided but study plan wasn't generated (probably no topics)
        toast('💡 Tip: Extract topics from your notes to generate a study roadmap automatically.', {
          duration: TOAST_DURATIONS.LONG,
          icon: '💡',
        })
      }

      // If study plan was already generated, skip topic extraction
      // The backend has already handled topic extraction and study plan generation
      if (response.data?.study_plan?.generated && response.data.study_plan?.plan_id) {
        // Study plan already generated - just reset UI after showing success
        setTimeout(() => {
          setUploading(false)
          setProgress(0)
          setUploadStatus('idle')
          setFileName('')
          setUploadedNoteId(null)
          setEmbeddingsStored(null)
          if (onUploadSuccess) {
            onUploadSuccess()
          }
        }, 3000)
      } else if (subjectId && response.data?.id) {
        // Upload complete - don't auto-extract topics or generate roadmap
        // This makes upload much faster (2-5 seconds instead of 30-90 seconds)
        // Users can manually extract topics and generate roadmap from the notes page
        toast.success('📝 Note uploaded successfully!', {
          duration: 3000,
        })
        
        // Reset UI immediately - no need to wait
        setUploading(false)
        setProgress(0)
        setUploadStatus('idle')
        setFileName('')
        setUploadedNoteId(null)
        setEmbeddingsStored(null)
        if (onUploadSuccess) {
          onUploadSuccess()
        }
      } else {
        // Don't auto-redirect if embeddings failed - let user reindex
        if (response.data?.embeddings_stored) {
          setTimeout(() => {
            setUploading(false)
            setProgress(0)
            setUploadStatus('idle')
            setFileName('')
            setUploadedNoteId(null)
            setEmbeddingsStored(null)
            if (onUploadSuccess) {
              onUploadSuccess()
            }
          }, 3000) // Give more time to see status
        } else {
          // Keep success state visible if embeddings failed
          setUploading(false)
        }
      }
    } catch (error: any) {
      setUploadStatus('error')
      setUploading(false)
      setProgress(0)
      
      const { ToastMessages, TOAST_IDS, getToastConfig } = await import('@/lib/constants/toast')
      
      // Show dedicated network error toast if status === 0
      if (error.response?.status === 0 || error.isNetworkError || !error.response) {
        toast.error(ToastMessages.NETWORK_ERROR, getToastConfig.networkError())
      } else {
        const errorMessage = error.response?.data?.detail || error.message || ToastMessages.UPLOAD_ERROR
        toast.error(errorMessage, { 
          id: TOAST_IDS.UPLOAD_FAILED,
          duration: TOAST_DURATIONS.STANDARD,
        })
      }
      setTimeout(() => {
        setUploadStatus('idle')
        setFileName('')
        setUploadedNoteId(null)
        setEmbeddingsStored(null)
      }, 3000)
    }
  }

  // Removed handleAutoExtractTopics and handleAutoGenerateRoadmap
  // These functions caused slow uploads (40-120 seconds) and 504 timeouts
  // Users should manually extract topics and generate roadmap from the notes page
  // This makes uploads much faster (2-5 seconds)

  const handleReindex = async () => {
    if (!uploadedNoteId) return
    
    setReindexing(true)
    try {
      const response = await notesApi.reindexEmbeddings(uploadedNoteId)
      setEmbeddingsStored(response.data.embeddings_stored || false)
      
      if (response.data.embeddings_stored) {
        toast.success('Embeddings re-indexed successfully! Semantic search is now enabled.')
        // If successful, redirect after a moment
        setTimeout(() => {
          setUploadStatus('idle')
          setFileName('')
          setUploadedNoteId(null)
          setEmbeddingsStored(null)
          if (onUploadSuccess) {
            onUploadSuccess()
          }
        }, 1500)
      } else {
        toast.error('Failed to re-index embeddings. Please try again.')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to re-index embeddings. Please try again.')
    } finally {
      setReindexing(false)
    }
  }

  return (
    <motion.div
      className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
        dragActive
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30'
          : uploadStatus === 'success'
          ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
          : uploadStatus === 'error'
          ? 'border-red-500 bg-red-50 dark:bg-red-950/30'
          : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 hover:border-primary-400 dark:hover:border-primary-600'
      }`}
      animate={{
        scale: dragActive ? 1.02 : 1,
        y: dragActive ? -4 : 0,
      }}
      transition={{ duration: 0.2 }}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      {/* Drag overlay effect */}
      {dragActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-accent-500/20 rounded-2xl pointer-events-none"
        />
      )}
      <AnimatePresence mode="wait">
        {uploading ? (
          <motion.div
            key="uploading"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <Loader2 className="mx-auto h-12 w-12 text-primary-600 dark:text-primary-400 animate-spin mb-4" />
            <div className="mb-4">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2 overflow-hidden">
                <motion.div
                  className="bg-gradient-to-r from-primary-500 to-accent-500 h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {progress}% uploaded
              </p>
              {fileName && (
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1 truncate">
                  {fileName}
                </p>
              )}
            </div>
            <p className="text-gray-700 dark:text-gray-300 font-medium">
              Uploading file...
            </p>
          </motion.div>
        ) : uploadStatus === 'success' ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full"
          >
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <p className="text-green-700 dark:text-green-400 font-medium mb-4">
              Upload successful!
            </p>
            
            {/* Topic Extraction Status */}
            {subjectId && extractingTopics && !generatingRoadmap && (
              <div className="mt-4 mb-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                        Extracting topics from syllabus...
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                        AI is analyzing your content to identify topics
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Topics Extracted Status */}
            {topicsExtracted && !generatingRoadmap && extractedTopicsCount !== null && (
              <div className="mt-4 mb-4">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {extractedTopicsCount} topic{extractedTopicsCount > 1 ? 's' : ''} extracted and saved!
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Roadmap Generation Status */}
            {generatingRoadmap && (
              <div className="mt-4 mb-4">
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 text-purple-600 dark:text-purple-400 animate-spin" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-purple-800 dark:text-purple-300">
                        Generating your study roadmap...
                      </p>
                      <p className="text-xs text-purple-700 dark:text-purple-400 mt-1">
                        AI is creating a personalized study plan based on your notes
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {roadmapReady && generatedPlanId && (
              <div className="mt-4 mb-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-900/30 dark:to-accent-900/30 border-2 border-primary-200 dark:border-primary-800 rounded-lg p-4"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="inline-flex p-2 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg">
                      <Map className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-primary-900 dark:text-primary-200">
                        🎉 Study Roadmap Generated!
                      </p>
                      <p className="text-xs text-primary-700 dark:text-primary-400 mt-1">
                        Your personalized study plan is ready to view.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/study-plans/plan/${generatedPlanId}`)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-700 hover:to-accent-700 text-white rounded-lg text-sm font-semibold transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <Map className="h-4 w-4" />
                    <span>View Study Roadmap</span>
                  </button>
                </motion.div>
              </div>
            )}

            {/* Embedding Status */}
            {embeddingsStored !== null && !extractingTopics && !generatingRoadmap && (
              <div className="mt-4 space-y-3">
                {embeddingsStored ? (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm font-medium">Embeddings indexed for semantic search</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                    <div className="flex items-start gap-2 mb-3">
                      <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                          Embeddings not indexed
                        </p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-400">
                          Semantic search may not work for this note. Click below to re-index embeddings.
                        </p>
                      </div>
                    </div>
                    {uploadedNoteId && (
                      <button
                        onClick={handleReindex}
                        disabled={reindexing}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {reindexing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Re-indexing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4" />
                            Re-index Embeddings
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        ) : uploadStatus === 'error' ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <p className="text-red-700 dark:text-red-400 font-medium mb-2">
              Upload failed
            </p>
            <p className="text-sm text-red-600 dark:text-red-500">
              Please try again with a valid file type
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="inline-flex p-4 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl mb-6">
              <Upload className="h-8 w-8 text-white" />
            </div>
            <div className="mb-4">
              <label
                htmlFor="file-upload"
                className="cursor-pointer inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-semibold text-lg transition-colors"
              >
                Click to upload
              </label>
              <span className="text-gray-600 dark:text-gray-400 mx-2">or</span>
              <span className="text-gray-600 dark:text-gray-400 font-medium">
                drag and drop
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
              PDF, TXT, MD, MARKDOWN (MAX. 10MB)
            </p>
            <div className="flex items-center justify-center gap-6 text-xs text-gray-400 dark:text-gray-600">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>PDF Files</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>Text Files</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>Markdown</span>
              </div>
            </div>
            <input
              id="file-upload"
              type="file"
              className="hidden"
              accept=".pdf,.txt,.md,.markdown"
              onChange={handleChange}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
