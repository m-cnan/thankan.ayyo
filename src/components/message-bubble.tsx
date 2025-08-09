'use client'

import { motion } from 'framer-motion'
import { Message } from '@/types/chat'
import { User, Bot } from 'lucide-react'

interface MessageBubbleProps {
  message: Message
  isTyping?: boolean
  currentMode: 'thankan' | 'thani'
}

export function MessageBubble({ message, isTyping = false, currentMode }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isThaniMode = currentMode === 'thani'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.4,
        ease: 'easeOut'
      }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-6`}
    >
      {/* Avatar */}
      <motion.div 
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md ${
          isUser 
            ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
            : isThaniMode 
              ? 'bg-gradient-to-br from-red-800 to-red-900' 
              : 'bg-gradient-to-br from-amber-600 to-amber-700'
        }`}
        whileHover={{ scale: 1.1 }}
        transition={{ duration: 0.2 }}
      >
        {isUser ? (
          <User size={18} className="text-white" />
        ) : (
          <Bot size={18} className="text-white" />
        )}
      </motion.div>

      {/* Message bubble */}
      <div className={`max-w-[70%] rounded-3xl px-5 py-4 shadow-sm ${
        isUser
          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-lg'
          : isThaniMode
            ? 'bg-gradient-to-br from-gray-800 to-gray-900 text-red-100 rounded-bl-lg border border-red-700/50'
            : 'bg-gradient-to-br from-amber-50 to-amber-100 rounded-bl-lg border border-amber-200/50'
      }`}
      style={{
        color: !isUser ? (isThaniMode ? '#fecaca' : '#3c3c3c') : undefined,
        background: !isUser && !isThaniMode 
          ? 'linear-gradient(135deg, #fef7cd 0%, #fef3c7 50%, #fed7aa 100%)' 
          : !isUser && isThaniMode
            ? 'linear-gradient(135deg, #1f2937 0%, #374151 50%, #4b5563 100%)'
            : undefined
      }}
      >
        <div className={`text-sm font-semibold mb-2 ${
          isUser ? 'text-blue-100' : isThaniMode ? 'text-red-300' : ''
        }`}
        style={{ color: !isUser && !isThaniMode ? '#d4a017' : undefined }}
        >
          {isUser ? 'You' : currentMode === 'thani' ? 'Thani Thankan' : 'Thankan Chetan'}
        </div>
        <div className="text-sm leading-relaxed">
          {message.content}
          {isTyping && (
            <motion.span
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="inline-block ml-1"
              style={{ color: isThaniMode ? '#ef4444' : '#d4a017' }}
            >
              ●
            </motion.span>
          )}
        </div>
        <div className={`text-xs mt-3 opacity-70 ${
          isUser ? 'text-blue-200' : ''
        }`}
        style={{ color: !isUser ? (isThaniMode ? '#fca5a5' : '#b58b6a') : undefined }}
        >
          {new Date(message.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
    </motion.div>
  )
}
