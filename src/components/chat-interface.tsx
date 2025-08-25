'use client'

import { useState, useEffect, useRef } from 'react'
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
  const lastProcessedMessageId = useRef<string | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingMessage])

  const sendMessage = async (content: string) => {
    if (isLoading) return

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

    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.log('Request timeout - stopping loading state')
      setIsLoading(false)
      setStreamingMessage('')
      
      const timeoutMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: currentMode === 'thani' 
          ? "Enthuva myre, request timeout aayittund. Server okke slow aanu - pinne try cheyy."
          : "Aiyyo machane, request timeout aayittund. Server busy aanu - try again, ketto?",
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, timeoutMessage])
    }, 30000) // Reduced from 60 seconds to 30 seconds

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

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            console.log('Stream ended, cleaning up...')
            clearTimeout(timeoutId)
            setIsLoading(false)
            setStreamingMessage('')
            break
          }

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
                  
                  // Clear timeout
                  clearTimeout(timeoutId)
                  
                  // Create error message and end streaming
                  const errorMessage: Message = {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: data.error,
                    timestamp: new Date()
                  }
                  
                  setMessages(prev => [...prev, errorMessage])
                  setStreamingMessage('')
                  setIsLoading(false)
                  return
                }
                
                if (data.success && data.content) {
                  assistantContent += data.content
                  setStreamingMessage(assistantContent)
                }
                
                if (data.done) {
                  console.log('Stream complete, final content:', assistantContent)
                  
                  // Clear timeout
                  clearTimeout(timeoutId)
                  
                  // Only add message if we have content
                  if (assistantContent.trim()) {
                    const assistantMessage: Message = {
                      id: Date.now().toString(),
                      role: 'assistant',
                      content: assistantContent,
                      timestamp: new Date()
                    }
                    
                    setMessages(prev => [...prev, assistantMessage])
                  }
                  
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
      } catch (readerError) {
        console.error('Error reading stream:', readerError)
        clearTimeout(timeoutId)
        setIsLoading(false)
        setStreamingMessage('')
        
        // Add error message if we don't have any content
        if (!assistantContent.trim()) {
          const errorMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: currentMode === 'thani' 
              ? "Enthuva myre, stream reading-il problem und. Pinne try cheyy."
              : "Aiyyo machane, stream reading issue. Try again, ketto?",
            timestamp: new Date()
          }
          
          setMessages(prev => [...prev, errorMessage])
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      
      // Clear timeout
      clearTimeout(timeoutId)
      
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const clearChat = () => {
    setMessages([])
    setStreamingMessage('')
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
  }

  const handleDisclaimerConfirm = () => {
    setShowDisclaimer(false)
    switchMode('thani')
  }

  const handleDisclaimerClose = () => {
    setShowDisclaimer(false)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

      {/* About Line - Bottom Right */}
      <motion.div
        className="fixed bottom-4 right-4 z-20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.5 }}
      >
        <p className={`text-xs font-mono ${
          currentMode === 'thani' 
            ? 'text-red-400/60 hover:text-red-300/80' 
            : 'text-amber-600/60 hover:text-amber-500/80'
        } transition-colors duration-300`}>
          A project of Mani and Sinan
        </p>
      </motion.div>

      {/* Mode Disclaimer */}
      <ModeDisclaimer
        isVisible={showDisclaimer}
        onClose={handleDisclaimerClose}
        onConfirm={handleDisclaimerConfirm}
      />
    </motion.div>
  )
}
