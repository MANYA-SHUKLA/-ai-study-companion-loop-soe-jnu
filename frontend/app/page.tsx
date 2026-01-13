'use client'

import Link from 'next/link'
import { ArrowRight, Upload, Target, Brain, TrendingUp, BookOpen, FileText, Calendar, Zap, AlertCircle, CheckCircle2, Users, GraduationCap, Award, Code, Database, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

export default function Home() {
  const mermaidRef = useRef<HTMLDivElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Mark as loaded after initial render
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    if (!mermaidRef.current || !isLoaded) return

    // Defer Mermaid initialization to avoid blocking initial render
    const timer = setTimeout(() => {
      if (!mermaidRef.current) return

      // Initialize Mermaid (only once)
      if (!(window as any).mermaidInitialized) {
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          securityLevel: 'loose',
          themeVariables: {
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '18px',
            primaryColor: '#6366f1',
            primaryTextColor: '#ffffff',
            primaryBorderColor: '#818cf8',
            lineColor: '#818cf8',
            secondaryColor: '#a855f7',
            tertiaryColor: '#ec4899',
            background: '#1f2937',
            mainBkg: '#1f2937',
          },
        })
        ;(window as any).mermaidInitialized = true
      }

      const graphDefinition = `
        graph LR
          A[Upload Notes] -->|AI Analysis| B[Topics Extracted]
          B -->|Personalization| C[Study Roadmap]
          C -->|Track Progress| D[Mark Complete]
          D -->|Learn More| E[Ask AI]
          E -->|Get Answers| A
          
          style A fill:#6366f1,stroke:#818cf8,stroke-width:3px,color:#fff,font-size:18px,font-weight:bold
          style B fill:#8b5cf6,stroke:#a78bfa,stroke-width:3px,color:#fff,font-size:18px,font-weight:bold
          style C fill:#a855f7,stroke:#c084fc,stroke-width:3px,color:#fff,font-size:18px,font-weight:bold
          style D fill:#ec4899,stroke:#f472b6,stroke-width:3px,color:#fff,font-size:18px,font-weight:bold
          style E fill:#f43f5e,stroke:#fb7185,stroke-width:3px,color:#fff,font-size:18px,font-weight:bold
      `

      const graphId = `mermaid-${Math.random().toString(36).substring(7)}`
      
      // Clear previous content
      if (mermaidRef.current) {
        mermaidRef.current.innerHTML = ''
        
        // Create mermaid element
        const mermaidElement = document.createElement('div')
        mermaidElement.className = 'mermaid'
        mermaidElement.id = graphId
        mermaidElement.textContent = graphDefinition
        mermaidRef.current.appendChild(mermaidElement)
        
        // Render the diagram
        mermaid.run({
          nodes: [mermaidElement],
        }).then(() => {
          // Remove loading state on success
          if (mermaidRef.current) {
            const loadingElement = mermaidRef.current.querySelector('.absolute')
            if (loadingElement) {
              loadingElement.remove()
            }
          }
        }).catch((err: any) => {
          console.error('Mermaid rendering error:', err)
          // Fallback: show text representation
          if (mermaidRef.current) {
            mermaidRef.current.innerHTML = `
              <div class="text-center text-white p-8 w-full">
                <div class="space-y-6 max-w-2xl mx-auto">
                  <div class="text-3xl font-bold text-indigo-400 bg-indigo-500/20 px-6 py-4 rounded-xl">Upload Notes</div>
                  <div class="text-lg text-purple-400 font-semibold">↓ AI Analysis</div>
                  <div class="text-3xl font-bold text-purple-400 bg-purple-500/20 px-6 py-4 rounded-xl">Topics Extracted</div>
                  <div class="text-lg text-pink-400 font-semibold">↓ Personalization</div>
                  <div class="text-3xl font-bold text-pink-400 bg-pink-500/20 px-6 py-4 rounded-xl">Study Roadmap</div>
                  <div class="text-lg text-rose-400 font-semibold">↓ Track Progress</div>
                  <div class="text-3xl font-bold text-rose-400 bg-rose-500/20 px-6 py-4 rounded-xl">Mark Complete</div>
                  <div class="text-lg text-indigo-400 font-semibold">↓ Learn More</div>
                  <div class="text-3xl font-bold text-indigo-500 bg-indigo-600/20 px-6 py-4 rounded-xl">Ask AI</div>
                </div>
              </div>
            `
          }
        })
      }
    }, 100) // Small delay to allow initial render

    return () => clearTimeout(timer)
  }, [isLoaded])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
      },
    },
  }

  return (
    <div className="min-h-screen overflow-hidden">
      {/* 1️⃣ Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Enhanced Animated Gradient Background */}
        <div className="absolute inset-0 z-0">
          {/* Base gradient with more vibrant colors */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-indigo-950/50 via-purple-950/40 to-gray-950" />
          
          {/* Multiple animated gradient orbs with enhanced colors */}
          <motion.div
            animate={{
              x: [0, 150, 0],
              y: [0, 100, 0],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-10 left-10 w-[500px] h-[500px] bg-gradient-to-br from-indigo-500/40 via-purple-500/40 to-pink-500/40 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              x: [0, -120, 0],
              y: [0, -100, 0],
              scale: [1, 1.4, 1],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute bottom-10 right-10 w-[600px] h-[600px] bg-gradient-to-br from-purple-500/40 via-pink-500/40 to-rose-500/40 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              x: [0, 80, 0],
              y: [0, -120, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-gradient-to-br from-pink-500/30 via-indigo-500/30 to-purple-500/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"
          />
          <motion.div
            animate={{
              x: [0, -60, 0],
              y: [0, 80, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 22,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-1/3 right-1/4 w-[350px] h-[350px] bg-gradient-to-br from-cyan-500/25 via-indigo-500/25 to-purple-500/25 rounded-full blur-3xl"
          />
          
          {/* Enhanced grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808015_1px,transparent_1px),linear-gradient(to_bottom,#80808015_1px,transparent_1px)] bg-[size:4rem_4rem]" />
          
          {/* Radial gradient overlay for depth */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.15),transparent_70%)]" />
        </div>

        {/* Floating particles effect */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          {[...Array(30)].map((_, i) => {
            const seed = i * 0.618033988749895
            const randomX = ((seed * 100) % 100)
            const randomY = (((seed * 137.508) % 100))
            const randomDuration = 8 + ((seed * 12) % 12)
            const randomDelay = (seed * 5) % 5
            const randomSize = 2 + ((seed * 3) % 3)
            
            return (
              <motion.div
                key={i}
                className="absolute rounded-full bg-gradient-to-br from-indigo-400/40 via-purple-400/40 to-pink-400/40"
                style={{
                  left: `${randomX}%`,
                  top: `${randomY}%`,
                  width: `${randomSize}px`,
                  height: `${randomSize}px`,
                }}
                animate={{
                  y: [0, -150, 0],
                  opacity: [0, 0.6, 0],
                  scale: [0, 1, 0],
                }}
                transition={{
                  duration: randomDuration,
                  repeat: Infinity,
                  delay: randomDelay,
                  ease: "easeInOut",
                }}
              />
            )
          })}
        </div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 text-center"
        >
          <motion.div variants={itemVariants}>
            {/* Animated Icon Badge */}
            <motion.div
              animate={{ 
                y: [0, -15, 0],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="inline-block mb-8"
            >
              <div className="relative">
                {/* Glow effect */}
                <motion.div
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.4, 0.7, 0.4],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl blur-2xl"
                />
                {/* Icon container */}
                <div className="relative bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-6 rounded-3xl shadow-2xl shadow-indigo-500/50">
                  <Sparkles className="h-16 w-16 text-white" />
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-3xl" />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-1 -right-1"
                  >
                    <Sparkles className="h-6 w-6 text-yellow-400 drop-shadow-lg" />
                  </motion.div>
                </div>
              </div>
            </motion.div>
            
            {/* Enhanced Typography */}
            <motion.h1 
              variants={itemVariants}
              className="text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-extrabold mb-8 leading-tight"
            >
              <motion.span 
                className="block text-white drop-shadow-2xl"
                animate={{
                  textShadow: [
                    "0 0 20px rgba(99, 102, 241, 0.5)",
                    "0 0 30px rgba(168, 85, 247, 0.5)",
                    "0 0 20px rgba(99, 102, 241, 0.5)",
                  ]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                Study Smarter.
              </motion.span>
              <motion.span 
                className="block bg-gradient-to-r from-indigo-400 via-purple-400 via-pink-400 to-rose-400 bg-clip-text text-transparent drop-shadow-2xl"
                animate={{
                  backgroundPosition: ["0%", "100%", "0%"],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "linear"
                }}
                style={{
                  backgroundSize: "200% 200%",
                }}
              >
                Not Longer.
              </motion.span>
            </motion.h1>
            
            <motion.p 
              variants={itemVariants}
              className="text-xl md:text-2xl lg:text-3xl text-gray-200 max-w-4xl mx-auto mb-16 font-light leading-relaxed"
            >
              An AI-powered study companion that analyzes your notes, extracts topics, creates a personalized study roadmap, and answers any question you have.
            </motion.p>

            {/* Enhanced CTA Buttons */}
            <motion.div 
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-6 justify-center items-center"
            >
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  href="/login"
                  className="group relative px-12 py-6 rounded-2xl font-bold text-xl overflow-hidden shadow-2xl shadow-indigo-500/50"
                >
                  {/* Gradient background with enhanced colors */}
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 via-pink-500 to-rose-500" />
                  {/* Hover gradient */}
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 via-pink-600 to-rose-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  {/* Content */}
                  <span className="relative z-10 flex items-center justify-center text-white">
                    👉 Get Started
                    <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-2 transition-transform duration-300" />
                  </span>
                  {/* Enhanced shine effect */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                  {/* Pulsing glow */}
                  <motion.div
                    animate={{
                      opacity: [0.5, 0.8, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-indigo-400/50 via-purple-400/50 to-pink-400/50 blur-xl"
                  />
                </Link>
              </motion.div>
              
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  href="/demo"
                  className="group relative px-12 py-6 rounded-2xl font-bold text-xl border-2 border-indigo-500/60 bg-gray-900/60 backdrop-blur-xl text-white hover:border-indigo-400/80 hover:bg-gray-900/80 transition-all duration-300 overflow-hidden shadow-xl"
                >
                  {/* Animated border gradient */}
              <motion.div
                animate={{
                      backgroundPosition: ["0%", "100%", "0%"],
                }}
                transition={{
                      duration: 3,
                  repeat: Infinity,
                      ease: "linear"
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      backgroundSize: "200% 200%",
                    }}
                  />
                  <span className="relative z-10 flex items-center gap-2">
                    📄 View Demo
                  </span>
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          animate={{ y: [0, 15, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-10"
        >
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm text-gray-400 font-medium">Scroll to explore</span>
            <ArrowRight className="h-6 w-6 text-indigo-400 rotate-90" />
          </div>
        </motion.div>
      </section>

      {/* 2️⃣ Problem Statement */}
      <section className="relative py-40 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
        {/* Enhanced Background Effects with Animated Orbs */}
        <div className="absolute inset-0">
          {/* Base gradients */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(99,102,241,0.2),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(168,85,247,0.2),transparent_50%)]" />
          
          {/* Animated gradient orbs */}
          <motion.div
            animate={{
              x: [0, 100, 0],
              y: [0, 80, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-br from-indigo-500/30 via-purple-500/30 to-pink-500/30 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              x: [0, -120, 0],
              y: [0, -100, 0],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-gradient-to-br from-purple-500/30 via-pink-500/30 to-rose-500/30 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(236,72,153,0.15),transparent_70%)]"
          />
          
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808010_1px,transparent_1px),linear-gradient(to_bottom,#80808010_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        </div>
        
        <div className="relative max-w-7xl mx-auto">
          {/* Enhanced Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-24"
          >
            {/* Enhanced Badge */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-block mb-8"
            >
              <motion.div
                animate={{
                  boxShadow: [
                    "0 0 20px rgba(99, 102, 241, 0.3)",
                    "0 0 30px rgba(168, 85, 247, 0.4)",
                    "0 0 20px rgba(99, 102, 241, 0.3)",
                  ]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="relative"
              >
                <span className="relative px-8 py-3 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 border-2 border-indigo-500/40 rounded-full text-indigo-300 font-bold text-sm backdrop-blur-md shadow-lg">
                  Common Challenges
              </span>
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-indigo-500/30 via-purple-500/30 to-pink-500/30 rounded-full blur-xl -z-10"
                />
            </motion.div>
          </motion.div>

            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-6xl lg:text-7xl xl:text-9xl font-extrabold mb-8 leading-tight"
            >
              <motion.span 
                className="block text-white drop-shadow-2xl mb-2"
                animate={{
                  textShadow: [
                    "0 0 20px rgba(99, 102, 241, 0.4)",
                    "0 0 30px rgba(168, 85, 247, 0.5)",
                    "0 0 20px rgba(99, 102, 241, 0.4)",
                  ]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                Why Students
              </motion.span>
              <motion.span 
                className="block bg-gradient-to-r from-indigo-400 via-purple-400 via-pink-400 to-rose-400 bg-clip-text text-transparent drop-shadow-2xl"
                animate={{
                  backgroundPosition: ["0%", "100%", "0%"],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "linear"
                }}
                style={{
                  backgroundSize: "200% 200%",
                }}
              >
                Struggle Today
              </motion.span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed"
            >
              Understanding the pain points students face every day
            </motion.p>
          </motion.div>

          {/* Enhanced Problem Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: FileText,
                title: 'Overloaded and unstructured syllabus',
                gradient: 'from-indigo-500 via-purple-500 to-pink-500',
                glowColor: 'indigo',
                description: 'Too much content, no clear path forward',
              },
              {
                icon: AlertCircle,
                title: 'No idea what to study first',
                gradient: 'from-purple-500 via-pink-500 to-rose-500',
                glowColor: 'purple',
                description: 'Lost in a sea of topics and deadlines',
              },
              {
                icon: Brain,
                title: 'Manual note organization',
                gradient: 'from-pink-500 via-rose-500 to-purple-500',
                glowColor: 'pink',
                description: 'Spending hours organizing topics manually',
              },
              {
                icon: Calendar,
                title: 'No personalized roadmap',
                gradient: 'from-rose-500 via-pink-500 to-indigo-500',
                glowColor: 'rose',
                description: 'Generic study plans that don\'t fit your schedule',
              },
            ].map((problem, index) => {
              const Icon = problem.icon
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 50, scale: 0.9 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.15 }}
                  whileHover={{ y: -12, scale: 1.02 }}
                  className="group relative"
                >
                  {/* Enhanced Glow effect */}
                  <motion.div
                    animate={{
                      opacity: [0.3, 0.6, 0.3],
                      scale: [1, 1.05, 1],
                    }}
                    transition={{
                      duration: 2 + index * 0.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className={`absolute -inset-2 bg-gradient-to-r ${problem.gradient} rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                  />
                  
                  {/* Card with enhanced styling */}
                  <div className="relative bg-gray-900/95 backdrop-blur-xl rounded-3xl p-10 border-2 border-gray-800/50 group-hover:border-gray-700/80 transition-all duration-500 overflow-hidden shadow-2xl group-hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
                    {/* Animated gradient background */}
                    <motion.div
                      animate={{
                        backgroundPosition: ["0%", "100%", "0%"],
                      }}
                      transition={{
                        duration: 5,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                      className={`absolute inset-0 bg-gradient-to-br ${problem.gradient} opacity-0 group-hover:opacity-15 transition-opacity duration-500`}
                      style={{
                        backgroundSize: "200% 200%",
                      }}
                    />
                    
                    {/* Multiple decorative accents */}
                    <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br ${problem.gradient} opacity-0 group-hover:opacity-15 transition-opacity duration-500 blur-3xl`} />
                    <div className={`absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr ${problem.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-2xl`} />
                    
                    <div className="relative z-10">
                      {/* Enhanced Icon with more effects */}
                      <motion.div
                        whileHover={{ scale: 1.2, rotate: [0, -5, 5, 0] }}
                        className={`relative inline-flex p-6 bg-gradient-to-br ${problem.gradient} rounded-3xl mb-8 shadow-2xl ${
                          problem.glowColor === 'indigo' ? 'shadow-indigo-500/60' :
                          problem.glowColor === 'purple' ? 'shadow-purple-500/60' :
                          problem.glowColor === 'pink' ? 'shadow-pink-500/60' :
                          'shadow-rose-500/60'
                        } group-hover:shadow-[0_0_40px_rgba(99,102,241,0.6)] transition-all duration-500`}
                      >
                        <Icon className="h-12 w-12 text-white relative z-10" />
                        <motion.div
                          animate={{
                            scale: [1, 1.15, 1],
                            opacity: [0.4, 0.7, 0.4],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                          className="absolute inset-0 bg-white/30 rounded-3xl"
                        />
                        <motion.div
                          animate={{
                            rotate: 360,
                          }}
                          transition={{
                            duration: 20,
                            repeat: Infinity,
                            ease: "linear"
                          }}
                          className={`absolute -inset-1 bg-gradient-to-r ${problem.gradient} rounded-3xl blur opacity-30`}
                        />
                      </motion.div>
                      
                      {/* Enhanced Title */}
                      <h3 className="text-2xl font-bold text-gray-100 group-hover:text-white mb-4 transition-colors duration-300 leading-tight">
                        {problem.title}
                      </h3>
                      
                      {/* Enhanced Description */}
                      <p className="text-base text-gray-400 group-hover:text-gray-200 transition-colors duration-300 leading-relaxed">
                        {problem.description}
                      </p>
                      
                      {/* Enhanced decorative line */}
                      <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        whileInView={{ width: "100%", opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: index * 0.15 + 0.4 }}
                        className={`mt-8 h-1.5 bg-gradient-to-r ${problem.gradient} rounded-full shadow-lg`}
                      />
                        </div>
                    
                    {/* Enhanced shine effect on hover */}
                    <motion.div
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "100%" }}
                      transition={{ duration: 1.5, ease: "easeInOut" }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    />
                    
                    {/* Subtle pulse effect */}
                    <motion.div
                      animate={{
                        opacity: [0, 0.1, 0],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className={`absolute inset-0 bg-gradient-to-br ${problem.gradient} opacity-0`}
                    />
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 3️⃣ Solution Overview */}
      <section className="relative py-40 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-b from-gray-900 via-gray-950 to-gray-900">
        {/* Enhanced Background Effects with Animated Orbs */}
        <div className="absolute inset-0">
          {/* Base gradients */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(99,102,241,0.2),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(168,85,247,0.2),transparent_50%)]" />
          
          {/* Animated gradient orbs */}
          <motion.div
            animate={{
              x: [0, 120, 0],
              y: [0, 90, 0],
              scale: [1, 1.25, 1],
            }}
            transition={{
              duration: 22,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-10 left-20 w-[450px] h-[450px] bg-gradient-to-br from-indigo-500/35 via-purple-500/35 to-pink-500/35 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              x: [0, -100, 0],
              y: [0, -90, 0],
              scale: [1, 1.35, 1],
            }}
            transition={{
              duration: 28,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute bottom-10 right-20 w-[550px] h-[550px] bg-gradient-to-br from-purple-500/35 via-pink-500/35 to-rose-500/35 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              opacity: [0.4, 0.7, 0.4],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(236,72,153,0.15),transparent_70%)]"
          />
          
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808010_1px,transparent_1px),linear-gradient(to_bottom,#80808010_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        </div>
        
        <div className="relative max-w-7xl mx-auto">
          {/* Enhanced Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-24"
          >
            {/* Enhanced Badge */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-block mb-8"
            >
              <motion.div
                animate={{
                  boxShadow: [
                    "0 0 20px rgba(99, 102, 241, 0.4)",
                    "0 0 35px rgba(168, 85, 247, 0.5)",
                    "0 0 20px rgba(99, 102, 241, 0.4)",
                  ]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="relative"
              >
                <span className="relative px-8 py-3 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 border-2 border-indigo-500/40 rounded-full text-indigo-300 font-bold text-sm backdrop-blur-md shadow-lg">
                  Our Solutions
                </span>
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-indigo-500/30 via-purple-500/30 to-pink-500/30 rounded-full blur-xl -z-10"
                />
              </motion.div>
          </motion.div>

            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-6xl lg:text-7xl xl:text-9xl font-extrabold mb-8 leading-tight"
            >
              <motion.span 
                className="block text-white drop-shadow-2xl mb-2"
                animate={{
                  textShadow: [
                    "0 0 20px rgba(99, 102, 241, 0.4)",
                    "0 0 30px rgba(168, 85, 247, 0.5)",
                    "0 0 20px rgba(99, 102, 241, 0.4)",
                  ]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                How AI Study Companion
              </motion.span>
              <motion.span 
                className="block bg-gradient-to-r from-indigo-400 via-purple-400 via-pink-400 to-rose-400 bg-clip-text text-transparent drop-shadow-2xl"
                animate={{
                  backgroundPosition: ["0%", "100%", "0%"],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "linear"
                }}
                style={{
                  backgroundSize: "200% 200%",
                }}
              >
                Helps
              </motion.span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed"
            >
              Powerful features designed to transform your learning experience
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Upload,
                title: 'Upload Syllabus & Notes',
                description: 'AI breaks them into structured topics',
                gradient: 'from-indigo-500 via-purple-500 to-pink-500',
                glowColor: 'indigo',
              },
              {
                icon: Target,
                title: 'Personalized Study Roadmap',
                description: 'Daily plan based on time & exam date',
                gradient: 'from-purple-500 via-pink-500 to-rose-500',
                glowColor: 'purple',
              },
              {
                icon: Brain,
                title: 'AI Question Answering',
                description: 'Ask anything, get instant answers',
                gradient: 'from-pink-500 via-rose-500 to-purple-500',
                glowColor: 'pink',
              },
              {
                icon: TrendingUp,
                title: 'Manual Progress Tracking',
                description: 'Mark topics complete as you learn',
                gradient: 'from-rose-500 via-pink-500 to-indigo-500',
                glowColor: 'rose',
              },
            ].map((solution, index) => {
              const Icon = solution.icon
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 50, scale: 0.9 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.15 }}
                  whileHover={{ y: -15, scale: 1.03 }}
                  className="group relative"
                >
                  {/* Enhanced Glow effect */}
                  <motion.div
                    animate={{
                      opacity: [0.3, 0.6, 0.3],
                      scale: [1, 1.05, 1],
                    }}
                    transition={{
                      duration: 2 + index * 0.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className={`absolute -inset-2 bg-gradient-to-r ${solution.gradient} rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                  />
                  
                  {/* Enhanced Card */}
                  <div className="relative bg-gray-900/95 backdrop-blur-xl rounded-3xl p-10 border-2 border-gray-800/50 group-hover:border-gray-700/80 transition-all duration-500 overflow-hidden shadow-2xl group-hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
                    {/* Animated gradient background */}
                    <motion.div
                      animate={{
                        backgroundPosition: ["0%", "100%", "0%"],
                      }}
                      transition={{
                        duration: 5,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                      className={`absolute inset-0 bg-gradient-to-br ${solution.gradient} opacity-0 group-hover:opacity-15 transition-opacity duration-500`}
                      style={{
                        backgroundSize: "200% 200%",
                      }}
                    />
                    
                    {/* Multiple decorative accents */}
                    <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br ${solution.gradient} opacity-0 group-hover:opacity-15 transition-opacity duration-500 blur-3xl`} />
                    <div className={`absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr ${solution.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-2xl`} />
                    
                    <div className="relative z-10">
                      {/* Enhanced Icon with more effects */}
                      <motion.div
                        whileHover={{ scale: 1.2, rotate: [0, -5, 5, 0] }}
                        className={`relative inline-flex p-6 bg-gradient-to-br ${solution.gradient} rounded-3xl mb-8 shadow-2xl ${
                          solution.glowColor === 'indigo' ? 'shadow-indigo-500/60' :
                          solution.glowColor === 'purple' ? 'shadow-purple-500/60' :
                          solution.glowColor === 'pink' ? 'shadow-pink-500/60' :
                          'shadow-rose-500/60'
                        } group-hover:shadow-[0_0_40px_rgba(99,102,241,0.6)] transition-all duration-500`}
                      >
                        <Icon className="h-12 w-12 text-white relative z-10" />
                        <motion.div
                          animate={{
                            scale: [1, 1.15, 1],
                            opacity: [0.4, 0.7, 0.4],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                          className="absolute inset-0 bg-white/30 rounded-3xl"
                        />
                        <motion.div
                          animate={{
                            rotate: 360,
                          }}
                          transition={{
                            duration: 20,
                            repeat: Infinity,
                            ease: "linear"
                          }}
                          className={`absolute -inset-1 bg-gradient-to-r ${solution.gradient} rounded-3xl blur opacity-30`}
                        />
                      </motion.div>
                      
                      {/* Enhanced Title */}
                      <h3 className="text-2xl font-bold mb-4 text-white group-hover:bg-gradient-to-r group-hover:from-indigo-400 group-hover:via-purple-400 group-hover:to-pink-400 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300 leading-tight">
                        {solution.title}
                      </h3>
                      
                      {/* Enhanced Description */}
                      <p className="text-base text-gray-400 leading-relaxed group-hover:text-gray-200 transition-colors duration-300">
                        {solution.description}
                      </p>
                      
                      {/* Enhanced decorative line */}
                      <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        whileInView={{ width: "100%", opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: index * 0.15 + 0.4 }}
                        className={`mt-8 h-1.5 bg-gradient-to-r ${solution.gradient} rounded-full shadow-lg`}
                      />
                    </div>
                    
                    {/* Enhanced shine effect on hover */}
                    <motion.div
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "100%" }}
                      transition={{ duration: 1.5, ease: "easeInOut" }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    />
                    
                    {/* Subtle pulse effect */}
                    <motion.div
                      animate={{
                        opacity: [0, 0.1, 0],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className={`absolute inset-0 bg-gradient-to-br ${solution.gradient} opacity-0`}
                    />
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 4️⃣ How It Works */}
      <section className="relative py-40 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
        {/* Enhanced Background Effects */}
        <div className="absolute inset-0">
          {/* Base gradients */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(99,102,241,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,rgba(168,85,247,0.15),transparent_50%)]" />
          
          {/* Animated gradient orbs */}
        <motion.div
          animate={{
              x: [0, 100, 0],
              y: [0, 70, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-br from-indigo-500/30 via-purple-500/30 to-pink-500/30 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              x: [0, -90, 0],
              y: [0, -80, 0],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute bottom-20 right-20 w-[500px] h-[500px] bg-gradient-to-br from-purple-500/30 via-pink-500/30 to-rose-500/30 rounded-full blur-3xl"
          />
          
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808010_1px,transparent_1px),linear-gradient(to_bottom,#80808010_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        </div>
        
        <div className="relative max-w-7xl mx-auto">
          {/* Enhanced Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-24"
          >
            {/* Enhanced Badge */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-block mb-8"
            >
              <motion.div
                animate={{
                  boxShadow: [
                    "0 0 20px rgba(99, 102, 241, 0.4)",
                    "0 0 35px rgba(168, 85, 247, 0.5)",
                    "0 0 20px rgba(99, 102, 241, 0.4)",
                  ]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="relative"
              >
                <span className="relative px-8 py-3 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 border-2 border-indigo-500/40 rounded-full text-indigo-300 font-bold text-sm backdrop-blur-md shadow-lg">
                Simple Process
              </span>
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-indigo-500/30 via-purple-500/30 to-pink-500/30 rounded-full blur-xl -z-10"
                />
            </motion.div>
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-6xl lg:text-7xl xl:text-9xl font-extrabold mb-8 leading-tight"
            >
              <motion.span 
                className="block text-white drop-shadow-2xl"
                animate={{
                  textShadow: [
                    "0 0 20px rgba(99, 102, 241, 0.4)",
                    "0 0 30px rgba(168, 85, 247, 0.5)",
                    "0 0 20px rgba(99, 102, 241, 0.4)",
                  ]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                How It Works
              </motion.span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed"
            >
              Get started in minutes, master your subjects in weeks
            </motion.p>
          </motion.div>

          <div className="relative">
            {/* Enhanced Connection Line */}
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500/40 via-purple-500/40 via-pink-500/40 to-rose-500/40 -translate-y-1/2 shadow-lg">
              <motion.div
                animate={{
                  backgroundPosition: ["0%", "100%", "0%"],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent"
                style={{
                  backgroundSize: "200% 100%",
                }}
              />
            </div>
            
            <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-8">
              {[
                { step: '1️⃣', title: 'Upload notes', icon: Upload, description: 'Upload your syllabus and study materials' },
                { step: '2️⃣', title: 'AI extracts topics', icon: Sparkles, description: 'Intelligent topic extraction and organization' },
                { step: '3️⃣', title: 'Study plan generated', icon: Target, description: 'Personalized roadmap tailored to you' },
                { step: '4️⃣', title: 'Track progress', icon: Brain, description: 'Monitor your learning progress' },
                { step: '5️⃣', title: 'Ask AI anything', icon: TrendingUp, description: 'Get instant answers to any question from AI' },
              ].map((item, index) => {
                const Icon = item.icon
                const gradients = [
                  'from-indigo-500 via-purple-500 to-pink-500',
                  'from-purple-500 via-pink-500 to-rose-500',
                  'from-pink-500 via-rose-500 to-purple-500',
                  'from-rose-500 via-pink-500 to-indigo-500',
                  'from-indigo-400 via-purple-400 to-pink-400',
                  'from-purple-400 via-pink-400 to-rose-400',
                ]
                const glowColors = [
                  'shadow-indigo-500/60',
                  'shadow-purple-500/60',
                  'shadow-pink-500/60',
                  'shadow-rose-500/60',
                  'shadow-indigo-400/60',
                  'shadow-purple-400/60',
                ]
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.15 }}
                    whileHover={{ y: -20, scale: 1.08 }}
                    className="relative group"
                  >
                    {/* Enhanced Glow effect */}
                    <motion.div
                      animate={{
                        opacity: [0.4, 0.7, 0.4],
                        scale: [1, 1.08, 1],
                      }}
                      transition={{
                        duration: 2 + index * 0.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className={`absolute -inset-3 bg-gradient-to-r ${gradients[index]} rounded-3xl blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                    />
                    
                    {/* Enhanced Card */}
                    <div className="relative bg-gray-900/95 backdrop-blur-xl rounded-3xl p-10 border-2 border-gray-800/50 group-hover:border-gray-700/90 transition-all duration-500 overflow-hidden text-center shadow-2xl group-hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.6)]">
                      {/* Animated gradient background */}
                      <motion.div
                        animate={{
                          backgroundPosition: ["0%", "100%", "0%"],
                        }}
                        transition={{
                          duration: 5,
                          repeat: Infinity,
                          ease: "linear"
                        }}
                        className={`absolute inset-0 bg-gradient-to-br ${gradients[index]} opacity-0 group-hover:opacity-20 transition-opacity duration-500`}
                        style={{
                          backgroundSize: "200% 200%",
                        }}
                      />
                      
                      {/* Multiple decorative accents */}
                      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradients[index]} opacity-0 group-hover:opacity-15 transition-opacity duration-500 blur-3xl`} />
                      <div className={`absolute bottom-0 left-0 w-28 h-28 bg-gradient-to-tr ${gradients[index]} opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-2xl`} />
                      
                      <div className="relative z-10">
                        {/* Enhanced Step Number with gradient background */}
                        <motion.div
                          animate={{
                            scale: [1, 1.15, 1],
                            rotate: [0, 5, -5, 0],
                          }}
                          transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                          className="relative inline-block mb-8"
                        >
                          <motion.div
                            animate={{
                              scale: [1, 1.2, 1],
                              opacity: [0.5, 0.8, 0.5],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                            className={`absolute inset-0 bg-gradient-to-br ${gradients[index]} rounded-2xl blur-xl`}
                          />
                          <div className={`relative text-6xl drop-shadow-2xl bg-gradient-to-br ${gradients[index]} bg-clip-text text-transparent`} style={{ WebkitTextStroke: '2px transparent' }}>
                            {item.step}
                        </div>
                        </motion.div>
                      
                        {/* Enhanced Icon Container */}
                      <motion.div
                          whileHover={{ scale: 1.25, rotate: [0, -10, 10, 0] }}
                          className={`relative inline-flex p-6 bg-gradient-to-br ${gradients[index]} rounded-3xl mb-8 shadow-2xl ${glowColors[index]} group-hover:shadow-[0_0_40px_rgba(99,102,241,0.7)] transition-all duration-500`}
                        >
                          <Icon className="h-12 w-12 text-white relative z-10" />
                          <motion.div
                            animate={{
                              scale: [1, 1.2, 1],
                              opacity: [0.4, 0.8, 0.4],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                            className="absolute inset-0 bg-white/40 rounded-3xl"
                          />
                          <motion.div
                            animate={{
                              rotate: 360,
                            }}
                            transition={{
                              duration: 20,
                              repeat: Infinity,
                              ease: "linear"
                            }}
                            className={`absolute -inset-2 bg-gradient-to-r ${gradients[index]} rounded-3xl blur-lg opacity-40`}
                          />
                          <motion.div
                            animate={{
                              rotate: -360,
                            }}
                            transition={{
                              duration: 30,
                              repeat: Infinity,
                              ease: "linear"
                            }}
                            className={`absolute -inset-1 bg-gradient-to-r ${gradients[index]} rounded-3xl blur-md opacity-20`}
                          />
                      </motion.div>
                      
                        {/* Enhanced Title */}
                        <h3 className="text-xl md:text-2xl font-bold text-white mb-3 group-hover:bg-gradient-to-r group-hover:from-indigo-400 group-hover:via-purple-400 group-hover:to-pink-400 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300 leading-tight">
                          {item.title}
                        </h3>
                        
                        {/* Description */}
                        <p className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors duration-300 leading-relaxed">
                          {item.description}
                        </p>
                        
                        {/* Decorative line */}
                        <motion.div
                          initial={{ width: 0, opacity: 0 }}
                          whileInView={{ width: "100%", opacity: 1 }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: index * 0.15 + 0.5 }}
                          className={`mt-6 h-1.5 bg-gradient-to-r ${gradients[index]} rounded-full shadow-lg mx-auto`}
                          style={{ maxWidth: '60px' }}
                        />
                      </div>
                      
                      {/* Enhanced shine effect on hover */}
                      <motion.div
                        initial={{ x: "-100%" }}
                        whileHover={{ x: "100%" }}
                        transition={{ duration: 1.5, ease: "easeInOut" }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                      />
                      
                      {/* Subtle pulse effect */}
                      <motion.div
                        animate={{
                          opacity: [0, 0.15, 0],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className={`absolute inset-0 bg-gradient-to-br ${gradients[index]} opacity-0`}
                      />
                    </div>
                    
                    {/* Enhanced Arrow Connector */}
                    {index < 5 && (
                      <div className="hidden lg:block absolute top-1/2 -right-4 w-10 h-1 bg-gradient-to-r from-indigo-500/60 via-purple-500/60 to-pink-500/60 z-20">
                        <motion.div
                          animate={{ 
                            x: [0, 10, 0],
                            scale: [1, 1.2, 1]
                          }}
                          transition={{ 
                            duration: 2, 
                            repeat: Infinity, 
                            ease: "easeInOut" 
                          }}
                          className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 rounded-full shadow-lg"
                        />
                        <motion.div
                          animate={{
                            opacity: [0.5, 1, 0.5],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                          className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full blur-sm"
                        />
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 5️⃣ Visual Learning Flow (Mermaid.js) */}
      <section className="relative py-40 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-b from-gray-900 via-gray-950 to-gray-900">
        {/* Enhanced Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(99,102,241,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(168,85,247,0.15),transparent_50%)]" />
        
        {/* Animated gradient orbs */}
        <motion.div
          animate={{
              x: [0, 100, 0],
              y: [0, 80, 0],
              scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
            className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-br from-indigo-500/30 via-purple-500/30 to-pink-500/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
              x: [0, -90, 0],
            y: [0, -80, 0],
              scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
            className="absolute bottom-20 right-20 w-[500px] h-[500px] bg-gradient-to-br from-purple-500/30 via-pink-500/30 to-rose-500/30 rounded-full blur-3xl"
          />
          
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808010_1px,transparent_1px),linear-gradient(to_bottom,#80808010_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        </div>
        
        <div className="relative max-w-7xl mx-auto">
          {/* Enhanced Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            {/* Badge */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-block mb-8"
            >
        <motion.div
          animate={{
                  boxShadow: [
                    "0 0 20px rgba(99, 102, 241, 0.4)",
                    "0 0 35px rgba(168, 85, 247, 0.5)",
                    "0 0 20px rgba(99, 102, 241, 0.4)",
                  ]
          }}
          transition={{
                  duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
                className="relative"
              >
                <span className="relative px-8 py-3 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 border-2 border-indigo-500/40 rounded-full text-indigo-300 font-bold text-sm backdrop-blur-md shadow-lg">
                  Learning Cycle
                </span>
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-indigo-500/30 via-purple-500/30 to-pink-500/30 rounded-full blur-xl -z-10"
                />
              </motion.div>
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-6xl lg:text-7xl xl:text-9xl font-extrabold mb-8 leading-tight"
            >
              <motion.span 
                className="block text-white drop-shadow-2xl mb-2"
                animate={{
                  textShadow: [
                    "0 0 20px rgba(99, 102, 241, 0.4)",
                    "0 0 30px rgba(168, 85, 247, 0.5)",
                    "0 0 20px rgba(99, 102, 241, 0.4)",
                  ]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                Visual Learning
              </motion.span>
              <motion.span 
                className="block bg-gradient-to-r from-indigo-400 via-purple-400 via-pink-400 to-rose-400 bg-clip-text text-transparent drop-shadow-2xl"
                animate={{
                  backgroundPosition: ["0%", "100%", "0%"],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "linear"
                }}
                style={{
                  backgroundSize: "200% 200%",
                }}
              >
                Flow
              </motion.span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed"
            >
              See how AI transforms your learning journey into a continuous improvement cycle
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative bg-gray-900/90 backdrop-blur-xl rounded-3xl p-12 border-2 border-gray-800/50 overflow-hidden shadow-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10" />
            
            {/* Custom Animated Flow Diagram */}
            <div className="relative z-10 min-h-[500px] flex flex-col items-center justify-center">
              {/* Desktop Horizontal Flow */}
              <div className="hidden lg:flex items-center justify-center gap-4 flex-wrap">
                {[
                  { label: 'Upload Notes', gradient: 'from-indigo-500 to-indigo-600', icon: Upload },
                  { label: 'AI Analysis', gradient: 'from-purple-500 to-purple-600', icon: Sparkles, isAction: true },
                  { label: 'Topics Extracted', gradient: 'from-pink-500 to-pink-600', icon: BookOpen },
                  { label: 'Personalization', gradient: 'from-rose-500 to-rose-600', icon: Brain, isAction: true },
                  { label: 'Study Roadmap', gradient: 'from-indigo-500 to-indigo-600', icon: Calendar },
                  { label: 'Track Progress', gradient: 'from-purple-500 to-purple-600', icon: Zap, isAction: true },
                  { label: 'Mark Complete', gradient: 'from-pink-500 to-pink-600', icon: CheckCircle2 },
                  { label: 'Ask Questions', gradient: 'from-rose-500 to-rose-600', icon: TrendingUp, isAction: true },
                  { label: 'Get AI Answers', gradient: 'from-indigo-500 to-indigo-600', icon: Brain },
                ].map((item, index) => {
                  const Icon = item.icon
                  return (
                    <div key={index} className="flex items-center gap-4">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        whileHover={{ scale: 1.1, y: -5 }}
                        className={`relative group ${item.isAction ? 'flex-col' : ''}`}
                      >
                        {item.isAction ? (
                          <motion.div
                            animate={{
                              opacity: [0.5, 1, 0.5],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                            className="text-sm font-semibold text-gray-400 mb-2"
                          >
                            {item.label}
                          </motion.div>
                        ) : (
                          <div className={`relative bg-gradient-to-br ${item.gradient} rounded-2xl p-6 shadow-xl group-hover:shadow-2xl transition-all duration-300 min-w-[140px]`}>
                            <div className="flex flex-col items-center gap-3">
                              <Icon className="h-8 w-8 text-white" />
                              <span className="text-white font-bold text-sm text-center">{item.label}</span>
                            </div>
                            <motion.div
                              animate={{
                                scale: [1, 1.1, 1],
                                opacity: [0.3, 0.6, 0.3],
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                              className={`absolute inset-0 bg-gradient-to-br ${item.gradient} rounded-2xl blur-xl -z-10`}
                            />
                          </div>
                        )}
                      </motion.div>
                      {index < 10 && (
                        <motion.div
                          initial={{ scaleX: 0 }}
                          whileInView={{ scaleX: 1 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
                          className="hidden lg:block"
                        >
                          <motion.div
                            animate={{
                              x: [0, 10, 0],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                            className="w-12 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full"
                          >
                            <motion.div
                              animate={{
                                x: [0, 48, 0],
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                              className="w-4 h-4 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full -mt-1.5 shadow-lg"
                            />
                          </motion.div>
                        </motion.div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Mobile/Tablet Vertical Flow */}
              <div className="lg:hidden flex flex-col items-center gap-6 w-full">
                {[
                  { label: 'Upload Notes', gradient: 'from-indigo-500 to-indigo-600', icon: Upload },
                  { label: 'AI Analysis', gradient: 'from-purple-500 to-purple-600', icon: Sparkles, isAction: true },
                  { label: 'Topics Extracted', gradient: 'from-pink-500 to-pink-600', icon: BookOpen },
                  { label: 'Personalization', gradient: 'from-rose-500 to-rose-600', icon: Brain, isAction: true },
                  { label: 'Study Roadmap', gradient: 'from-indigo-500 to-indigo-600', icon: Calendar },
                  { label: 'Track Progress', gradient: 'from-purple-500 to-purple-600', icon: Zap, isAction: true },
                  { label: 'Mark Complete', gradient: 'from-pink-500 to-pink-600', icon: CheckCircle2 },
                  { label: 'Ask Questions', gradient: 'from-rose-500 to-rose-600', icon: TrendingUp, isAction: true },
                  { label: 'Get AI Answers', gradient: 'from-indigo-500 to-indigo-600', icon: Brain },
                ].map((item, index) => {
                  const Icon = item.icon
                  return (
                    <div key={index} className="flex flex-col items-center gap-3 w-full">
                      {item.isAction ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                          viewport={{ once: true }}
                          animate={{
                            opacity: [0.5, 1, 0.5],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                          className="text-sm font-semibold text-gray-400"
                        >
                          {item.label}
                        </motion.div>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.5, delay: index * 0.1 }}
                          whileHover={{ scale: 1.1 }}
                          className={`relative bg-gradient-to-br ${item.gradient} rounded-2xl p-6 shadow-xl w-full max-w-[200px]`}
                        >
                          <div className="flex flex-col items-center gap-3">
                            <Icon className="h-8 w-8 text-white" />
                            <span className="text-white font-bold text-sm text-center">{item.label}</span>
                          </div>
                          <motion.div
                            animate={{
                              scale: [1, 1.1, 1],
                              opacity: [0.3, 0.6, 0.3],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                            className={`absolute inset-0 bg-gradient-to-br ${item.gradient} rounded-2xl blur-xl -z-10`}
                          />
                        </motion.div>
                      )}
                      {index < 10 && (
                        <motion.div
                          initial={{ scaleY: 0 }}
                          whileInView={{ scaleY: 1 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
                          className="flex flex-col items-center"
                        >
                          <motion.div
                            animate={{
                              y: [0, 10, 0],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                            className="w-1 h-12 bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500 rounded-full"
                          >
                            <motion.div
                              animate={{
                                y: [0, 48, 0],
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                              className="w-4 h-4 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full -ml-1.5 shadow-lg"
                            />
                          </motion.div>
                        </motion.div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 6️⃣ Who Is This For? */}
      <section className="relative py-40 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
        {/* Enhanced Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(99,102,241,0.2),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(168,85,247,0.2),transparent_50%)]" />
          
          {/* Animated gradient orbs */}
          <motion.div
            animate={{
              x: [0, 100, 0],
              y: [0, 80, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
              duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
            className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-br from-indigo-500/30 via-purple-500/30 to-pink-500/30 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              x: [0, -90, 0],
              y: [0, -80, 0],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute bottom-20 right-20 w-[500px] h-[500px] bg-gradient-to-br from-purple-500/30 via-pink-500/30 to-rose-500/30 rounded-full blur-3xl"
        />
        
        {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808010_1px,transparent_1px),linear-gradient(to_bottom,#80808010_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        </div>
        
        <div className="relative max-w-7xl mx-auto">
          {/* Enhanced Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-24"
          >
          {/* Badge */}
          <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-block mb-8"
          >
              <motion.div
                animate={{
                  boxShadow: [
                    "0 0 20px rgba(99, 102, 241, 0.4)",
                    "0 0 35px rgba(168, 85, 247, 0.5)",
                    "0 0 20px rgba(99, 102, 241, 0.4)",
                  ]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="relative"
              >
                <span className="relative px-8 py-3 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 border-2 border-indigo-500/40 rounded-full text-indigo-300 font-bold text-sm backdrop-blur-md shadow-lg">
                  Target Audience
            </span>
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-indigo-500/30 via-purple-500/30 to-pink-500/30 rounded-full blur-xl -z-10"
                />
              </motion.div>
          </motion.div>

          <motion.h2
              initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-6xl lg:text-7xl xl:text-9xl font-extrabold mb-8 leading-tight"
            >
              <motion.span 
                className="block text-white drop-shadow-2xl mb-2"
                animate={{
                  textShadow: [
                    "0 0 20px rgba(99, 102, 241, 0.4)",
                    "0 0 30px rgba(168, 85, 247, 0.5)",
                    "0 0 20px rgba(99, 102, 241, 0.4)",
                  ]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                Who Is This
              </motion.span>
              <motion.span 
                className="block bg-gradient-to-r from-indigo-400 via-purple-400 via-pink-400 to-rose-400 bg-clip-text text-transparent drop-shadow-2xl"
                animate={{
                  backgroundPosition: ["0%", "100%", "0%"],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "linear"
                }}
                style={{
                  backgroundSize: "200% 200%",
                }}
              >
                For?
              </motion.span>
          </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed"
            >
              Designed for learners at every stage of their academic journey
            </motion.p>
          </motion.div>

          {/* Enhanced User Cards */}
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: GraduationCap,
                title: 'School students',
                subtitle: '9–12',
                description: 'Perfect for high school students preparing for board exams',
                gradient: 'from-indigo-500 via-purple-500 to-pink-500',
                glowColor: 'indigo',
              },
              {
                icon: BookOpen,
                title: 'College students',
                subtitle: 'All levels',
                description: 'Ideal for undergraduate and graduate students',
                gradient: 'from-purple-500 via-pink-500 to-rose-500',
                glowColor: 'purple',
              },
              {
                icon: Award,
                title: 'Competitive exam aspirants',
                subtitle: 'JEE, NEET, GATE',
                description: 'Tailored for competitive exam preparation',
                gradient: 'from-pink-500 via-rose-500 to-purple-500',
                glowColor: 'pink',
              },
            ].map((user, index) => {
              const Icon = user.icon
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 50, scale: 0.9 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.15 }}
                  whileHover={{ y: -15, scale: 1.03 }}
                  className="group relative"
                >
                  {/* Enhanced Glow effect */}
                  <motion.div
                    animate={{
                      opacity: [0.4, 0.7, 0.4],
                      scale: [1, 1.08, 1],
                    }}
                    transition={{
                      duration: 2 + index * 0.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className={`absolute -inset-3 bg-gradient-to-r ${user.gradient} rounded-3xl blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                  />
                  
                  {/* Enhanced Card */}
                  <div className="relative bg-gray-900/95 backdrop-blur-xl rounded-3xl p-10 border-2 border-gray-800/50 group-hover:border-gray-700/90 transition-all duration-500 overflow-hidden text-center shadow-2xl group-hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.6)]">
                    {/* Animated gradient background */}
                    <motion.div
                      animate={{
                        backgroundPosition: ["0%", "100%", "0%"],
                      }}
                      transition={{
                        duration: 5,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                      className={`absolute inset-0 bg-gradient-to-br ${user.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500`}
                      style={{
                        backgroundSize: "200% 200%",
                      }}
                    />
                    
                    {/* Multiple decorative accents */}
                    <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br ${user.gradient} opacity-0 group-hover:opacity-15 transition-opacity duration-500 blur-3xl`} />
                    <div className={`absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr ${user.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-2xl`} />
                    
                    <div className="relative z-10">
                      {/* Enhanced Icon */}
                      <motion.div
                        whileHover={{ scale: 1.25, rotate: [0, -10, 10, 0] }}
                        className={`relative inline-flex p-7 bg-gradient-to-br ${user.gradient} rounded-3xl mb-8 shadow-2xl ${
                          user.glowColor === 'indigo' ? 'shadow-indigo-500/60' :
                          user.glowColor === 'purple' ? 'shadow-purple-500/60' :
                          'shadow-pink-500/60'
                        } group-hover:shadow-[0_0_40px_rgba(99,102,241,0.7)] transition-all duration-500`}
                      >
                        <Icon className="h-14 w-14 text-white relative z-10" />
                        <motion.div
                          animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.4, 0.8, 0.4],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                          className="absolute inset-0 bg-white/40 rounded-3xl"
                        />
                        <motion.div
                          animate={{
                            rotate: 360,
                          }}
                          transition={{
                            duration: 20,
                            repeat: Infinity,
                            ease: "linear"
                          }}
                          className={`absolute -inset-2 bg-gradient-to-r ${user.gradient} rounded-3xl blur-lg opacity-40`}
                        />
                      </motion.div>
                      
                      {/* Enhanced Title */}
                      <h3 className="text-2xl md:text-3xl font-bold mb-3 text-white group-hover:bg-gradient-to-r group-hover:from-indigo-400 group-hover:via-purple-400 group-hover:to-pink-400 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300 leading-tight">
                        {user.title}
                      </h3>
                      
                      {/* Enhanced Subtitle */}
                      <p className="text-xl font-semibold mb-4 bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                        {user.subtitle}
                      </p>

          {/* Description */}
                      <p className="text-base text-gray-400 group-hover:text-gray-200 transition-colors duration-300 leading-relaxed">
                        {user.description}
                      </p>
                      
                      {/* Decorative line */}
                      <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        whileInView={{ width: "100%", opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: index * 0.15 + 0.5 }}
                        className={`mt-8 h-1.5 bg-gradient-to-r ${user.gradient} rounded-full shadow-lg mx-auto`}
                        style={{ maxWidth: '80px' }}
                      />
                    </div>
                    
                    {/* Enhanced shine effect on hover */}
                    <motion.div
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "100%" }}
                      transition={{ duration: 1.5, ease: "easeInOut" }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                    />
                    
                    {/* Subtle pulse effect */}
                    <motion.div
                      animate={{
                        opacity: [0, 0.15, 0],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className={`absolute inset-0 bg-gradient-to-br ${user.gradient} opacity-0`}
                    />
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 7️⃣ Tech Stack */}
      <section className="relative py-40 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-b from-gray-900 via-gray-950 to-gray-900">
        {/* Enhanced Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(99,102,241,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(168,85,247,0.15),transparent_50%)]" />
          
          {/* Animated gradient orbs */}
          <motion.div
            animate={{
              x: [0, 100, 0],
              y: [0, 80, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-br from-indigo-500/30 via-purple-500/30 to-pink-500/30 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              x: [0, -90, 0],
              y: [0, -80, 0],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute bottom-20 right-20 w-[500px] h-[500px] bg-gradient-to-br from-purple-500/30 via-pink-500/30 to-rose-500/30 rounded-full blur-3xl"
          />
          
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808010_1px,transparent_1px),linear-gradient(to_bottom,#80808010_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        </div>
        
        <div className="relative max-w-7xl mx-auto">
          {/* Enhanced Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-24"
          >
            {/* Badge */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-block mb-8"
            >
              <motion.div
                animate={{
                  boxShadow: [
                    "0 0 20px rgba(99, 102, 241, 0.4)",
                    "0 0 35px rgba(168, 85, 247, 0.5)",
                    "0 0 20px rgba(99, 102, 241, 0.4)",
                  ]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="relative"
              >
                <span className="relative px-8 py-3 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 border-2 border-indigo-500/40 rounded-full text-indigo-300 font-bold text-sm backdrop-blur-md shadow-lg">
                  Tech Stack
                </span>
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-indigo-500/30 via-purple-500/30 to-pink-500/30 rounded-full blur-xl -z-10"
                />
              </motion.div>
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-6xl lg:text-7xl xl:text-9xl font-extrabold mb-8 leading-tight"
            >
              <motion.span 
                className="block text-white drop-shadow-2xl mb-2"
                animate={{
                  textShadow: [
                    "0 0 20px rgba(99, 102, 241, 0.4)",
                    "0 0 30px rgba(168, 85, 247, 0.5)",
                    "0 0 20px rgba(99, 102, 241, 0.4)",
                  ]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                Built With Modern
              </motion.span>
              <motion.span 
                className="block bg-gradient-to-r from-indigo-400 via-purple-400 via-pink-400 to-rose-400 bg-clip-text text-transparent drop-shadow-2xl"
                animate={{
                  backgroundPosition: ["0%", "100%", "0%"],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "linear"
                }}
                style={{
                  backgroundSize: "200% 200%",
                }}
              >
                Technologies
              </motion.span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed"
            >
              Built with modern, scalable technologies
          </motion.p>
          </motion.div>
          
          {/* Enhanced Tech Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
            {[
              { name: 'Next.js', icon: Code, gradient: 'from-indigo-500 via-purple-500 to-pink-500', glowColor: 'indigo' },
              { name: 'FastAPI', icon: Code, gradient: 'from-purple-500 via-pink-500 to-rose-500', glowColor: 'purple' },
              { name: 'Gemini', icon: Sparkles, gradient: 'from-pink-500 via-rose-500 to-purple-500', glowColor: 'pink' },
              { name: 'Supabase', icon: Database, gradient: 'from-rose-500 via-pink-500 to-indigo-500', glowColor: 'rose' },
              { name: 'Pinecone', icon: Database, gradient: 'from-indigo-400 via-purple-400 to-pink-400', glowColor: 'indigo' },
            ].map((tech, index) => {
              const Icon = tech.icon
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8, y: 30 }}
                  whileInView={{ opacity: 1, scale: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ scale: 1.1, y: -10 }}
                  className="group relative"
                >
                  {/* Enhanced Glow effect */}
                  <motion.div
                    animate={{
                      opacity: [0.3, 0.6, 0.3],
                      scale: [1, 1.05, 1],
                    }}
                    transition={{
                      duration: 2 + index * 0.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className={`absolute -inset-2 bg-gradient-to-r ${tech.gradient} rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                  />
                  
                  {/* Enhanced Card */}
                  <div className="relative bg-gray-900/95 backdrop-blur-xl rounded-3xl p-8 border-2 border-gray-800/50 group-hover:border-gray-700/80 transition-all duration-500 overflow-hidden text-center shadow-2xl group-hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
                    {/* Animated gradient background */}
                    <motion.div
                      animate={{
                        backgroundPosition: ["0%", "100%", "0%"],
                      }}
                      transition={{
                        duration: 5,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                      className={`absolute inset-0 bg-gradient-to-br ${tech.gradient} opacity-0 group-hover:opacity-15 transition-opacity duration-500`}
                      style={{
                        backgroundSize: "200% 200%",
                      }}
                    />
                    
                    {/* Decorative accents */}
                    <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${tech.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-2xl`} />
                    
                    <div className="relative z-10">
                      {/* Enhanced Icon */}
                      <motion.div
                        whileHover={{ scale: 1.2, rotate: [0, -5, 5, 0] }}
                        className={`relative inline-flex p-5 bg-gradient-to-br ${tech.gradient} rounded-3xl mb-6 shadow-2xl ${
                          tech.glowColor === 'indigo' ? 'shadow-indigo-500/60' :
                          tech.glowColor === 'purple' ? 'shadow-purple-500/60' :
                          tech.glowColor === 'pink' ? 'shadow-pink-500/60' :
                          'shadow-rose-500/60'
                        } group-hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] transition-all duration-500`}
                      >
                        <Icon className="h-10 w-10 text-white relative z-10" />
                        <motion.div
                          animate={{
                            scale: [1, 1.15, 1],
                            opacity: [0.4, 0.7, 0.4],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                          className="absolute inset-0 bg-white/30 rounded-3xl"
                        />
                        <motion.div
                          animate={{
                            rotate: 360,
                          }}
                          transition={{
                            duration: 20,
                            repeat: Infinity,
                            ease: "linear"
                          }}
                          className={`absolute -inset-1 bg-gradient-to-r ${tech.gradient} rounded-3xl blur opacity-30`}
                        />
                      </motion.div>
                      
                      {/* Enhanced Name */}
                      <p className="text-lg md:text-xl font-bold text-white group-hover:bg-gradient-to-r group-hover:from-indigo-400 group-hover:via-purple-400 group-hover:to-pink-400 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300">
                        {tech.name}
                      </p>
                    </div>
                    
                    {/* Enhanced shine effect on hover */}
                    <motion.div
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "100%" }}
                      transition={{ duration: 1.5, ease: "easeInOut" }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    />
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 8️⃣ Final CTA */}
      <section className="relative py-40 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950" />
        
        <motion.div
          animate={{
            x: [0, 150, 0],
            y: [0, 100, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-10 left-10 w-[600px] h-[600px] bg-gradient-to-br from-indigo-500/30 via-purple-500/30 to-pink-500/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, -120, 0],
            y: [0, -80, 0],
            scale: [1, 1.4, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-10 right-10 w-[700px] h-[700px] bg-gradient-to-br from-purple-500/30 via-pink-500/30 to-indigo-500/30 rounded-full blur-3xl"
        />
        
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:4rem_4rem]" />

        <div className="relative max-w-5xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold mb-8 leading-tight"
          >
            <span className="block text-white drop-shadow-2xl">
              Turn Confusion Into
            </span>
            <span className="block bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-2xl">
              a Clear Study Plan
            </span>
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link
              href="/dashboard"
              className="group relative inline-flex items-center px-12 py-6 rounded-2xl font-bold text-xl overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative z-10 flex items-center text-white">
                🚀 Start Studying Smarter
                <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-2 transition-transform duration-300" />
              </span>
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
