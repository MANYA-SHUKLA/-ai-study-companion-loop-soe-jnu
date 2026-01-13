'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { searchApi, subjectsApi } from '@/lib/api'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Search, FileText, BookOpen, Loader2, Sparkles, Filter, X, Download, ChevronLeft, ChevronRight, Zap, Brain, TrendingUp, Star, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import SkeletonLoader from '@/components/SkeletonLoader'

interface SearchResult {
  id: string
  title: string
  snippet: string
  content: string
  file_type: string
  subject_id?: string
  topic_id?: string
  score: number
  created_at: string
  metadata?: any
}

interface Subject {
  id: string
  name: string
}

function SearchContent() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [aiAnswer, setAiAnswer] = useState<string | null>(null)
  const [usedAiFallback, setUsedAiFallback] = useState(false)
  const [loading, setLoading] = useState(false)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('')
  const [hasSearched, setHasSearched] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [resultsPerPage] = useState(5)

  // Fetch subjects for filter
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await subjectsApi.getAll()
        setSubjects(response.data || [])
      } catch {
        // Ignore errors
      }
    }
    fetchSubjects()
  }, [])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setHasSearched(true)
    setCurrentPage(1) // Reset to first page on new search

    try {
      const response = await searchApi.search({
        query: query.trim(),
        top_k: 50, // Fetch more results for pagination
        subject_id: selectedSubjectId || undefined,
        use_ai_fallback: true, // Enable AI fallback for general questions
      })
      
      console.log('Search response:', response.data)
      
      setResults(response.data.results || [])
      setAiAnswer(response.data.ai_answer || null)
      setUsedAiFallback(response.data.used_ai_fallback || false)
      
      // If AI generated an answer, log it
      if (response.data.ai_answer) {
        console.log('AI Answer received:', response.data.ai_answer.substring(0, 100) + '...')
      }
    } catch (error: any) {
      console.error('Search error:', error)
      console.error('Error details:', error.response?.data)
      
      // If it's a search error but we can still try AI
      if (error.response?.status !== 401 && query.trim()) {
        // Set empty results but let user know AI can still answer
        setResults([])
        setAiAnswer('The search encountered an issue, but I can still help! Unfortunately, I cannot access the backend AI service right now. Please make sure the backend server is running on http://localhost:8000')
        setUsedAiFallback(true)
      } else {
        setResults([])
        setAiAnswer(null)
        setUsedAiFallback(false)
      }
    } finally {
      setLoading(false)
    }
  }

  // Highlight matched text in snippet
  const highlightMatches = (text: string, query: string) => {
    if (!query.trim()) return text
    
    const queryWords = query.trim().split(/\s+/).filter(word => word.length > 2)
    if (queryWords.length === 0) return text
    
    let highlightedText = text
    queryWords.forEach(word => {
      const regex = new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
      highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-900/50 px-1 rounded">$1</mark>')
    })
    
    return highlightedText
  }

  // Pagination calculations
  const totalPages = Math.ceil(results.length / resultsPerPage)
  const startIndex = (currentPage - 1) * resultsPerPage
  const endIndex = startIndex + resultsPerPage
  const paginatedResults = results.slice(startIndex, endIndex)

  // Export search results
  const handleExport = (format: 'json' | 'csv') => {
    if (results.length === 0) return

    if (format === 'json') {
      const dataStr = JSON.stringify({
        query,
        timestamp: new Date().toISOString(),
        count: results.length,
        results: results.map(r => ({
          title: r.title,
          snippet: r.snippet,
          file_type: r.file_type,
          // Semantic match score (0..1). Named for clarity in exports.
          relevance_score: r.score,
          created_at: r.created_at,
          subject_id: r.subject_id,
        }))
      }, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `search-results-${Date.now()}.json`
      link.click()
      URL.revokeObjectURL(url)
    } else if (format === 'csv') {
      const headers = ['Title', 'Snippet', 'File Type', 'Relevance Score', 'Created At', 'Subject ID']
      const rows = results.map(r => [
        `"${r.title.replace(/"/g, '""')}"`,
        `"${r.snippet.replace(/"/g, '""')}"`,
        r.file_type,
        r.score.toString(),
        r.created_at,
        r.subject_id || ''
      ])
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n')
      
      const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `search-results-${Date.now()}.csv`
      link.click()
      URL.revokeObjectURL(url)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getFileTypeLabel = (fileType: string) => {
    return fileType.toUpperCase()
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 dark:text-green-400'
    if (score >= 0.6) return 'text-blue-600 dark:text-blue-400'
    return 'text-gray-600 dark:text-gray-400'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Hero Header */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-primary-700 to-blue-600">
          <motion.div
            className="absolute inset-0"
            animate={{
              backgroundPosition: ['0% 0%', '100% 100%'],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
            style={{
              backgroundImage: 'linear-gradient(135deg, oklch(0.55 0.30 320), oklch(0.50 0.30 250), oklch(0.60 0.25 230))',
              backgroundSize: '200% 200%',
            }}
          />
        </div>
        
        {/* Animated mesh gradient overlay */}
        <div className="absolute inset-0">
          <motion.div
            className="absolute top-0 left-0 w-full h-full opacity-30"
            animate={{
              x: [0, 100, 0],
              y: [0, -50, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{
              background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.3) 0%, transparent 50%)',
            }}
          />
          <motion.div
            className="absolute bottom-0 right-0 w-full h-full opacity-20"
            animate={{
              x: [0, -80, 0],
              y: [0, 60, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{
              background: 'radial-gradient(circle at 70% 80%, rgba(255,255,255,0.2) 0%, transparent 50%)',
            }}
          />
        </div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        
        {/* Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                className="p-3 bg-white/20 backdrop-blur-md rounded-2xl"
              >
                <Brain className="h-8 w-8 text-white" />
              </motion.div>
              <div>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-2 drop-shadow-2xl">
                  AI Search
                </h1>
                <p className="text-xl md:text-2xl text-white/90 font-medium">
                  Ask anything, get intelligent answers from your notes
                </p>
              </div>
            </div>
            {hasSearched && results.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-6 text-white/80"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  <span className="text-sm font-medium">
                    {results.length} {results.length === 1 ? 'Result' : 'Results'} Found
                  </span>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
        
        {/* Floating particles */}
        {typeof window !== 'undefined' && [...Array(8)].map((_, i) => {
          const randomX = Math.random() * (window.innerWidth || 1920)
          const randomY = Math.random() * 300
          return (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white/40 rounded-full"
              initial={{
                x: randomX,
                y: randomY,
                opacity: 0,
              }}
              animate={{
                y: [null, randomY - 100],
                opacity: [0, 0.6, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
                ease: "easeOut"
              }}
            />
          )
        })}
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 -mt-12 relative z-20">

        {/* Search Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-6 md:p-8 border border-gray-200/50 dark:border-gray-700/50 mb-8"
        >
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask me anything... (e.g., 'Explain quantum physics', 'What is machine learning?', 'How do computers work?')"
                  className="w-full pl-12 pr-4 py-4 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all shadow-lg hover:shadow-xl"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="group/btn relative px-8 py-4 bg-gradient-to-r from-primary-600 via-primary-600 to-accent-600 text-white rounded-2xl font-semibold shadow-xl shadow-primary-500/30 hover:shadow-2xl hover:shadow-primary-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 overflow-hidden"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-primary-700 to-accent-700 opacity-0 group-hover/btn:opacity-100 transition-opacity"
                />
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin relative z-10" />
                    <span className="relative z-10">Searching...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 relative z-10" />
                    <span className="relative z-10">Search</span>
                    <Zap className="h-4 w-4 relative z-10 group-hover/btn:scale-110 transition-transform" />
                  </>
                )}
              </button>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-3">
              <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-gray-200/50 dark:border-gray-600/50 rounded-xl bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all shadow-sm"
              >
                <option value="">All Subjects</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
              {selectedSubjectId && (
                <button
                  onClick={() => setSelectedSubjectId('')}
                  className="p-2.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                  title="Clear filter"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </form>
        </motion.div>

        {/* Search Results */}
        {hasSearched && (
          <div>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonLoader key={i} variant="card" />
                ))}
              </div>
            ) : (
              <>
                {/* AI Answer (if generated) */}
                {aiAnswer && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-8 relative"
                  >
                    <div className="bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-pink-500/10 dark:from-purple-500/20 dark:via-blue-500/20 dark:to-pink-500/20 rounded-3xl shadow-2xl border-2 border-purple-300/50 dark:border-purple-700/50 overflow-hidden backdrop-blur-xl">
                      {/* Gradient border effect */}
                      <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-pink-500/20 opacity-0 hover:opacity-100 transition-opacity duration-500 blur-xl -z-10" />
                      
                      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 px-6 py-5">
                        <div className="flex items-center gap-4">
                          <motion.div
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                            className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl border border-white/30"
                          >
                            <Brain className="h-6 w-6 text-white" />
                          </motion.div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-xl font-bold text-white">
                                ✨ AI Answer
                              </h3>
                              <Star className="h-4 w-4 text-yellow-300 fill-yellow-300" />
                            </div>
                            <p className="text-sm text-white/90">
                              {results.length > 0
                                ? `Answer enhanced with insights from ${results.length} of your notes`
                                : "Powered by advanced AI - I can answer any question!"}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="p-6 md:p-8 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
                        <div 
                          className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 leading-relaxed"
                          dangerouslySetInnerHTML={{ 
                            __html: aiAnswer.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong class="text-primary-700 dark:text-primary-300">$1</strong>') 
                          }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
                
                {results.length === 0 && !aiAnswer ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-12 text-center border border-gray-200/50 dark:border-gray-700/50"
                  >
                    <div className="inline-flex p-4 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-2xl mb-6">
                      <Sparkles className="h-12 w-12 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                      Unable to generate answer
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      There was an issue connecting to the AI service.
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Please make sure the backend server is running and try again.
                    </p>
                  </motion.div>
                ) : results.length > 0 ? (
              <>
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-900/20 dark:to-accent-900/20 rounded-2xl border border-primary-200/50 dark:border-primary-800/50"
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <TrendingUp className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    <span>
                      Found {results.length} relevant {results.length === 1 ? 'note' : 'notes'} from your library
                    </span>
                    {results.length > resultsPerPage && (
                      <span className="text-gray-500 dark:text-gray-400">
                        (Showing {startIndex + 1}-{Math.min(endIndex, results.length)} of {results.length})
                      </span>
                    )}
                  </div>
                  {results.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleExport('json')}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-700 dark:text-gray-300 rounded-xl hover:bg-white dark:hover:bg-gray-700 transition-all shadow-sm hover:shadow-md text-sm font-medium border border-gray-200/50 dark:border-gray-600/50"
                        aria-label="Export as JSON"
                      >
                        <Download className="h-4 w-4" />
                        Export JSON
                      </button>
                      <button
                        onClick={() => handleExport('csv')}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-700 dark:text-gray-300 rounded-xl hover:bg-white dark:hover:bg-gray-700 transition-all shadow-sm hover:shadow-md text-sm font-medium border border-gray-200/50 dark:border-gray-600/50"
                        aria-label="Export as CSV"
                      >
                        <Download className="h-4 w-4" />
                        Export CSV
                      </button>
                    </div>
                  )}
                </motion.div>
                <div className="space-y-4 md:space-y-6">
                  {paginatedResults.map((result, index) => (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.08, duration: 0.5, ease: "easeOut" }}
                      whileHover={{ y: -4 }}
                      className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden hover:shadow-2xl transition-all duration-500"
                    >
                      {/* Gradient border effect on hover */}
                      <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-primary-500/0 via-accent-500/0 to-primary-500/0 group-hover:from-primary-500/10 group-hover:via-accent-500/10 group-hover:to-primary-500/10 transition-all duration-500 -z-10 blur-xl" />
                      
                      <div className="p-6 md:p-8">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start gap-4 flex-1">
                            <motion.div
                              whileHover={{ scale: 1.1, rotate: 5 }}
                              className="inline-flex p-3 bg-gradient-to-br from-primary-100 to-accent-100 dark:from-primary-900/30 dark:to-accent-900/30 rounded-2xl flex-shrink-0 border border-primary-200/50 dark:border-primary-800/50"
                            >
                              <FileText className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                            </motion.div>
                            <div className="flex-1 min-w-0">
                              <Link
                                href={`/notes/${result.id}`}
                                className="block group/link"
                              >
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover/link:text-primary-600 dark:group-hover/link:text-primary-400 transition-colors">
                                  {result.title}
                                </h3>
                              </Link>
                              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mb-4">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                  <FileText className="h-3.5 w-3.5" />
                                  {getFileTypeLabel(result.file_type)}
                                </span>
                                {result.subject_id && (
                                  <Link
                                    href={`/subjects/${result.subject_id}/notes`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
                                  >
                                    <BookOpen className="h-3.5 w-3.5" />
                                    View Subject
                                  </Link>
                                )}
                                <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                  {formatDate(result.created_at)}
                                </span>
                                <span className={`px-3 py-1.5 rounded-lg font-semibold ${getScoreColor(result.score)} bg-gradient-to-r ${
                                  result.score >= 0.8 
                                    ? 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20' 
                                    : result.score >= 0.6 
                                    ? 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20'
                                    : 'from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800'
                                }`}>
                                  {Math.round(result.score * 100)}% match
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Snippet with highlighted matches */}
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 rounded-2xl p-5 border border-gray-200/50 dark:border-gray-700/50 mb-4">
                          <p 
                            className="text-sm md:text-base text-gray-700 dark:text-gray-300 leading-relaxed"
                            dangerouslySetInnerHTML={{ 
                              __html: highlightMatches(result.snippet, query) 
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                          <Link
                            href={`/notes/${result.id}`}
                            className="inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-semibold text-sm transition-colors group/link"
                          >
                            View Full Note
                            <ArrowRight className="h-4 w-4 group-hover/link:translate-x-1 transition-transform" />
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-between">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum: number
                          if (totalPages <= 5) {
                            pageNum = i + 1
                          } else if (currentPage <= 3) {
                            pageNum = i + 1
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i
                          } else {
                            pageNum = currentPage - 2 + i
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                currentPage === pageNum
                                  ? 'bg-primary-600 text-white'
                                  : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                              aria-label={`Go to page ${pageNum}`}
                              aria-current={currentPage === pageNum ? 'page' : undefined}
                            >
                              {pageNum}
                            </button>
                          )
                        })}
                      </div>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                        aria-label="Next page"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
                ) : null}
              </>
            )}
          </div>
        )}

        {/* Help Text */}
        {!hasSearched && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-pink-900/20 border border-blue-200/50 dark:border-blue-800/50 rounded-3xl p-6 md:p-8 shadow-xl backdrop-blur-sm"
          >
            <div className="flex items-start gap-4">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex-shrink-0"
              >
                <Sparkles className="h-6 w-6 text-white" />
              </motion.div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-blue-900 dark:text-blue-300 mb-3">
                  💡 Semantic Search Tips
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 dark:text-blue-400 mt-1">•</span>
                    <span>Search by meaning, not just exact keywords</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 dark:text-blue-400 mt-1">•</span>
                    <span>Ask questions like "Explain Newton's Second Law"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 dark:text-blue-400 mt-1">•</span>
                    <span>Use natural language queries</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 dark:text-blue-400 mt-1">•</span>
                    <span>Filter by subject to narrow results</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 dark:text-blue-400 mt-1">•</span>
                    <span>Results are ranked by relevance score</span>
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <ProtectedRoute>
      <SearchContent />
    </ProtectedRoute>
  )
}

