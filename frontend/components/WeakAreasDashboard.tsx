'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { studyPlansApi } from '@/lib/api'
import { AlertTriangle, TrendingDown, Clock, Target, RefreshCw, BookOpen } from 'lucide-react'
import { showSuccessToast } from '@/lib/utils/toast'
import { ToastMessages, TOAST_IDS } from '@/lib/constants/toast'

interface WeakArea {
  topic_id: string
  topic_title: string
  mastery_score: number
  time_spent_minutes: number
  last_studied_at?: string
}

interface WeakAreasDashboardProps {
  subjectId: string
  studyPlanId?: string
}

export default function WeakAreasDashboard({ subjectId, studyPlanId }: WeakAreasDashboardProps) {
  const [weakAreas, setWeakAreas] = useState<WeakArea[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchWeakAreas()
  }, [subjectId])

  const fetchWeakAreas = async () => {
    try {
      const response = await studyPlansApi.getWeakAreas(subjectId)
      setWeakAreas(response.data.weak_areas || [])
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load weak areas. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePlan = async () => {
    if (!studyPlanId) return

    setUpdating(true)
    setError(null)

    try {
      const response = await studyPlansApi.updateWeakAreas(studyPlanId)
      // Show success message
      setError(null)
      showSuccessToast(
        response.data.message || ToastMessages.STUDY_PLAN_UPDATED,
        TOAST_IDS.STUDY_PLAN_UPDATED,
        'long'
      )
      // Optionally refresh the page or update UI
      window.location.reload()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update study plan. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  if (weakAreas.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            No Weak Areas
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Great job! You're performing well on all topics. Keep up the good work!
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-orange-200 dark:border-orange-800 overflow-hidden">
      <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 px-6 py-4 border-b border-orange-200 dark:border-orange-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Weak Areas Detected
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {weakAreas.length} {weakAreas.length === 1 ? 'topic' : 'topics'} need attention
              </p>
            </div>
          </div>
          {studyPlanId && (
            <button
              onClick={handleUpdatePlan}
              disabled={updating}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {updating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Update Study Plan
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="px-6 pt-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      <div className="p-6 space-y-4">
        {weakAreas.map((area) => (
          <div
            key={area.topic_id}
            className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {area.topic_title}
                </h4>
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span className="inline-flex items-center gap-1">
                    <TrendingDown className="h-4 w-4" />
                    {area.mastery_score.toFixed(0)}% mastery
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {area.time_spent_minutes} min
                  </span>
                  <span className="text-xs">
                    Last studied: {formatDate(area.last_studied_at)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-300"
                  style={{ width: `${area.mastery_score}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {studyPlanId && (
        <div className="px-6 pb-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-xs text-blue-800 dark:text-blue-300">
              💡 <strong>Tip:</strong> Click "Update Study Plan" to automatically add revision days and easier questions for these weak areas.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

