'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { notesApi, topicsApi } from '@/lib/api'
import { Brain, Sparkles, CheckCircle2, AlertCircle, Loader2, Save, X } from 'lucide-react'

interface ExtractedTopic {
  title: string
  description?: string
  difficulty_level: number
  estimated_hours: number
  parent_topic_title?: string | null
}

interface TopicExtractionProps {
  noteId: string
  subjectId: string
  onExtractionComplete?: () => void
}

export default function TopicExtraction({
  noteId,
  subjectId,
  onExtractionComplete,
}: TopicExtractionProps) {
  const [extracting, setExtracting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [topics, setTopics] = useState<ExtractedTopic[]>([])
  const [error, setError] = useState<string | null>(null)
  const [extracted, setExtracted] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleExtract = async () => {
    setExtracting(true)
    setError(null)
    setSaved(false)

    // Show persistent loading toast for AI extraction
    const { ToastMessages, TOAST_IDS, getToastConfig } = await import('@/lib/constants/toast')
    const { dismissAndShowSuccess, dismissAndShowError } = await import('@/lib/utils/toast')
    const loadingToastId = toast.loading(
      ToastMessages.EXTRACTING_TOPICS,
      getToastConfig.persistentLoading(ToastMessages.EXTRACTING_TOPICS, TOAST_IDS.EXTRACTING_TOPICS)
    )

    try {
      const response = await notesApi.extractTopics(noteId, subjectId)
      setTopics(response.data.topics || [])
      setExtracted(true)
      
      // Dismiss loading toast and show success
      dismissAndShowSuccess(
        loadingToastId,
        ToastMessages.TOPICS_EXTRACTED(response.data.topics?.length || 0),
        TOAST_IDS.TOPICS_EXTRACTED
      )
    } catch (err: any) {
      // Dismiss loading toast and show error
      dismissAndShowError(loadingToastId, err, ToastMessages.GENERATION_FAILED)
      setError(err.response?.data?.detail || ToastMessages.GENERATION_FAILED)
    } finally {
      setExtracting(false)
    }
  }

  const handleSave = async () => {
    if (topics.length === 0) return

    setSaving(true)
    setError(null)

    try {
      await topicsApi.saveExtractedTopics(subjectId, topics)
      setSaved(true)
      
      // Show success toast
      const { ToastMessages, TOAST_IDS, getToastConfig } = await import('@/lib/constants/toast')
      toast.success(
        ToastMessages.TOPICS_SAVED(topics.length),
        getToastConfig.shortSuccess(ToastMessages.TOPICS_SAVED(topics.length), TOAST_IDS.TOPICS_SAVED)
      )
      
      if (onExtractionComplete) {
        onExtractionComplete()
      }
    } catch (err: any) {
      const { ToastMessages, TOAST_IDS, getToastConfig } = await import('@/lib/constants/toast')
      const { showErrorToast } = await import('@/lib/utils/toast')
      showErrorToast(err, ToastMessages.TOPICS_SAVE_FAILED, TOAST_IDS.TOPIC_SAVE_FAILED)
      setError(err.response?.data?.detail || ToastMessages.TOPICS_SAVE_FAILED)
    } finally {
      setSaving(false)
    }
  }

  const getDifficultyLabel = (level: number) => {
    const labels = ['', 'Easy', 'Medium', 'Intermediate', 'Hard', 'Very Hard']
    return labels[level] || 'Medium'
  }

  const getDifficultyColor = (level: number) => {
    if (level <= 1) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    if (level <= 2) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    if (level <= 3) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    if (level <= 4) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  }

  // Group topics by parent
  const mainTopics = topics.filter(t => !t.parent_topic_title)
  const topicsByParent = new Map<string, ExtractedTopic[]>()
  
  topics.filter(t => t.parent_topic_title).forEach(topic => {
    const parent = topic.parent_topic_title!
    if (!topicsByParent.has(parent)) {
      topicsByParent.set(parent, [])
    }
    topicsByParent.get(parent)!.push(topic)
  })

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="inline-flex p-2 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Extract Topics with AI
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Use AI to automatically extract topics and subtopics from your notes
            </p>
          </div>
        </div>
        {!extracted && !extracting && (
          <button
            onClick={handleExtract}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg font-medium hover:shadow-lg transition-all duration-300"
          >
            <Sparkles className="h-4 w-4" />
            Extract Topics
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-800 dark:text-red-300 font-medium">Error</p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {extracting && (
        <div className="text-center py-12" role="status" aria-live="polite">
          <Loader2 className="h-12 w-12 text-primary-600 dark:text-primary-400 animate-spin mx-auto mb-4" aria-hidden="true" />
          <p className="text-gray-700 dark:text-gray-300 font-medium">
            Analyzing your notes with AI...
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            This may take a few moments
          </p>
          <span className="sr-only">Extracting topics from note content. Please wait.</span>
        </div>
      )}

      {extracted && topics.length > 0 && !saved && (
        <>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Found {topics.length} {topics.length === 1 ? 'topic' : 'topics'}
              </p>
              <button
                onClick={handleSave}
                disabled={saving}
                aria-label={`Save ${topics.length} extracted topics`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Saving...</span>
                    <span className="sr-only">Saving topics to subject</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" aria-hidden="true" />
                    <span>Save Topics</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {mainTopics.map((topic, index) => {
                const subtopics = topicsByParent.get(topic.title) || []
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
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(topic.difficulty_level)}`}
                        >
                          {getDifficultyLabel(topic.difficulty_level)}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {topic.estimated_hours}h
                        </span>
                      </div>
                    </div>

                    {subtopics.length > 0 && (
                      <div className="mt-3 ml-4 space-y-2 border-l-2 border-primary-300 dark:border-primary-700 pl-4">
                        {subtopics.map((subtopic, subIndex) => (
                          <div
                            key={subIndex}
                            className="flex items-start justify-between"
                          >
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
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${getDifficultyColor(subtopic.difficulty_level)}`}
                              >
                                {getDifficultyLabel(subtopic.difficulty_level)}
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
          </div>
        </>
      )}

      {saved && (
        <div className="text-center py-8">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Topics saved successfully!
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {topics.length} topics have been added to your subject
          </p>
        </div>
      )}
    </div>
  )
}

