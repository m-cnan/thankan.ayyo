'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle } from 'lucide-react'

interface ModeDisclaimerProps {
  isVisible: boolean
  onClose: () => void
  onConfirm: () => void
}

export function ModeDisclaimer({ isVisible, onClose, onConfirm }: ModeDisclaimerProps) {
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    if (isVisible && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [isVisible, countdown])

  useEffect(() => {
    if (isVisible) {
      setCountdown(5)
    }
  }, [isVisible])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gray-900 border-2 border-red-600 rounded-2xl p-8 max-w-md w-full shadow-2xl shadow-red-600/20"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-red-500" size={24} />
                <h2 className="text-xl font-bold text-red-100">Content Warning</h2>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-red-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4">
                <p className="text-red-100 font-medium text-center">
                  🔞 Thani Thankan is rated U for Uncle
                </p>
              </div>
              
              <div className="text-gray-300 space-y-2 text-sm">
                <p>Contains:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Strong language & mild profanity</li>
                  <li>Outdated opinions & unsolicited philosophy</li>
                  <li>Sarcastic commentary & roasting</li>
                  <li>Uncle-level aggressive humor</li>
                </ul>
              </div>
              
              <div className="bg-amber-900/20 border border-amber-600/40 rounded-lg p-3">
                <p className="text-amber-200 text-sm text-center">
                  ⚠️ Viewer discretion advised
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={countdown > 0}
                className={`flex-1 px-4 py-3 rounded-lg transition-colors font-medium ${
                  countdown > 0
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-500 text-white'
                }`}
              >
                {countdown > 0 ? `Continue (${countdown})` : 'I Understand'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
