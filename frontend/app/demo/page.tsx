'use client'

import { useState } from 'react'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import { 
  Upload, 
  Sparkles, 
  Calendar, 
  Target, 
  AlertTriangle, 
  RefreshCcw,
  CheckCircle2,
  ArrowRight,
  FileText,
  BookOpen,
  TrendingUp
} from 'lucide-react'

interface DemoStep {
  number: number
  title: string
  description: string
  icon: React.ElementType
  color: string
  link?: string
  action?: string
}

function DemoContent() {
  const [currentStep, setCurrentStep] = useState<number | null>(null)

  const demoSteps: DemoStep[] = [
    {
      number: 1,
      title: 'Upload Syllabus',
      description: 'Upload your PDF syllabus or study notes. The system extracts text and stores it for analysis.',
      icon: Upload,
      color: 'from-blue-500 to-cyan-500',
      link: '/notes/upload',
      action: 'Go to Upload Page'
    },
    {
      number: 2,
      title: 'AI Extracts Topics',
      description: 'AI analyzes your notes and automatically extracts topics, subtopics, and difficulty levels.',
      icon: Sparkles,
      color: 'from-purple-500 to-pink-500',
      link: '/subjects',
      action: 'View Extracted Topics'
    },
    {
      number: 3,
      title: 'Roadmap Appears',
      description: 'AI generates a personalized daily study plan with topics, activities (learn/revise/quiz), and time allocation.',
      icon: Calendar,
      color: 'from-green-500 to-emerald-500',
      link: '/study-plans',
      action: 'View Study Plan'
    },
    {
      number: 4,
      title: 'Track Progress',
      description: 'Monitor your study progress across topics and mark them as complete.',
      icon: Target,
      color: 'from-orange-500 to-red-500',
      link: '/subjects',
      action: 'View Progress'
    },
    {
      number: 5,
      title: 'Ask AI Anything',
      description: 'Get instant answers to any question from AI. Your notes provide additional context when available.',
      icon: AlertTriangle,
      color: 'from-red-500 to-rose-500',
      link: '/search',
      action: 'Ask AI'
    },
  ]

  return (
    <div className="min-h-screen pt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Demo Flow
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Experience the complete AI Study Companion workflow from syllabus upload to adaptive learning
          </p>
        </div>

        {/* Flow Visualization */}
        <div className="mb-12">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
            <div className="space-y-8">
              {demoSteps.map((step, index) => {
                const Icon = step.icon
                const isLast = index === demoSteps.length - 1
                
                return (
                  <div key={step.number} className="relative">
                    {/* Connector Line */}
                    {!isLast && (
                      <div className="absolute left-6 top-16 w-0.5 h-full bg-gradient-to-b from-gray-300 to-gray-200 dark:from-gray-600 dark:to-gray-700" />
                    )}

                    <div className="flex items-start gap-6">
                      {/* Step Number & Icon */}
                      <div className={`relative z-10 flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>

                      {/* Step Content */}
                      <div className="flex-1 pt-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              Step {step.number}
                            </span>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                              {step.title}
                            </h3>
                          </div>
                          {step.link && (
                            <Link
                              href={step.link}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                              onClick={() => setCurrentStep(step.number)}
                            >
                              {step.action}
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          )}
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Key Features Highlight */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="inline-flex p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg mb-4">
              <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              AI-Powered
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              GPT-4 extracts topics, generates study plans, and creates quizzes automatically
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="inline-flex p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg mb-4">
              <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Adaptive Learning
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              System learns from your performance and automatically adjusts the study plan
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="inline-flex p-3 bg-green-100 dark:bg-green-900/30 rounded-lg mb-4">
              <BookOpen className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Complete Solution
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              End-to-end study companion from syllabus upload to performance tracking
            </p>
          </div>
        </div>

        {/* Quick Start Guide */}
        <div className="bg-gradient-to-br from-primary-50 to-accent-50 dark:from-primary-900/20 dark:to-accent-900/20 rounded-2xl p-8 border border-primary-200 dark:border-primary-800">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Quick Start Guide
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Create a Subject
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Go to <Link href="/subjects" className="text-primary-600 dark:text-primary-400 hover:underline">Subjects</Link> and create a new subject (e.g., "Physics", "Mathematics")
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Upload Your Syllabus
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Upload a PDF or text file with your course syllabus or study notes
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Extract Topics
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Click "Extract Topics" to let AI analyze your notes and extract all topics automatically
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold">
                4
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Generate Study Plan
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Go to <Link href="/study-plans" className="text-primary-600 dark:text-primary-400 hover:underline">Study Plans</Link>, select your subject, and generate a personalized roadmap
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold">
                5
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Ask AI Anything
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Ask any question and get instant AI-powered answers. Your uploaded notes enhance the responses with personalized context!
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold">
                6
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Track Progress
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Monitor your study progress. View topic completion and track your learning journey!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Demo Tips */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                Demo Tips
              </h3>
              <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1 list-disc list-inside">
                <li>Use a real syllabus PDF for best results - the more content, the better the topic extraction</li>
                <li>Take multiple quizzes on different topics to trigger weak area detection</li>
                <li>Try answering quizzes incorrectly to see weak area detection in action</li>
                <li>The study plan visualization updates automatically when you regenerate the plan</li>
                <li>Ask the AI any question - get answers enhanced by your notes</li>
              </ul>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            Get Started
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function DemoPage() {
  return (
    <ProtectedRoute>
      <DemoContent />
    </ProtectedRoute>
  )
}

