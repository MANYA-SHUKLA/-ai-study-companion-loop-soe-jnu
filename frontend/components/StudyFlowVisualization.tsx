'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import mermaid from 'mermaid'
import { AlertTriangle, Info } from 'lucide-react'
import { motion } from 'framer-motion'

interface Topic {
  id: string
  title: string
  parent_topic_id?: string
  difficulty_level?: number
  mastery_score?: number
  is_weak_area?: boolean
  time_spent_minutes?: number
}

interface StudyFlowVisualizationProps {
  topics: Topic[]
  subjectName?: string
}

export default function StudyFlowVisualization({ topics, subjectName }: StudyFlowVisualizationProps) {
  const mermaidRef = useRef<HTMLDivElement>(null)
  const graphId = useRef(`mermaid-${Math.random().toString(36).substring(7)}`)
  const [hoveredWeakArea, setHoveredWeakArea] = useState<string | null>(null)
  const [focusedWeakArea, setFocusedWeakArea] = useState<string | null>(null)
  const eventListenersRef = useRef<Map<Element, { mouseenter: () => void; mouseleave: () => void; focus: () => void; blur: () => void; keydown: (e: KeyboardEvent) => void }>>(new Map())
  
  // Memoize weak areas list to prevent unnecessary recalculations
  const weakAreas = useMemo(() => topics.filter(t => t.is_weak_area), [topics])
  const weakAreasCount = useMemo(() => weakAreas.length, [weakAreas])
  
  // Memoize tooltip content
  const getTooltipContent = useCallback((area: Topic) => ({
    title: area.title,
    mastery: area.mastery_score !== undefined ? Math.round(area.mastery_score) : null,
    timeSpent: area.time_spent_minutes,
    difficulty: area.difficulty_level,
  }), [])

  useEffect(() => {
    if (!mermaidRef.current || topics.length === 0) return

    // Initialize Mermaid (only once)
    if (!(window as any).mermaidInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        themeVariables: {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '14px',
          primaryColor: '#6366f1',
          primaryTextColor: '#ffffff',
          primaryBorderColor: '#4f46e5',
          lineColor: '#9ca3af',
          secondaryColor: '#10b981',
          tertiaryColor: '#f3f4f4',
        },
      })
      ;(window as any).mermaidInitialized = true
    }

    // Build graph definition
    const buildGraph = () => {
      // Separate topics into main topics and subtopics
      const mainTopics = topics.filter(t => !t.parent_topic_id)
      const subtopicsByParent = new Map<string, Topic[]>()
      
      topics.forEach(topic => {
        if (topic.parent_topic_id) {
          if (!subtopicsByParent.has(topic.parent_topic_id)) {
            subtopicsByParent.set(topic.parent_topic_id, [])
          }
          subtopicsByParent.get(topic.parent_topic_id)!.push(topic)
        }
      })

      // Build Mermaid flowchart
      let graph = 'graph TD\n'
      
      // Add styling class definitions (simplified - use single class per node)
      graph += '    classDef completed fill:#10b981,stroke:#059669,stroke-width:2px,color:#fff\n'
      graph += '    classDef inProgress fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff\n'
      graph += '    classDef notStarted fill:#9ca3af,stroke:#6b7280,stroke-width:2px,color:#fff\n'
      // Enhanced weak area styling: thicker border, dashed pattern, warning color
      graph += '    classDef weakArea fill:#fee2e2,stroke:#dc2626,stroke-width:4px,stroke-dasharray: 5 5,color:#991b1b,font-weight:bold\n'

      // Function to get node class based on progress
      const getNodeClass = (topic: Topic): string => {
        // Priority: weak area > progress status
        if (topic.is_weak_area) {
          return 'weakArea'
        }
        
        if (topic.mastery_score !== undefined) {
          if (topic.mastery_score >= 80) {
            return 'completed'
          } else if (topic.mastery_score >= 50 || topic.mastery_score > 0) {
            return 'inProgress'
          }
        }
        
        return 'notStarted'
      }

      // Function to get node label
      const getNodeLabel = (topic: Topic): string => {
        let label = topic.title
        if (topic.is_weak_area) {
          label = `⚠️ ${label}` // Add warning icon to weak areas
        }
        if (topic.mastery_score !== undefined) {
          label += `\\n(${Math.round(topic.mastery_score)}%)`
        }
        if (topic.is_weak_area) {
          label += `\\n[WEAK AREA]` // Add weak area indicator
        }
        return `"${label}"`
      }

      // Create nodes for main topics
      mainTopics.forEach(topic => {
        const nodeId = `T${topic.id.substring(0, 8)}`
        const nodeClass = getNodeClass(topic)
        const nodeLabel = getNodeLabel(topic)
        graph += `    ${nodeId}[${nodeLabel}]:::${nodeClass}\n`
        
        // Add subtopics
        const subtopics = subtopicsByParent.get(topic.id) || []
        subtopics.forEach(subtopic => {
          const subNodeId = `S${subtopic.id.substring(0, 8)}`
          const subNodeClass = getNodeClass(subtopic)
          const subNodeLabel = getNodeLabel(subtopic)
          graph += `    ${subNodeId}[${subNodeLabel}]:::${subNodeClass}\n`
          graph += `    ${nodeId} --> ${subNodeId}\n`
        })
      })

      // Add connections between main topics (if there are dependencies)
      // For now, we'll just connect them in order
      if (mainTopics.length > 1) {
        for (let i = 0; i < mainTopics.length - 1; i++) {
          const fromId = `T${mainTopics[i].id.substring(0, 8)}`
          const toId = `T${mainTopics[i + 1].id.substring(0, 8)}`
          graph += `    ${fromId} -.-> ${toId}\n`
        }
      }

      return graph
    }

    const graphDefinition = buildGraph()

    // Clear previous content
    if (mermaidRef.current) {
      mermaidRef.current.innerHTML = ''
    }

    // Create unique ID for this render
    const uniqueId = `mermaid-${Date.now()}-${Math.random().toString(36).substring(7)}`

    // Function to add tooltips and enhanced styling to weak area nodes
    // Define this BEFORE renderGraph so it's available when called
    function addWeakAreaTooltips() {
      if (!mermaidRef.current) return
      
      const svg = mermaidRef.current.querySelector('svg')
      if (!svg) return
      
      // Find all nodes and add tooltips for weak areas
      weakAreas.forEach(topic => {
          const nodeId = topic.parent_topic_id 
            ? `S${topic.id.substring(0, 8)}` 
            : `T${topic.id.substring(0, 8)}`
          
          // Find the node in SVG (Mermaid uses specific IDs)
          // Try multiple selectors to find the node
          let node: Element | null = null
          
          // Try by ID
          node = svg.querySelector(`[id*="${nodeId}"]`) || 
                 svg.querySelector(`[id*="${topic.id.substring(0, 8)}"]`) ||
                 svg.querySelector(`g[id*="${nodeId}"]`) ||
                 svg.querySelector(`g[id*="${topic.id.substring(0, 8)}"]`)
          
          // Also try finding by text content
          if (!node) {
            const textNodes = svg.querySelectorAll('text')
            textNodes.forEach(textNode => {
              if (textNode.textContent?.includes(topic.title.substring(0, 20))) {
                node = textNode.closest('g') || textNode.parentElement
              }
            })
          }
          
          if (node) {
            // Remove existing event listeners if any (cleanup)
            const existingListeners = eventListenersRef.current.get(node)
            if (existingListeners) {
              node.removeEventListener('mouseenter', existingListeners.mouseenter)
              node.removeEventListener('mouseleave', existingListeners.mouseleave)
              node.removeEventListener('focus', existingListeners.focus)
              node.removeEventListener('blur', existingListeners.blur)
              node.removeEventListener('keydown', existingListeners.keydown as EventListener)
              eventListenersRef.current.delete(node)
            }
            
            // Add title attribute for native tooltip
            const existingTitle = node.querySelector('title')
            if (existingTitle) {
              existingTitle.remove()
            }
            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title')
            const tooltipText = `⚠️ Weak Area: ${topic.title}\n\nMastery: ${topic.mastery_score?.toFixed(0) || 0}%${topic.time_spent_minutes ? `\nTime Spent: ${topic.time_spent_minutes} min` : ''}\n\nThis topic needs extra attention. Your study plan includes revision days for this area.`
            title.textContent = tooltipText
            node.appendChild(title)
            
            // Add hover class for styling
            const currentClass = node.getAttribute('class') || ''
            if (!currentClass.includes('weak-area-node')) {
              node.setAttribute('class', `${currentClass} weak-area-node`.trim())
            }
            
            // Add ARIA attributes for accessibility
            node.setAttribute('role', 'button')
            node.setAttribute('aria-label', `Weak area: ${topic.title}. Mastery: ${topic.mastery_score?.toFixed(0) || 0}%. Press Enter to view details.`)
            node.setAttribute('aria-describedby', `weak-area-${topic.id}`)
            node.setAttribute('tabindex', '0') // Make keyboard focusable
            
            // Add data attributes
            node.setAttribute('data-topic-id', topic.id)
            node.setAttribute('data-topic-title', topic.title)
            node.setAttribute('data-mastery', String(topic.mastery_score || 0))
            node.setAttribute('id', `weak-area-node-${topic.id}`)
            
            // Create event handlers
            const topicId = topic.id
            const handleMouseEnter = () => setHoveredWeakArea(topicId)
            const handleMouseLeave = () => setHoveredWeakArea(null)
            const handleFocus = () => {
              setFocusedWeakArea(topicId)
              setHoveredWeakArea(topicId)
            }
            const handleBlur = () => {
              setFocusedWeakArea(null)
              setHoveredWeakArea(null)
            }
            const handleKeyDown = (e: KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setHoveredWeakArea(topicId)
                // Optional: Navigate to topic detail page
                // window.location.href = `/topics/${topicId}`
              } else if (e.key === 'Escape') {
                setHoveredWeakArea(null)
                setFocusedWeakArea(null)
                if (node && node instanceof HTMLElement) node.blur()
              }
            }
            
            // Store handlers for cleanup
            const handlers = {
              mouseenter: handleMouseEnter,
              mouseleave: handleMouseLeave,
              focus: handleFocus,
              blur: handleBlur,
              keydown: handleKeyDown,
            }
            eventListenersRef.current.set(node, handlers)
            
            // Add event listeners
            node.addEventListener('mouseenter', handleMouseEnter)
            node.addEventListener('mouseleave', handleMouseLeave)
            node.addEventListener('focus', handleFocus)
            node.addEventListener('blur', handleBlur)
            node.addEventListener('keydown', handleKeyDown as EventListener)
      }
    })
  }

    // Render the graph using mermaid.render() (more reliable than mermaid.run())
    const renderGraph = async () => {
      try {
        // Use render API directly (more reliable) - this returns SVG string
        const { svg } = await mermaid.render(`${uniqueId}-svg`, graphDefinition)
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = svg
          // Add tooltips after render
          setTimeout(() => {
            if (typeof addWeakAreaTooltips === 'function') {
              addWeakAreaTooltips()
            } else {
              console.error('addWeakAreaTooltips is not defined')
            }
          }, 100)
        }
      } catch (renderError) {
        console.error('Mermaid render error, trying run method:', renderError)
        // Fallback: use mermaid.run() with pre element
        try {
          if (mermaidRef.current) {
            // Create pre element for mermaid.run()
            const pre = document.createElement('pre')
            pre.className = 'mermaid'
            pre.textContent = graphDefinition
            pre.id = uniqueId
            mermaidRef.current.innerHTML = '' // Clear first
            mermaidRef.current.appendChild(pre)
            
            // Try mermaid.run() as fallback
            await mermaid.run({
              querySelector: `#${uniqueId}`,
            })
            setTimeout(() => {
              if (typeof addWeakAreaTooltips === 'function') {
                addWeakAreaTooltips()
              } else {
                console.error('addWeakAreaTooltips is not defined')
              }
            }, 100)
          }
        } catch (runError) {
          console.error('Mermaid run also failed:', runError)
          if (mermaidRef.current) {
            mermaidRef.current.innerHTML = '<p class="text-red-500 p-4">Error rendering visualization. Please refresh the page.</p>'
          }
        }
      }
    }
    
    if (mermaidRef.current) {
      renderGraph()
    }
    
    // Cleanup function: Remove all event listeners on unmount
    return () => {
      eventListenersRef.current.forEach((handlers, node) => {
        node.removeEventListener('mouseenter', handlers.mouseenter)
        node.removeEventListener('mouseleave', handlers.mouseleave)
        node.removeEventListener('focus', handlers.focus)
        node.removeEventListener('blur', handlers.blur)
        node.removeEventListener('keydown', handlers.keydown as EventListener)
      })
      eventListenersRef.current.clear()
    }
  }, [topics, weakAreas])

  if (topics.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700 text-center">
        <p className="text-gray-500 dark:text-gray-400">No topics to visualize</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Study Flow Visualization
        </h3>
        {subjectName && (
          <p className="text-sm text-gray-600 dark:text-gray-400">{subjectName}</p>
        )}
      </div>

      {/* Weak Areas Summary */}
      {weakAreasCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg"
        >
          <div className="flex items-start gap-3">
            <div className="inline-flex p-2 bg-red-100 dark:bg-red-900/40 rounded-lg flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 dark:text-red-200 mb-2">
                {weakAreasCount} Weak Area{weakAreasCount > 1 ? 's' : ''} Detected
              </h4>
              <p className="text-sm text-red-800 dark:text-red-300 mb-3">
                These topics need extra attention. Your study plan has been updated with revision days.
              </p>
              <div className="space-y-2">
                {weakAreas.slice(0, 5).map((area) => (
                  <div
                    key={area.id}
                    className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border border-red-200 dark:border-red-800 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2"
                    onMouseEnter={() => setHoveredWeakArea(area.id)}
                    onMouseLeave={() => setHoveredWeakArea(null)}
                    role="listitem"
                    aria-label={`Weak area: ${area.title}. Mastery: ${Math.round(area.mastery_score || 0)}%`}
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {area.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                      {area.mastery_score !== undefined && (
                        <span>Mastery: {Math.round(area.mastery_score)}%</span>
                      )}
                      {area.time_spent_minutes !== undefined && (
                        <span>Time: {area.time_spent_minutes} min</span>
                      )}
                    </div>
                  </div>
                ))}
                {weakAreas.length > 5 && (
                  <p className="text-xs text-red-700 dark:text-red-400 text-center pt-1">
                    +{weakAreas.length - 5} more weak area{weakAreas.length - 5 > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Enhanced Legend - Memoized */}
      {(() => {
        const legendContent = useMemo(() => (
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-4 w-4 text-gray-500 dark:text-gray-400" aria-hidden="true" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Legend</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500" aria-hidden="true"></div>
                <span className="text-gray-700 dark:text-gray-300">Completed (≥80%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-500" aria-hidden="true"></div>
                <span className="text-gray-700 dark:text-gray-300">In Progress (≥50%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-400" aria-hidden="true"></div>
                <span className="text-gray-700 dark:text-gray-300">Not Started</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-dashed border-red-500 bg-red-100 dark:bg-red-900/40" aria-hidden="true"></div>
                <span className="text-gray-700 dark:text-gray-300 font-semibold text-red-600 dark:text-red-400">
                  ⚠️ Weak Area
                </span>
              </div>
            </div>
            {weakAreasCount > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  <strong className="text-red-600 dark:text-red-400">Tip:</strong> Hover over or focus on weak area nodes in the diagram to see details. 
                  Use Tab to navigate and Enter/Space to interact. Weak areas are highlighted with a dashed red border and warning icon.
                </p>
              </div>
            )}
          </div>
        ), [weakAreasCount])
        return legendContent
      })()}

      {/* Mermaid Graph */}
      <div 
        ref={mermaidRef} 
        className="mermaid-container overflow-x-auto bg-white dark:bg-gray-900 rounded-lg p-4 relative"
        style={{ minHeight: '300px' }}
      >
        {/* Custom tooltip for weak areas - Memoized and keyboard accessible */}
        {(() => {
          const tooltipArea = (hoveredWeakArea || focusedWeakArea) 
            ? weakAreas.find(a => a.id === (hoveredWeakArea || focusedWeakArea))
            : null
          
          if (!tooltipArea) return null
          
          const tooltipContent = useMemo(() => getTooltipContent(tooltipArea), [tooltipArea, getTooltipContent])
          
          return (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              role="tooltip"
              id={`weak-area-${tooltipArea.id}`}
              aria-live="polite"
              className="absolute z-50 bg-gray-900 dark:bg-gray-800 text-white rounded-lg p-3 shadow-xl border border-gray-700 max-w-xs pointer-events-none"
              style={{
                top: '10px',
                right: '10px',
              }}
            >
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <h5 className="font-semibold text-sm mb-1">{tooltipContent.title}</h5>
                  <p className="text-xs text-gray-300 mb-2">Weak Area - Needs Attention</p>
                </div>
              </div>
              <div className="space-y-1 text-xs">
                {tooltipContent.mastery !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Mastery Score:</span>
                    <span className="font-medium text-red-400">{tooltipContent.mastery}%</span>
                  </div>
                )}
                {tooltipContent.timeSpent !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Time Spent:</span>
                    <span className="font-medium">{tooltipContent.timeSpent} min</span>
                  </div>
                )}
                {tooltipContent.difficulty !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Difficulty:</span>
                    <span className="font-medium">{tooltipContent.difficulty}/5</span>
                  </div>
                )}
              </div>
            </motion.div>
          )
        })()}
      </div>
      
      {/* CSS for weak area node styling with accessibility */}
      <style dangerouslySetInnerHTML={{ __html: `
        .mermaid-container .weak-area-node {
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          outline: none !important; /* Remove default outline, use custom */
        }
        .mermaid-container .weak-area-node:hover {
          filter: brightness(1.1) !important;
          transform: scale(1.05) !important;
        }
        /* Focus styles for keyboard navigation */
        .mermaid-container .weak-area-node:focus {
          outline: 3px solid #3b82f6 !important;
          outline-offset: 2px !important;
          filter: brightness(1.15) !important;
          transform: scale(1.08) !important;
        }
        .mermaid-container .weak-area-node:focus-visible {
          outline: 3px solid #3b82f6 !important;
          outline-offset: 2px !important;
        }
        .mermaid-container svg .weak-area-node {
          animation: weakAreaPulse 2s ease-in-out infinite !important;
        }
        @keyframes weakAreaPulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.85;
          }
        }
      `}} />
    </div>
  )
}


