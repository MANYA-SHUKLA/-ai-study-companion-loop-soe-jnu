'use client'

import { motion } from 'framer-motion'

export default function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="relative py-8 px-4 sm:px-6 lg:px-8 border-t border-gray-800/50 bg-gray-950/50 backdrop-blur-sm"
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Made with <span className="text-pink-500">♥</span> by{' '}
            <span className="font-semibold text-gray-400">MAHI-RAJ</span>{' '}
            <a
              href="https://manya-shukla.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
            >
              Manya Shukla
            </a>
            {' & '}
            <a
              href="https://rajkumaryogi.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 transition-colors font-medium"
            >
              Rajkumar Yogi
            </a>
          </p>
        </div>
      </div>
    </motion.footer>
  )
}

