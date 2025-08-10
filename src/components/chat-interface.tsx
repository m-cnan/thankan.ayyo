'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Message } from '@/types/chat'
import { CHAT_MODES, DEFAULT_MODE } from '@/config/chat-modes'
import { MessageBubble } from './message-bubble'
import { ChatInput } from './chat-input'
import { ModeToggle } from './mode-toggle'
import { ModeDisclaimer } from './mode-disclaimer'
import { SideHustle } from './side-hustle'

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [currentMode, setCurrentMode] = useState<'thankan' | 'thani'>(DEFAULT_MODE)
  const [isLoading, setIsLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastProcessedMessageId = useRef<string | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingMessage])

  // Idle conversation starter - only for Thankan Chetan
  const startIdleConversation = useCallback(() => {
    if (messages.length === 0 || currentMode === 'thani') return
    
    const idlePrompts = [
      "Eda, still there? Want to hear about my cousin's wedding?",
      "You know what happened to me yesterday?",
      "Machane, let me tell you something interesting...",
      "Aiyyo, I just remembered this funny incident..."
    ]
    
    const randomPrompt = idlePrompts[Math.floor(Math.random() * idlePrompts.length)]
    
    const idleMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: randomPrompt,
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, idleMessage])
  }, [messages.length, currentMode])

  // Reset idle timer - only for Thankan Chetan and less frequent
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
    }
    
    // Only start timer for Thankan Chetan mode
    if (currentMode === 'thankan') {
      idleTimerRef.current = setTimeout(() => {
        startIdleConversation()
      }, 60000) // 60 seconds of idle time (reduced frequency)
    }
  }, [startIdleConversation, currentMode])

  useEffect(() => {
    resetIdleTimer()
    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }
    }
  }, [messages, resetIdleTimer])

  const sendMessage = async (content: string) => {
    if (isLoading) return

    // Clear any idle timers when user sends a message
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    }

    // Prevent duplicate processing
    if (lastProcessedMessageId.current === userMessage.id) {
      return
    }
    lastProcessedMessageId.current = userMessage.id

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    setStreamingMessage('')

    try {
      console.log('Sending message to API...')
      console.log('Messages being sent:', [...messages, userMessage])
      console.log('Current mode:', currentMode)
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          mode: currentMode
        })
      })

      console.log('Response received:', response.status, response.ok)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error Response:', errorText)
        throw new Error(`Failed to get response: ${response.status}`)
      }

      console.log('Starting to read stream...')
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      let assistantContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              console.log('Parsed data:', data)
              
              // Check for errors first, before processing content or done status
              if (!data.success && data.error) {
                console.error('API returned error:', data.error)
                throw new Error(data.error)
              }
              
              if (data.success && data.content) {
                assistantContent += data.content
                setStreamingMessage(assistantContent)
              }
              
              if (data.done) {
                console.log('Stream complete, final content:', assistantContent)
                const assistantMessage: Message = {
                  id: Date.now().toString(),
                  role: 'assistant',
                  content: assistantContent,
                  timestamp: new Date()
                }
                
                setMessages(prev => [...prev, assistantMessage])
                setStreamingMessage('')
                setIsLoading(false)
                return
              }
            } catch (e) {
              console.error('Error parsing streaming data:', e, 'Line:', line)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setIsLoading(false)
      setStreamingMessage('')
      
      // Try to extract the error message from the API response
      let errorContent = 'Aiyyo! Something went wrong. Try again, machane.'
      if (error instanceof Error) {
        errorContent = error.message
      }
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, errorMessage])
    }
  }

  const clearChat = () => {
    setMessages([])
    setStreamingMessage('')
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
    }
  }

  const handleModeChange = (mode: 'thankan' | 'thani') => {
    if (mode === 'thani') {
      // Show disclaimer for Thani mode
      setShowDisclaimer(true)
    } else {
      // Direct switch for Thankan mode
      switchMode(mode)
    }
  }

  const switchMode = (mode: 'thankan' | 'thani') => {
    // Clear chat history when switching modes
    setMessages([])
    setStreamingMessage('')
    setCurrentMode(mode)
    
    // Clear any existing idle timer
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
    }
    
    // Only restart timer for Thankan Chetan mode
    if (mode === 'thankan') {
      resetIdleTimer()
    }
  }

  const handleDisclaimerConfirm = () => {
    setShowDisclaimer(false)
    switchMode('thani')
  }

  const handleDisclaimerClose = () => {
    setShowDisclaimer(false)
  }

  const isThaniMode = currentMode === 'thani'

  return (
    <motion.div
      key={currentMode}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`min-h-screen transition-all duration-500 ${
        currentMode === 'thani' ? 'claude-dark-bg' : CHAT_MODES[currentMode].theme.background
      } ${
        currentMode === 'thani' ? 'bg-texture-dark' : 'bg-texture-light'
      } ${CHAT_MODES[currentMode].theme.text}`}
    >
      {/* Header */}
      <motion.header
        className={`sticky top-0 z-10 transition-all duration-500 backdrop-blur-xl border-b ${
          currentMode === 'thani' 
            ? 'bg-gray-900/90 border-red-900/30' 
            : 'bg-amber-700/80 border-amber-600/30'
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className={`max-w-4xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between ${
          currentMode === 'thani' ? 'text-red-100' : 'text-amber-900'
        }`}>
          {/* Left spacer to center the title */}
          <div className="w-20 sm:w-16" />
          
          <motion.div 
            className="text-center flex-1"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <motion.h1 
              key={currentMode}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className={`text-2xl sm:text-3xl font-bold tracking-wide ${
                currentMode === 'thani' ? 'font-oswald text-red-100' : 'text-amber-900'
              }`}
            >
              {currentMode === 'thani' ? 'THANI THANKAN' : 'THANKAN CHETAN'}
            </motion.h1>
          </motion.div>
          
          <div className="w-20 sm:w-16 flex justify-end">
            <ModeToggle currentMode={currentMode} onModeChange={handleModeChange} />
          </div>
        </div>
      </motion.header>

      {/* Chat messages */}
      <div className="max-w-4xl mx-auto px-4 py-6 min-h-[calc(100vh-200px)]">
        <AnimatePresence>
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center min-h-[60vh]"
            >
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center"
              >
                <motion.h2 
                  className={`text-6xl font-light mb-4 tracking-tight ${
                    currentMode === 'thani' ? 'text-red-200 font-oswald' : 'text-amber-800'
                  }`}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 0.8 }}
                  transition={{ delay: 0.4 }}
                >
                  {currentMode === 'thani' ? 'Nee thankane aryo?' : 'Entha mwone?'}
                </motion.h2>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-1">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              currentMode={currentMode}
            />
          ))}
          
          {/* Streaming message */}
          {streamingMessage && (
            <MessageBubble
              message={{
                id: 'streaming',
                role: 'assistant',
                content: streamingMessage,
                timestamp: new Date()
              }}
              isTyping={true}
              currentMode={currentMode}
            />
          )}
        </div>
        
        <div ref={messagesEndRef} />
      </div>

      {/* Chat input */}
      <ChatInput
        onSendMessage={sendMessage}
        isLoading={isLoading}
        currentMode={currentMode}
      />

      {/* Side Hustle Component */}
      <SideHustle currentMode={currentMode} />

      {/* Mode Disclaimer */}
      <ModeDisclaimer
        isVisible={showDisclaimer}
        onClose={handleDisclaimerClose}
        onConfirm={handleDisclaimerConfirm}
      />
    </motion.div>
  )
}
