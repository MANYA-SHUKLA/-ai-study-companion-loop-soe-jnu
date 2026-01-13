'use client'

import { motion } from 'framer-motion'

interface SkeletonLoaderProps {
  variant?: 'card' | 'list' | 'text' | 'circle' | 'custom'
  count?: number
  className?: string
}

export default function SkeletonLoader({ 
  variant = 'card', 
  count = 1,
  className = ''
}: SkeletonLoaderProps) {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded'

  const variants = {
    card: (
      <div className={`${baseClasses} ${className}`}>
        <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-t-lg mb-4" />
        <div className="p-4 space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
        </div>
      </div>
    ),
    list: (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className={`${baseClasses} h-12 w-12 rounded-full`} />
            <div className="flex-1 space-y-2">
              <div className={`${baseClasses} h-4 w-3/4`} />
              <div className={`${baseClasses} h-3 w-1/2`} />
            </div>
          </div>
        ))}
      </div>
    ),
    text: (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={`${baseClasses} h-4 ${i === count - 1 ? 'w-3/4' : 'w-full'}`} />
        ))}
      </div>
    ),
    circle: (
      <div className={`${baseClasses} h-12 w-12 rounded-full ${className}`} />
    ),
    custom: (
      <div className={`${baseClasses} ${className}`} />
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {variants[variant]}
    </motion.div>
  )
}

// Specialized skeleton components
export function NoteCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-12 w-12 rounded-lg" />
          <div className="flex-1 space-y-3">
            <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-5 w-3/4 rounded" />
            <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-4 w-1/2 rounded" />
          </div>
        </div>
        <div className="animate-pulse bg-gray-100 dark:bg-gray-900/50 h-20 rounded-lg mb-4" />
        <div className="flex items-center gap-4">
          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-4 w-20 rounded" />
          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-4 w-24 rounded" />
        </div>
      </div>
    </div>
  )
}

export function SubjectCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="md:flex">
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-48 md:h-auto md:w-64" />
        <div className="flex-1 p-8">
          <div className="space-y-4">
            <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-6 w-2/3 rounded" />
            <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-4 w-full rounded" />
            <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-4 w-5/6 rounded" />
            <div className="flex items-center gap-4 mt-4">
              <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-24 rounded" />
              <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-20 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function QuizSkeleton() {
  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200/50 dark:border-gray-700/50">
      <div className="space-y-6">
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-3/4 rounded" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-900/50 h-16 rounded-lg border-2 border-gray-200 dark:border-gray-700" />
          ))}
        </div>
        <div className="flex justify-end">
          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-10 w-32 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

