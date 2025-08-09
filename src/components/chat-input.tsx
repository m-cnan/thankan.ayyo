'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Send, Loader2 } from 'lucide-react'

interface ChatInputProps {
  onSendMessage: (message: string) => void
  isLoading: boolean
  currentMode: 'thankan' | 'thani'
}

export function ChatInput({ onSendMessage, isLoading, currentMode }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [lastSubmitTime, setLastSubmitTime] = useState(0)
  const isThaniMode = currentMode === 'thani'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const now = Date.now()
    
    // Prevent rapid duplicate submissions (within 1 second)
    if (now - lastSubmitTime < 1000) {
      return
    }
    
    if (message.trim() && !isLoading) {
      setLastSubmitTime(now)
      onSendMessage(message.trim())
      setMessage('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`sticky bottom-0 backdrop-blur-xl border-t p-4 ${
        isThaniMode 
          ? 'bg-gray-900/90 border-red-900/30' 
          : 'bg-white/80 border-amber-200/30'
      }`}
    >
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                isThaniMode 
                  ? "Entho kunne" 
                  : "Entho kunje"
              }
              disabled={isLoading}
              rows={1}
              className={`w-full px-5 py-4 border-2 rounded-2xl resize-none focus:outline-none transition-all duration-300 shadow-lg chat-input ${
                isThaniMode
                  ? 'border-red-600 focus:border-red-400 focus:ring-2 focus:ring-red-500/30 bg-gray-800 text-red-100 placeholder-red-400'
                  : 'border-amber-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-300/50 bg-amber-50/90 text-amber-900 placeholder-amber-600 shadow-amber-300/40'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{
                minHeight: '56px',
                maxHeight: '120px',
                height: 'auto'
              }}
            />
          </div>
          <motion.button
            type="submit"
            disabled={!message.trim() || isLoading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`p-4 rounded-full transition-all duration-300 shadow-lg btn-primary border-2 ${
              !message.trim() || isLoading
                ? 'bg-gray-400 border-gray-300 cursor-not-allowed text-gray-600'
                : isThaniMode
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/50 border-red-500 hover:shadow-red-500/70'
                  : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/50 border-amber-500 hover:shadow-amber-500/70'
            }`}
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </motion.button>
        </div>
      </form>
    </motion.div>
  )
}