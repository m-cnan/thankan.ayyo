'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Volume2, AlertTriangle } from 'lucide-react'

interface SideHustleProps {
  currentMode: 'thankan' | 'thani'
}

export function SideHustle({ currentMode }: SideHustleProps) {
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [showVideo, setShowVideo] = useState(false)

  // Only show in Thani mode
  if (currentMode !== 'thani') return null

  const handleVideoClose = () => {
    setShowVideo(false)
    setShowDisclaimer(false)
  }

  const handleConfirmVideo = () => {
    setShowDisclaimer(false)
    setShowVideo(true)
  }

  return (
    <>
      {/* Side Hustle Button */}
      <motion.button
        onClick={() => setShowDisclaimer(true)}
        className="fixed top-4 right-4 text-xs text-gray-400/60 hover:text-gray-300 transition-colors z-40 font-mono"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        side hustle
      </motion.button>

      {/* Video Disclaimer */}
      <AnimatePresence>
        {showDisclaimer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 border-2 border-amber-600 rounded-2xl p-8 max-w-md w-full shadow-2xl shadow-amber-600/20"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Volume2 className="text-amber-500" size={24} />
                  <h2 className="text-xl font-bold text-amber-100">Video Content</h2>
                </div>
                <button
                  onClick={() => setShowDisclaimer(false)}
                  className="text-gray-400 hover:text-amber-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="bg-amber-900/30 border border-amber-600/50 rounded-lg p-4">
                  <p className="text-amber-100 font-medium text-center">
                    🎧 Like adikkan maraklle muthee<br/>
                    Use headphones
                  </p>
                </div>
                
                <div className="bg-red-900/20 border border-red-600/40 rounded-lg p-3 flex items-center gap-2">
                  <AlertTriangle className="text-red-400" size={16} />
                  <p className="text-red-200 text-sm">
                    Viewer discretion advised
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDisclaimer(false)}
                  className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmVideo}
                  className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors font-medium"
                >
                  I Have Earphones
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Modal */}
      <AnimatePresence>
        {showVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 border-2 border-amber-600 rounded-2xl p-6 max-w-sm w-full shadow-2xl shadow-amber-600/20"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-amber-100">Side Hustle Content</h2>
                <button
                  onClick={handleVideoClose}
                  className="text-gray-400 hover:text-amber-400 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="aspect-[9/16] bg-black rounded-lg overflow-hidden">
                {/* Portrait Video Player - Instagram Reel style */}
                <video
                  controls
                  autoPlay
                  className="w-full h-full object-cover"
                  poster="/api/placeholder/320/568"
                >
                  {/* Add your video source here */}
                  <source src="/videos/side-hustle.mp4" type="video/mp4" />
                  <source src="/videos/side-hustle.webm" type="video/webm" />
                  
                  {/* Fallback for browsers that don't support video */}
                  <div className="flex items-center justify-center h-full bg-gray-800">
                    <div className="text-center text-gray-400">
                      <p className="mb-2">Video not supported in this browser</p>
                      <p className="text-sm">Please use a modern browser to view this content</p>
                    </div>
                  </div>
                </video>
              </div>
              
              <div className="mt-4 text-center">
                <p className="text-gray-400 text-sm">
                  Enjoying the content? This is just the beginning of our side hustle! 🚀
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
