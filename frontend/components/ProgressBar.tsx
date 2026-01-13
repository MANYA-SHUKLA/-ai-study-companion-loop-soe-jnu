'use client'

import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'

interface ProgressBarProps {
  value: number // 0-100
  label?: string
  showPercentage?: boolean
  color?: 'primary' | 'success' | 'warning' | 'error'
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
}

export default function ProgressBar({
  value,
  label,
  showPercentage = true,
  color = 'primary',
  size = 'md',
  animated = true
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value))
  const isComplete = clampedValue === 100

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  }

  const colorClasses = {
    primary: 'bg-primary-600 dark:bg-primary-500',
    success: 'bg-green-600 dark:bg-green-500',
    warning: 'bg-yellow-600 dark:bg-yellow-500',
    error: 'bg-red-600 dark:bg-red-500'
  }

  const gradientClasses = {
    primary: 'from-primary-500 to-primary-700',
    success: 'from-green-500 to-green-700',
    warning: 'from-yellow-500 to-yellow-700',
    error: 'from-red-500 to-red-700'
  }

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-2">
          {label && (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
            </span>
          )}
          {showPercentage && (
            <div className="flex items-center gap-2">
              {isComplete && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                >
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                </motion.div>
              )}
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {Math.round(clampedValue)}%
              </span>
            </div>
          )}
        </div>
      )}
      <div className={`relative w-full ${sizeClasses[size]} bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden`}>
        <motion.div
          initial={animated ? { width: 0 } : { width: `${clampedValue}%` }}
          animate={{ width: `${clampedValue}%` }}
          transition={animated ? { duration: 1, ease: "easeOut" } : {}}
          className={`h-full bg-gradient-to-r ${gradientClasses[color]} rounded-full relative overflow-hidden`}
        >
          {animated && (
            <motion.div
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "linear"
              }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            />
          )}
        </motion.div>
      </div>
    </div>
  )
}

