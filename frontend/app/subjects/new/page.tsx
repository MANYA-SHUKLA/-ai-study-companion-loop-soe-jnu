'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { subjectsApi } from '@/lib/api'
import { ArrowLeft, BookOpen, Calendar, FileText, Sparkles } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import ProtectedRoute from '@/components/ProtectedRoute'
import { TOAST_DURATIONS } from '@/lib/constants/toast'

const subjectSchema = z.object({
  name: z.string().min(1, 'Subject name is required').max(200, 'Subject name must be less than 200 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  exam_date: z.string().optional(),
})

type SubjectFormData = z.infer<typeof subjectSchema>

function NewSubjectContent() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
  })

  const onSubmit = async (data: SubjectFormData) => {
    if (isSubmitting) return
    
    setIsSubmitting(true)
    try {
      const response = await subjectsApi.create({
        name: data.name,
        description: data.description || undefined,
        exam_date: data.exam_date || undefined,
      })

      const { ToastMessages, TOAST_IDS, getToastConfig } = await import('@/lib/constants/toast')
      toast.success(
        ToastMessages.SUBJECT_CREATED,
        getToastConfig.shortSuccess(
          ToastMessages.SUBJECT_CREATED,
          TOAST_IDS.SUBJECT_CREATED
        )
      )

      // Redirect to the new subject's notes page where user can upload notes
      // This page has a clear "Upload Note" button
      router.push(`/subjects/${response.data.id}/notes`)
    } catch (error: any) {
      console.error('Error creating subject:', error)
      
      const { ToastMessages, TOAST_IDS, getToastConfig } = await import('@/lib/constants/toast')
      
      if (error.response?.status === 0 || error.isNetworkError || !error.response) {
        toast.error(ToastMessages.NETWORK_ERROR, getToastConfig.networkError())
      } else {
        const errorMessage = error.response?.data?.detail || 'Failed to create subject. Please try again.'
        toast.error(errorMessage, {
          id: TOAST_IDS.CREATE_FAILED,
          duration: TOAST_DURATIONS.STANDARD,
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen pt-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/subjects"
            className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Subjects
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="inline-flex p-3 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Create New Subject
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Add a new subject to organize your study materials
              </p>
            </div>
          </div>
        </div>

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
              href="/subjects"
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
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Create Subject
                </>
              )}
            </button>
          </div>
        </form>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
            What's next?
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
            <li>• Upload your syllabus or study materials</li>
            <li>• Extract topics from your notes</li>
            <li>• Generate a personalized study plan</li>
            <li>• Start taking quizzes to track your progress</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default function NewSubjectPage() {
  return (
    <ProtectedRoute>
      <NewSubjectContent />
    </ProtectedRoute>
  )
}

