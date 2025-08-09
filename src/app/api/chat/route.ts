import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import { CHAT_MODES } from '@/config/chat-modes'
import { Message } from '@/types/chat'

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '')

export async function POST(request: NextRequest) {
  try {
    console.log('API route called')
    const { messages, mode = 'thankan' } = await request.json()

    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      console.error('No Gemini API key found')
      return NextResponse.json(
        { error: 'Google Gemini API key not configured' },
        { status: 500 }
      )
    }

    console.log('API key found, messages received:', messages?.length)

    if (!messages || !Array.isArray(messages)) {
      console.error('Invalid messages array')
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    console.log('Chat mode:', mode)
    const chatMode = CHAT_MODES[mode]
    if (!chatMode) {
      console.error('Invalid chat mode:', mode)
      return NextResponse.json(
        { error: 'Invalid chat mode' },
        { status: 400 }
      )
    }

    console.log('Initializing Gemini model...')
    // Get the model
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    // Prepare conversation history
    const conversationHistory = messages
      .slice(0, -1) // Exclude the last message to avoid duplication
      .filter((msg: Message) => msg.role === 'user' || msg.role === 'assistant')
      .map((msg: Message) => `${msg.role === 'user' ? 'User' : 'Thankan'}: ${msg.content}`)
      .join('\n')

    // Get the current user message
    const currentMessage = messages[messages.length - 1]?.content || ''
    
    console.log('Conversation history:', conversationHistory)
    console.log('Current message:', currentMessage)

    // Create the full prompt
    const fullPrompt = `${chatMode.systemPrompt}

Previous conversation:
${conversationHistory}

User: ${currentMessage}

Thankan:`

    console.log('Generating response...')
    // Create a readable stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log('Starting stream generation')
          const result = await model.generateContentStream(fullPrompt)
          
          for await (const chunk of result.stream) {
            const chunkText = chunk.text()
            console.log('Received chunk:', chunkText.substring(0, 50))
            
            const data = JSON.stringify({
              success: true,
              content: chunkText,
              done: false
            })
            
            controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`))
          }
          
          console.log('Stream generation complete')
          // Send final done message
          const doneData = JSON.stringify({
            success: true,
            content: '',
            done: true
          })
          controller.enqueue(new TextEncoder().encode(`data: ${doneData}\n\n`))
          
        } catch (error) {
          console.error('Streaming error:', error)
          const errorData = JSON.stringify({
            success: false,
            error: 'Failed to generate response',
            done: true
          })
          controller.enqueue(new TextEncoder().encode(`data: ${errorData}\n\n`))
        } finally {
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
