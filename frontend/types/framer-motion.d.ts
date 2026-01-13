import 'react'

declare module 'framer-motion' {
  // Extend motion components to properly support HTML attributes
  export interface MotionProps {
    className?: string
    type?: string
    disabled?: boolean
    [key: string]: any
  }
}

