'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Upload, Sparkles, Calendar, Target, Brain, ArrowRight, CheckCircle, Search, Check } from 'lucide-react'
import ProtectedRoute from '@/components/ProtectedRoute'

interface FlowStep {
  number: number
  title: string
  description: string
  icon: any
  color: string
  details: string[]
  action?: {
    label: string
    href: string
  }
}

function HowItWorksContent() {
  const flowSteps: FlowStep[] = [
    {
      number: 1,
      title: 'Upload Your Notes',
      description: 'Start by uploading your study materials (PDF, text files, or paste directly)',
      icon: Upload,
      color: 'from-blue-500 to-cyan-500',
      details: [
        'Supported formats: PDF, TXT, Markdown',
        'AI extracts and processes content',
        'Notes are stored securely in database',
        'Content is indexed for semantic search'
      ],
      action: {
        label: 'Upload Notes',
        href: '/notes/upload'
      }
    },
    {
      number: 2,
      title: 'AI Extracts Topics',
      description: 'Google Gemini AI analyzes your notes and automatically extracts topics with difficulty levels',
      icon: Sparkles,
      color: 'from-purple-500 to-pink-500',
      details: [
        'Automatically identifies main topics and subtopics',
        'Assigns difficulty levels (1-5)',
        'Estimates study time for each topic',
        'Organizes topics hierarchically'
      ],
      action: {
        label: 'View Subjects',
        href: '/subjects'
      }
    },
    {
      number: 3,
      title: 'Generate Study Roadmap',
      description: 'AI creates a personalized daily study plan based on your exam date and available time',
      icon: Calendar,
      color: 'from-green-500 to-emerald-500',
      details: [
        'Day-by-day breakdown of what to study',
        'Activities: Learn new content, Revise, Practice',
        'Time allocation based on your schedule',
        'Spaced repetition for better retention'
      ],
      action: {
        label: 'View Study Plans',
        href: '/study-plans'
      }
    },
    {
      number: 4,
      title: 'Mark Topics Complete',
      description: 'Manually track your progress by marking topics as complete or incomplete',
      icon: Check,
      color: 'from-orange-500 to-red-500',
      details: [
        'Click "Complete" button on any topic',
        'Toggle between complete/incomplete status',
        'Visual progress tracking with checkmarks',
        'Overall progress updates automatically'
      ],
      action: {
        label: 'View Study Plans',
        href: '/study-plans'
      }
    },
    {
      number: 5,
      title: 'Search Your Notes',
      description: 'Use AI-powered semantic search to find information across all your notes instantly',
      icon: Search,
      color: 'from-purple-500 to-indigo-500',
      details: [
        'Ask questions in natural language',
        'AI answers even without matching notes',
        'Semantic search finds relevant content',
        'Instant answers with context snippets'
      ],
      action: {
        label: 'Try Search',
        href: '/search'
      }
    }
  ]

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex p-4 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl mb-4">
              <Brain className="h-12 w-12 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              How It Works
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Your AI-Powered Study Companion helps you organize notes, generate study plans, and track your learning progress efficiently
            </p>
          </motion.div>

          {/* Flow Steps */}
          <div className="space-y-12">
            {flowSteps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  {/* Step Number & Icon */}
                  <div className="flex-shrink-0">
                    <div className={`inline-flex p-6 bg-gradient-to-br ${step.color} rounded-2xl shadow-lg relative`}>
                      <step.icon className="h-12 w-12 text-white" />
                      <div className="absolute -top-2 -right-2 w-10 h-10 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center font-bold text-gray-900 dark:text-white shadow-lg">
                        {step.number}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {step.title}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {step.description}
                    </p>

                    {/* Details List */}
                    <ul className="space-y-2 mb-4">
                      {step.details.map((detail, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Action Button */}
                    {step.action && (
                      <Link
                        href={step.action.href}
                        className={`inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${step.color} text-white rounded-lg font-medium hover:opacity-90 transition-opacity`}
                      >
                        {step.action.label}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </div>

                {/* Connector Arrow */}
                {index < flowSteps.length - 1 && (
                  <div className="flex justify-center my-8">
                    <motion.div
                      animate={{ y: [0, 10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="text-gray-400"
                    >
                      <ArrowRight className="h-8 w-8 rotate-90" />
                    </motion.div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Key Features Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-16 bg-gradient-to-br from-primary-50 to-accent-50 dark:from-primary-900/20 dark:to-accent-900/20 rounded-2xl p-8 border-2 border-primary-200 dark:border-primary-800"
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
              🚀 Key Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="inline-flex p-3 bg-green-100 dark:bg-green-900/30 rounded-lg mb-3">
                  <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Manual Progress Tracking</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Mark topics as complete with a single click. Visual progress tracking with instant feedback
                </p>
              </div>
              <div className="text-center">
                <div className="inline-flex p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg mb-3">
                  <Brain className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">AI-Powered</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Google Gemini AI extracts topics, creates study plans, and answers your questions instantly
                </p>
              </div>
              <div className="text-center">
                <div className="inline-flex p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg mb-3">
                  <Search className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Semantic Search</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Ask any question and get instant AI-powered answers from your notes or general knowledge
                </p>
              </div>
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="mt-12 text-center"
          >
            <Link
              href="/notes/upload"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-xl font-bold text-lg hover:opacity-90 transition-opacity shadow-lg"
            >
              Get Started Now
              <ArrowRight className="h-5 w-5" />
            </Link>
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Upload your first note and see the magic happen ✨
            </p>
          </motion.div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

export default function HowItWorksPage() {
  return <HowItWorksContent />
}

