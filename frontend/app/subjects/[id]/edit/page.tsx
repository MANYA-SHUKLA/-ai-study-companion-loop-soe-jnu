'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { subjectsApi } from '@/lib/api'
import { ArrowLeft, BookOpen, Calendar, FileText, Edit as EditIcon } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import ProtectedRoute from '@/components/ProtectedRoute'
import LoadingSpinner from '@/components/LoadingSpinner'
import ErrorMessage from '@/components/ErrorMessage'
import { TOAST_DURATIONS } from '@/lib/constants/toast'

const subjectSchema = z.object({
  name: z.string().min(1, 'Subject name is required').max(200, 'Subject name must be less than 200 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  exam_date: z.string().optional(),
})

type SubjectFormData = z.infer<typeof subjectSchema>

interface Subject {
  id: string
  name: string
  description?: string
  exam_date?: string
  created_at: string
}

function EditSubjectContent() {
  const params = useParams()
  const router = useRouter()
  const subjectId = params.id as string
  const [subject, setSubject] = useState<Subject | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
  })

  useEffect(() => {
    if (subjectId) {
      fetchSubject()
    }
  }, [subjectId])

  const fetchSubject = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await subjectsApi.getById(subjectId)
      setSubject(response.data)
      
      // Format exam_date for input (YYYY-MM-DD)
      const examDate = response.data.exam_date 
        ? new Date(response.data.exam_date).toISOString().split('T')[0]
        : ''
      
      // Reset form with fetched data
      reset({
        name: response.data.name,
        description: response.data.description || '',
        exam_date: examDate,
      })
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load subject. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: SubjectFormData) => {
    if (isSubmitting) return
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      await subjectsApi.update(subjectId, {
        name: data.name,
        description: data.description || undefined,
        exam_date: data.exam_date || undefined,
      })

      const { ToastMessages, TOAST_IDS, getToastConfig } = await import('@/lib/constants/toast')
      toast.success(
        'Subject updated successfully!',
        getToastConfig.shortSuccess(
          'Subject updated successfully!',
          TOAST_IDS.SUBJECT_CREATED
        )
      )

      // Redirect back to subject detail page
      router.push(`/subjects/${subjectId}`)
    } catch (error: any) {
      console.error('Error updating subject:', error)
      
      const { ToastMessages, TOAST_IDS, getToastConfig } = await import('@/lib/constants/toast')
      
      if (error.response?.status === 0 || error.isNetworkError || !error.response) {
        toast.error(ToastMessages.NETWORK_ERROR, getToastConfig.networkError())
      } else {
        const errorMessage = error.response?.data?.detail || 'Failed to update subject. Please try again.'
        setError(errorMessage)
        toast.error(errorMessage, {
          id: TOAST_IDS.CREATE_FAILED,
          duration: TOAST_DURATIONS.STANDARD,
        })
      }
    } finally {
      setIsSubmitting(false)
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
            href={`/subjects/${subjectId}`}
            className="mt-4 inline-flex items-center text-primary-600 dark:text-primary-400 hover:underline"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Subject
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 pt-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/subjects/${subjectId}`}
            className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Subject
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="inline-flex p-3 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl">
              <EditIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Edit Subject
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Update subject information
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} onDismiss={() => setError(null)} type="error" />
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
            {/* Subject Name */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                <BookOpen className="h-5 w-5 inline-block mr-2" />
                Subject Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('name')}
                placeholder="e.g., Computer Science, Mathematics, History"
                className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                  errors.name
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                <FileText className="h-5 w-5 inline-block mr-2" />
                Description (Optional)
              </label>
              <textarea
                {...register('description')}
                placeholder="Add a brief description of this subject..."
                rows={4}
                className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none ${
                  errors.description
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                disabled={isSubmitting}
              />
              {errors.description && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Exam Date */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                <Calendar className="h-5 w-5 inline-block mr-2" />
                Exam Date (Optional)
              </label>
              <input
                type="date"
                {...register('exam_date')}
                className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                  errors.exam_date
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                disabled={isSubmitting}
              />
              {errors.exam_date && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  {errors.exam_date.message}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <Link
              href={`/subjects/${subjectId}`}
              className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg font-medium shadow-lg shadow-primary-500/50 hover:shadow-xl hover:shadow-primary-500/50 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Updating...
                </>
              ) : (
                <>
                  <EditIcon className="h-5 w-5" />
                  Update Subject
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function EditSubjectPage() {
  return (
    <ProtectedRoute>
      <EditSubjectContent />
    </ProtectedRoute>
  )
}

