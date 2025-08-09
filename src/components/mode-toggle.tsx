'use client'

import { motion } from 'framer-motion'

interface ModeToggleProps {
  currentMode: 'thankan' | 'thani'
  onModeChange: (mode: 'thankan' | 'thani') => void
}

export function ModeToggle({ currentMode, onModeChange }: ModeToggleProps) {
  const isThaniMode = currentMode === 'thani'

  return (
    <motion.div
      className="flex items-center gap-2"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className={`relative w-16 h-8 rounded-full cursor-pointer transition-all duration-300 ${
          isThaniMode ? 'bg-red-800' : 'bg-amber-600'
        }`}
        onClick={() => onModeChange(isThaniMode ? 'thankan' : 'thani')}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          className={`absolute top-1 w-6 h-6 rounded-full shadow-md transition-all duration-300 ${
            isThaniMode ? 'bg-red-200' : 'bg-amber-100'
          }`}
          animate={{
            x: isThaniMode ? 36 : 4,
          }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </motion.div>
    </motion.div>
  )
}
