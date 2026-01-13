'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, CheckCircle2, Clock, Target, Check, X } from 'lucide-react'
import ProgressBar from './ProgressBar'
import { topicsApi } from '@/lib/api'
import toast from 'react-hot-toast'

interface Chapter {
  id: string
  title: string
  description?: string
  mastery_score?: number
  completion_percentage?: number
  is_weak_area?: boolean
  time_spent_minutes?: number
  last_studied_at?: string
}

interface ChapterProgressProps {
  chapters: Chapter[]
  subjectName?: string
  onProgressUpdate?: () => void
}

export default function ChapterProgress({ chapters, subjectName, onProgressUpdate }: ChapterProgressProps) {
  const [updating, setUpdating] = useState<Record<string, boolean>>({})
  const [localChapters, setLocalChapters] = useState(chapters)
  
  const completedChapters = localChapters.filter(c => (c.completion_percentage || 0) >= 100).length
  const totalProgress = localChapters.length > 0
    ? localChapters.reduce((sum, c) => sum + (c.completion_percentage || 0), 0) / localChapters.length
    : 0

  const handleToggleCompletion = async (chapterId: string) => {
    if (updating[chapterId]) return
    
    setUpdating(prev => ({ ...prev, [chapterId]: true }))
    
    try {
      const response = await topicsApi.toggleCompletion(chapterId)
      
      // Update local state
      setLocalChapters(prev => prev.map(ch => 
        ch.id === chapterId 
          ? { 
              ...ch, 
              completion_percentage: response.data.completion_percentage,
              mastery_score: response.data.mastery_score
            }
          : ch
      ))
      
      // Show success toast
      const isCompleted = response.data.completed
      toast.success(
        isCompleted ? '✅ Marked as complete!' : '↩️ Marked as incomplete',
        { duration: 2000 }
      )
      
      // Notify parent to refresh if needed
      if (onProgressUpdate) {
        onProgressUpdate()
      }
    } catch (error: any) {
      console.error('Error toggling completion:', error)
      toast.error(
        error.response?.data?.detail || 'Failed to update completion status',
        { duration: 3000 }
      )
    } finally {
      setUpdating(prev => ({ ...prev, [chapterId]: false }))
    }
  }

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex p-2 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Chapter Progress
              </h3>
              {subjectName && (
                <p className="text-sm text-gray-600 dark:text-gray-400">{subjectName}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {completedChapters}/{chapters.length}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Completed</div>
          </div>
        </div>
        
        <ProgressBar
          value={totalProgress}
          label="Overall Progress"
          showPercentage={true}
          color="primary"
          size="lg"
        />
      </div>

      <div className="space-y-4">
        {localChapters.map((chapter, index) => {
          const isCompleted = (chapter.completion_percentage || 0) >= 100
          const isUpdating = updating[chapter.id]
          
          return (
            <motion.div
              key={chapter.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ x: 4 }}
              className="group relative p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 hover:bg-white dark:hover:bg-gray-800 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {chapter.title}
                    </h4>
                    {isCompleted && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200 }}
                      >
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </motion.div>
                    )}
                    {chapter.is_weak_area && (
                      <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded-full">
                        Weak Area
                      </span>
                    )}
                  </div>
                  {chapter.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                      {chapter.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                    {chapter.mastery_score !== undefined && (
                      <div className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        <span>{Math.round(chapter.mastery_score)}% mastery</span>
                      </div>
                    )}
                    {chapter.time_spent_minutes !== undefined && chapter.time_spent_minutes > 0 && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{chapter.time_spent_minutes} min</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Mark Complete/Incomplete Button */}
                <motion.button
                  onClick={() => handleToggleCompletion(chapter.id)}
                  disabled={isUpdating}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    isCompleted
                      ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                >
                  {isUpdating ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="h-3 w-3 border-2 border-current border-t-transparent rounded-full"
                      />
                      <span>Updating...</span>
                    </>
                  ) : isCompleted ? (
                    <>
                      <X className="h-3 w-3" />
                      <span>Incomplete</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-3 w-3" />
                      <span>Complete</span>
                    </>
                  )}
                </motion.button>
              </div>
              
              <ProgressBar
                value={chapter.completion_percentage || 0}
                showPercentage={false}
                color={chapter.is_weak_area ? 'error' : chapter.mastery_score && chapter.mastery_score >= 80 ? 'success' : 'primary'}
                size="sm"
              />
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

