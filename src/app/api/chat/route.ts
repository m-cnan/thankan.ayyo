import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'
import { CHAT_MODES } from '@/config/chat-modes'
import { Message } from '@/types/chat'
import { apiKeyManager } from '@/utils/api-key-manager'

// Function to create OpenAI client with current API key
function createOpenAIClient(apiKey: string) {
  return new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
  })
}

export async function POST(request: NextRequest) {
  try {
    console.log('API route called')
    const { messages, mode = 'thankan' } = await request.json()

    // Check if we have any API keys available
    const keyStatus = apiKeyManager.getKeyStatus()
    if (keyStatus.total === 0) {
      console.error('No OpenRouter API keys configured')
      return NextResponse.json(
        { error: 'OpenRouter API keys not configured' },
        { status: 500 }
      )
    }

    console.log(`API Key Status - Total: ${keyStatus.total}, Available: ${keyStatus.available}, Rate Limited: ${keyStatus.rateLimited}`)

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

    console.log('Initializing OpenRouter Gemini 2.0 Flash Experimental...')

    // Prepare conversation history for OpenAI format
    const conversationMessages: Array<{ role: 'system' | 'user' | 'assistant', content: string }> = [
      { role: 'system', content: chatMode.systemPrompt }
    ]

    // Add conversation history
    messages
      .filter((msg: Message) => msg.role === 'user' || msg.role === 'assistant')
      .forEach((msg: Message) => {
        conversationMessages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        })
      })
    
    console.log('Conversation messages prepared:', conversationMessages.length)

    console.log('Generating response with API key cycling...')
    // Create a readable stream with retry logic
    const stream = new ReadableStream({
      async start(controller) {
        const MAX_RETRIES = 3
        let attempt = 0
        
        while (attempt < MAX_RETRIES) {
          try {
            const currentApiKey = apiKeyManager.getCurrentKey()
            console.log(`Attempt ${attempt + 1}: Using API key ending in ...${currentApiKey.slice(-8)}`)
            
            const openai = createOpenAIClient(currentApiKey)
            
            const streamResponse = await openai.chat.completions.create({
              model: 'google/gemini-2.0-flash-exp:free',
              messages: conversationMessages,
              stream: true,
              max_tokens: 2000,
              temperature: 0.8,
            })
            
            // Mark key as successful if we get here
            apiKeyManager.markKeyAsSuccessful(currentApiKey)
            
            for await (const chunk of streamResponse) {
              const chunkText = chunk.choices[0]?.delta?.content || ''
              if (chunkText) {
                console.log('Received chunk:', chunkText.substring(0, 50))
                
                const data = JSON.stringify({
                  success: true,
                  content: chunkText,
                  done: false
                })
                
                controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`))
              }
            }
            
            console.log('Stream generation complete')
            // Send final done message
            const doneData = JSON.stringify({
              success: true,
              content: '',
              done: true
            })
            controller.enqueue(new TextEncoder().encode(`data: ${doneData}\n\n`))
            return // Success, exit the retry loop
            
          } catch (error: unknown) {
            console.error(`Streaming error on attempt ${attempt + 1}:`, error)
            
            const currentApiKey = apiKeyManager.getCurrentKey()
            
            // Check if it's a rate limit error
            const isRateLimitError = (err: unknown): boolean => {
              if (typeof err === 'object' && err !== null) {
                const errorObj = err as { status?: number; message?: string; headers?: Record<string, string>; response?: { headers?: Record<string, string> } }
                return errorObj.status === 429 || 
                       errorObj.message?.includes('rate limit') === true || 
                       errorObj.message?.includes('Too Many Requests') === true
              }
              return false
            }
            
            if (isRateLimitError(error)) {
              console.log('Rate limit detected, marking key and switching to next')
              
              // Extract retry-after if available
              const errorObj = error as { headers?: Record<string, string>; response?: { headers?: Record<string, string> } }
              const retryAfter = errorObj?.headers?.['retry-after'] || errorObj?.response?.headers?.['retry-after']
              apiKeyManager.markKeyAsRateLimited(currentApiKey, retryAfter ? parseInt(retryAfter) : undefined)
              
              attempt++
              if (attempt < MAX_RETRIES) {
                console.log(`Retrying with next API key... (${attempt}/${MAX_RETRIES})`)
                continue
              }
            } else {
              // Non-rate-limit error, don't mark key as rate limited but still retry
              attempt++
              if (attempt < MAX_RETRIES) {
                console.log(`Retrying due to error... (${attempt}/${MAX_RETRIES})`)
                continue
              }
            }
            
            // All retries exhausted
            console.error('All retry attempts exhausted')
            const errorData = JSON.stringify({
              success: false,
              error: 'Failed to generate response after multiple attempts',
              done: true
            })
            controller.enqueue(new TextEncoder().encode(`data: ${errorData}\n\n`))
            break
          }
        }
        
        controller.close()
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
