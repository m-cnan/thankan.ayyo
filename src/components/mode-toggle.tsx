'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

interface ModeToggleProps {
  currentMode: 'thankan' | 'thani'
  onModeChange: (mode: 'thankan' | 'thani') => void
}

export function ModeToggle({ currentMode, onModeChange }: ModeToggleProps) {
  const [isMobile, setIsMobile] = useState(false)
  const isThaniMode = currentMode === 'thani'

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <motion.div
      className="flex items-center gap-2"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className={`relative w-14 h-7 sm:w-16 sm:h-8 rounded-full cursor-pointer transition-all duration-300 shadow-lg ${
          isThaniMode 
            ? 'bg-red-800 shadow-red-900/50' 
            : 'bg-orange-600 shadow-orange-700/50 border border-orange-500'
        }`}
        onClick={() => onModeChange(isThaniMode ? 'thankan' : 'thani')}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          className={`absolute top-0.5 w-5 h-5 sm:w-6 sm:h-6 sm:top-1 rounded-full shadow-lg transition-all duration-300 ${
            isThaniMode 
              ? 'bg-red-200 shadow-red-300/50' 
              : 'bg-white shadow-amber-300/50 border border-amber-200'
          }`}
          animate={{
            x: isThaniMode ? (isMobile ? 30 : 36) : 4,
          }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </motion.div>
    </motion.div>
  )
}
