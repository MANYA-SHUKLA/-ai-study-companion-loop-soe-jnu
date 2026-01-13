'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { GraduationCap, BookOpen, FileText, Calendar, Menu, X, LogOut, LogIn, Search, Sparkles, Zap, Star } from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { useAuth } from './AuthProvider'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const { scrollY } = useScroll()
  const navOpacity = useTransform(scrollY, [0, 50], [0.95, 1])
  const navBlur = useTransform(scrollY, [0, 50], [20, 30])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
      // Small delay to ensure session is fully cleared
      await new Promise(resolve => setTimeout(resolve, 100))
      // Force a hard redirect to ensure session is cleared and page reloads
      window.location.href = '/login'
    } catch (error) {
      console.error('Error signing out:', error)
      // Still redirect even if there's an error
      window.location.href = '/login'
    }
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Zap, gradient: 'from-blue-400 to-cyan-400' },
    { href: '/how-it-works', label: 'How It Works', icon: Star, gradient: 'from-yellow-400 to-orange-400' },
    { href: '/subjects', label: 'Subjects', icon: BookOpen, gradient: 'from-green-400 to-emerald-400' },
    { href: '/notes', label: 'Notes', icon: FileText, gradient: 'from-purple-400 to-pink-400' },
    { href: '/study-plans', label: 'Study Plans', icon: Calendar, gradient: 'from-rose-400 to-red-400' },
    { href: '/search', label: 'Search', icon: Search, gradient: 'from-indigo-400 to-blue-400' },
  ]

  return (
    <motion.nav 
      style={{ opacity: navOpacity }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled ? 'shadow-2xl shadow-indigo-500/20' : ''
      }`}
    >
      {/* Animated mesh gradient background */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div 
          animate={{
            backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute inset-0 bg-gradient-to-r from-indigo-600/30 via-purple-600/30 via-pink-600/30 to-indigo-600/30 bg-[length:200%_200%]"
          style={{ filter: `blur(${navBlur}px)` }}
        />
      </div>
      
      {/* Ultra glass effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950/95 via-gray-900/90 to-gray-950/95 backdrop-blur-2xl" />
      
      {/* Animated gradient border - bottom */}
      <motion.div 
        animate={{
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 via-purple-500 via-pink-500 to-transparent bg-[length:200%_100%]"
      />
      
      {/* Top subtle glow */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo Section - Enhanced */}
          <Link href="/" className="flex items-center space-x-3 group relative z-10">
            <div className="relative">
              {/* Multi-layer animated glow */}
              <motion.div 
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl blur-2xl"
              />
              
              {/* Icon container with 3D effect */}
              <motion.div 
                whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className="relative"
              >
                <div className="relative p-3 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl shadow-indigo-500/50 group-hover:shadow-purple-500/70 transition-all duration-500">
                  <GraduationCap className="h-7 w-7 text-white relative z-10" />
                  {/* Glass shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent rounded-2xl" />
                  {/* Inner glow */}
                  <div className="absolute inset-[2px] bg-gradient-to-br from-white/10 to-transparent rounded-2xl" />
                </div>
              </motion.div>
              
              {/* Orbiting sparkles */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0"
              >
                <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-yellow-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
              </motion.div>
              
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0"
              >
                <div className="absolute -bottom-1 -left-1 h-3 w-3 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-400/50" />
              </motion.div>
            </div>
            
            <div className="flex flex-col">
              <motion.span 
                className="text-xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent hidden sm:block"
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "linear"
                }}
                style={{
                  backgroundSize: '200% 200%',
                  backgroundImage: 'linear-gradient(90deg, #818cf8, #c084fc, #f9a8d4, #818cf8)'
                }}
              >
                Study Companion
              </motion.span>
              <span className="text-xs text-indigo-400/70 font-medium hidden sm:block group-hover:text-purple-400/90 transition-colors">
                AI-Powered Learning
              </span>
            </div>
          </Link>

          {/* Desktop Navigation - Enhanced */}
          {user && (
            <div className="hidden md:flex items-center gap-2 bg-gray-900/60 backdrop-blur-md rounded-2xl p-2 border border-indigo-900/30 shadow-2xl shadow-indigo-500/10">
              {navItems.map((item, index) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="relative group"
                  >
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className="relative"
                    >
                      <div className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 ${
                        isActive
                          ? 'text-white'
                          : 'text-gray-300 hover:text-white'
                      }`}>
                        {/* Active background with gradient */}
                        {isActive && (
                          <motion.div
                            layoutId="activeTab"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            className="absolute inset-0"
                          >
                            <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} rounded-xl shadow-xl opacity-90`} />
                            {/* Glow effect */}
                            <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} rounded-xl blur-md opacity-50`} />
                          </motion.div>
                        )}
                        
                        {/* Hover background */}
                        {!isActive && (
                          <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        )}
                        
                        {/* Icon with animation */}
                        <motion.div
                          animate={isActive ? {
                            rotate: [0, -10, 10, -10, 0],
                          } : {}}
                          transition={{
                            duration: 0.5,
                            ease: "easeInOut"
                          }}
                        >
                          <Icon className={`h-4 w-4 relative z-10 ${
                            isActive ? 'text-white drop-shadow-lg' : 'text-gray-300 group-hover:text-white'
                          }`} />
                        </motion.div>
                        
                        <span className={`relative z-10 font-medium text-sm ${
                          isActive ? 'text-white drop-shadow-lg' : 'text-gray-300 group-hover:text-white'
                        }`}>
                          {item.label}
                        </span>
                        
                        {/* Sparkle on active */}
                        {isActive && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: [0, 1.2, 1] }}
                            transition={{ duration: 0.3 }}
                            className="relative z-10"
                          >
                            <Sparkles className="h-3 w-3 text-yellow-300 drop-shadow-lg" />
                          </motion.div>
                        )}
                      </div>
                      
                      {/* Tooltip on hover */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileHover={{ opacity: 1, y: 0 }}
                        className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-50"
                      >
                        <div className={`text-xs font-medium bg-gradient-to-r ${item.gradient} bg-clip-text text-transparent`}>
                          {item.label}
                        </div>
                        {/* Arrow */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 border-l border-t border-gray-700 rotate-45" />
                      </motion.div>
                    </motion.div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Right Side Actions - Enhanced */}
          <div className="flex items-center gap-3 relative z-10">
            {user ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="hidden md:block relative group"
              >
                <button
                  onClick={handleSignOut}
                  aria-label="Sign out"
                  className="relative flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 via-pink-500 to-rose-500 text-white rounded-xl font-medium shadow-2xl shadow-red-500/40 hover:shadow-red-500/60 transition-all duration-300 overflow-hidden focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-gray-950"
                >
                  {/* Animated shine effect */}
                  <motion.div
                    animate={{
                      x: ['-200%', '200%'],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  />
                  <LogOut className="h-4 w-4 relative z-10" aria-hidden="true" />
                  <span className="relative z-10">Sign Out</span>
                </button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="hidden md:block relative group"
              >
                <Link
                  href="/login"
                  className="relative flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-xl font-medium shadow-2xl shadow-indigo-500/40 hover:shadow-purple-500/60 transition-all duration-300 overflow-hidden"
                >
                  {/* Animated shine effect */}
                  <motion.div
                    animate={{
                      x: ['-200%', '200%'],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  />
                  <LogIn className="h-4 w-4 relative z-10" />
                  <span className="relative z-10">Sign In</span>
                </Link>
              </motion.div>
            )}
            
            {/* Mobile Menu Button - Enhanced */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="md:hidden"
            >
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="relative p-3 rounded-xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-400 hover:from-indigo-500/30 hover:to-purple-500/30 border border-indigo-900/50 hover:border-indigo-700/50 shadow-lg hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-950 overflow-hidden"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-navigation"
              >
                {/* Background pulse on open */}
                {mobileMenuOpen && (
                  <motion.div
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.5, 0, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                    className="absolute inset-0 bg-purple-500/30 rounded-xl"
                  />
                )}
                
                <AnimatePresence mode="wait">
                  {mobileMenuOpen ? (
                    <motion.div
                      key="close"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <X className="h-6 w-6 relative z-10" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="open"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Menu className="h-6 w-6 relative z-10" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation - Enhanced */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="md:hidden relative overflow-hidden" id="mobile-navigation">
              {/* Animated gradient background */}
              <motion.div 
                animate={{
                  backgroundPosition: ['0% 0%', '100% 100%'],
                }}
                transition={{
                  duration: 10,
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: "linear"
                }}
                className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 via-purple-600/20 to-pink-600/20 bg-[length:200%_200%]"
              />
              
              {/* Glass overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-gray-950/95 to-gray-900/95 backdrop-blur-2xl border-t border-indigo-900/30" />
              
              <nav className="relative px-4 py-6 space-y-3" role="navigation" aria-label="Mobile navigation">
                {user ? (
                  <>
                    {navItems.map((item, index) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                      return (
                        <motion.div
                          key={item.href}
                          initial={{ opacity: 0, x: -40, scale: 0.9 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          transition={{ 
                            delay: index * 0.06,
                            type: "spring",
                            stiffness: 260,
                            damping: 20
                          }}
                        >
                          <Link
                            href={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className="relative group block"
                          >
                            <div className={`flex items-center gap-3 px-5 py-4 rounded-xl transition-all duration-300 ${
                              isActive
                                ? 'text-white'
                                : 'text-gray-300'
                            }`}>
                              {/* Active background */}
                              {isActive && (
                                <motion.div
                                  layoutId="mobilActiveTab"
                                  className="absolute inset-0"
                                >
                                  <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} rounded-xl shadow-2xl`} />
                                  <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} rounded-xl blur-lg opacity-50`} />
                                </motion.div>
                              )}
                              
                              {/* Hover background */}
                              {!isActive && (
                                <div className="absolute inset-0 bg-gray-800/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 border border-indigo-900/30" />
                              )}
                              
                              <Icon className={`h-6 w-6 relative z-10 ${
                                isActive ? 'text-white drop-shadow-lg' : 'text-gray-300 group-hover:text-white'
                              }`} />
                              <span className={`font-medium text-base relative z-10 ${
                                isActive ? 'text-white drop-shadow-lg' : 'text-gray-300 group-hover:text-white'
                              }`}>
                                {item.label}
                              </span>
                              
                              {isActive && (
                                <Sparkles className="h-4 w-4 text-yellow-300 ml-auto relative z-10 drop-shadow-lg" />
                              )}
                            </div>
                          </Link>
                        </motion.div>
                      )
                    })}
                    
                    {/* Sign Out Button */}
                    <motion.div
                      initial={{ opacity: 0, x: -40, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      transition={{ 
                        delay: navItems.length * 0.06,
                        type: "spring",
                        stiffness: 260,
                        damping: 20
                      }}
                    >
                      <button
                        onClick={() => {
                          handleSignOut()
                          setMobileMenuOpen(false)
                        }}
                        aria-label="Sign out"
                        className="relative flex items-center gap-3 px-5 py-4 rounded-xl w-full font-medium overflow-hidden group"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-pink-500 to-rose-500" />
                        <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-500 blur-xl opacity-50" />
                        
                        {/* Shine effect */}
                        <motion.div
                          animate={{
                            x: ['-200%', '200%'],
                          }}
                          transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        />
                        
                        <LogOut className="h-6 w-6 text-white relative z-10 drop-shadow-lg" aria-hidden="true" />
                        <span className="text-white relative z-10 drop-shadow-lg">Sign Out</span>
                      </button>
                    </motion.div>
                  </>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, x: -40, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ 
                      type: "spring",
                      stiffness: 260,
                      damping: 20
                    }}
                  >
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="relative flex items-center gap-3 px-5 py-4 rounded-xl font-medium overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-pink-500 blur-xl opacity-50" />
                      
                      {/* Shine effect */}
                      <motion.div
                        animate={{
                          x: ['-200%', '200%'],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      />
                      
                      <LogIn className="h-6 w-6 text-white relative z-10 drop-shadow-lg" />
                      <span className="text-white relative z-10 drop-shadow-lg">Sign In</span>
                    </Link>
                  </motion.div>
                )}
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}
