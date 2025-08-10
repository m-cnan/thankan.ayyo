import { NextRequest, NextResponse } from 'next/server'
import { CHAT_MODES } from '@/config/chat-modes'
import { Message } from '@/types/chat'
import { apiKeyManager } from '@/utils/api-key-manager'
import { createGoogleAIClient, getGeminiModel, convertMessagesToGoogleFormat, FALLBACK_MODELS } from '@/utils/google-ai-client'

export async function POST(request: NextRequest) {
  try {
    console.log('API route called')
    const { messages, mode = 'thankan' } = await request.json()

    // Check if we have any API keys available
    const keyStatus = apiKeyManager.getKeyStatus()
    if (keyStatus.total === 0) {
      console.error('No Google AI Studio API keys configured')
      return NextResponse.json(
        { error: 'Google AI Studio API keys not configured' },
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

    // Smart prompt injection - use abbreviated prompt for follow-up messages
    const isFirstMessage = messages.length <= 1
    
    const fullSystemPrompt = chatMode.systemPrompt
    const abbreviatedPrompt = mode === 'thani' 
      ? `Continue as Thani Thankan - rough Malayali uncle. Use: "Enthuva myre?", "Umbikko myre", "nayinte mone", "Da kunne", "Eda thayoli", "Kalikunno poori?", "Ninte achan ang pootilu", "Naaye". Be aggressive but helpful, wrap advice in insults.`
      : `Continue as Thankan Chettan - funny Malayali uncle. Use: "machane", "mwone", "eda", "adipoli". Be funny first, helpful second. 80% Manglish, 20% English.`
    
    const systemPromptToUse = isFirstMessage ? fullSystemPrompt : abbreviatedPrompt
    
    console.log(`📊 Prompt Strategy: ${isFirstMessage ? 'FULL' : 'ABBREVIATED'} (${isFirstMessage ? '~2000' : '~50'} tokens)`)

    console.log('Initializing Google AI Studio Gemini...')

    // Prepare conversation history for Google AI format
    const conversationMessages: Array<{ role: 'system' | 'user' | 'assistant', content: string }> = [
      { role: 'system', content: systemPromptToUse }
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
    
    // Quick check - if all keys are rate limited, respond immediately
    const initialKeyStatus = apiKeyManager.getKeyStatus()
    if (initialKeyStatus.available === 0 && initialKeyStatus.rateLimited === initialKeyStatus.total) {
      console.log('All API keys are currently rate limited - returning immediate streaming error')
      
      let errorMessage = ''
      if (mode === 'thani') {
        const thaniResponses = [
          "Enthuva myre, ith onnum nadakolla! API limit okke poyalo. Poyi oru 10 minute wait cheythu va.",
          "Eda thayoli, evide limit adichu poyittund. Ninte achan aadhyam credit kooduthal vaangikkotte!",
          "Umbikko myre, server okke oru panikketta avastha aanu. Pinne vaa, ketto?"
        ]
        errorMessage = thaniResponses[Math.floor(Math.random() * thaniResponses.length)]
      } else {
        const thankanResponses = [
          "Aiyyo machane, API limit adichu poyittund! Dubai-il ulla companies okke ingane thanne aanu - rush time-il slow. Konja wait cheyyeda mone.",
          "Eda mwone, server traffic kooduthal aayittund. Nee potte oru KSRTC bus pole - wait cheythal eventually ethum alle?",
          "Listen machane, rate limit is like fish curry without fish - technically there but not really working. Try again in few minutes, ketto?"
        ]
        errorMessage = thankanResponses[Math.floor(Math.random() * thankanResponses.length)]
      }
      
      // Return streaming error response
      const errorStream = new ReadableStream({
        start(controller) {
          try {
            const errorData = JSON.stringify({
              success: false,
              error: errorMessage,
              done: true
            })
            controller.enqueue(new TextEncoder().encode(`data: ${errorData}\n\n`))
            controller.close()
          } catch (error) {
            console.error('Error in immediate error stream:', error)
            controller.close()
          }
        }
      })
      
      return new Response(errorStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }
    
    // Create a readable stream with retry logic
    const stream = new ReadableStream({
      async start(controller) {
        const MAX_RETRIES = 3
        let attempt = 0
        
        while (attempt < MAX_RETRIES) {
          try {
            const currentApiKey = apiKeyManager.getCurrentKey()
            
            if (!currentApiKey) {
              console.log('🔄 No available API keys - all tiers exhausted')
              throw new Error('ALL_KEYS_EXHAUSTED')
            }
            
            console.log(`Attempt ${attempt + 1}: Using Google AI API key ending in ...${currentApiKey.slice(-8)}`)
            
            const googleAI = createGoogleAIClient(currentApiKey)
            
            // Convert messages to Google format
            const { history, systemPrompt } = convertMessagesToGoogleFormat(conversationMessages)
            
            const model = getGeminiModel(googleAI, systemPrompt, FALLBACK_MODELS[apiKeyManager.getCurrentModelTier()].name)
            
            // Get the latest user message
            const latestUserMessage = conversationMessages[conversationMessages.length - 1]?.content || ''
            
            // For first message, include system prompt
            let messageToSend = latestUserMessage
            if (history.length === 0) {
              messageToSend = `${systemPrompt}\n\nUser said: "${latestUserMessage}"\n\nRespond as ${mode === 'thani' ? 'Thani Thankan' : 'Thankan Chettan'} according to the personality described above.`
            }
            
            console.log('📤 FINAL MESSAGE BEING SENT TO MODEL:')
            console.log('💬 Message:', messageToSend.substring(0, 500) + (messageToSend.length > 500 ? '...' : ''))
            console.log('🎯 Model:', FALLBACK_MODELS[apiKeyManager.getCurrentModelTier()].name)
            console.log('📊 Generation Config: maxOutputTokens: 2000, temperature: 0.8')
            console.log(`🔧 Using ${isFirstMessage ? 'FULL' : 'ABBREVIATED'} system prompt for token optimization`)
            
            // Start chat with history
            const chat = model.startChat({
              history: history.slice(0, -1), // All messages except the latest
              generationConfig: {
                maxOutputTokens: 2000,
                temperature: 0.8,
              },
            })
            
            // Send the latest message and get streaming response
            const result = await chat.sendMessageStream(messageToSend)
            
            // Mark key as successful if we get here
            apiKeyManager.markKeyAsSuccessful(currentApiKey)
            
            // Process the stream
            for await (const chunk of result.stream) {
              const chunkText = chunk.text()
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
            try {
              const doneData = JSON.stringify({
                success: true,
                content: '',
                done: true
              })
              controller.enqueue(new TextEncoder().encode(`data: ${doneData}\n\n`))
            } catch (controllerError) {
              console.error('Error sending done message:', controllerError)
            }
            
            try {
              controller.close()
            } catch (closeError) {
              console.error('Error closing controller after success:', closeError)
            }
            return // Success, exit the retry loop
            
          } catch (error: unknown) {
            console.error(`Streaming error on attempt ${attempt + 1}:`, error)
            
            const currentApiKey = apiKeyManager.getCurrentKey()
            
            // Check if it's a rate limit error
            const isRateLimitError = (err: unknown): boolean => {
              if (typeof err === 'object' && err !== null) {
                const errorObj = err as { status?: number; message?: string; code?: string }
                return errorObj.status === 429 || 
                       errorObj.message?.includes('quota') === true ||
                       errorObj.message?.includes('rate limit') === true ||
                       errorObj.code === 'RATE_LIMIT_EXCEEDED'
              }
              return false
            }
            
            if (isRateLimitError(error)) {
              console.log('Rate limit detected, marking key and switching to next')
              
              if (currentApiKey) {
                apiKeyManager.markKeyAsRateLimited(currentApiKey)
              }
              
              attempt++
              if (attempt < MAX_RETRIES) {
                console.log(`Retrying with next API key... (${attempt}/${MAX_RETRIES})`)
                // Small delay before retry to avoid rapid consecutive failures
                await new Promise(resolve => setTimeout(resolve, 1000))
                continue
              }
            } else {
              // Non-rate-limit error, don't mark key as rate limited but still retry
              attempt++
              if (attempt < MAX_RETRIES) {
                console.log(`Retrying due to error... (${attempt}/${MAX_RETRIES})`)
                // Small delay before retry
                await new Promise(resolve => setTimeout(resolve, 1000))
                continue
              }
            }
            
            // All retries exhausted
            console.error('All retry attempts exhausted')
            
            // Get current key status for accurate check
            const currentKeyStatus = apiKeyManager.getKeyStatus()
            console.log('Current key status for error handling:', currentKeyStatus)
            
            // Get appropriate error message based on mode
            let errorMessage = 'Failed to generate response after multiple attempts'
            
            if (attempt >= MAX_RETRIES && (currentKeyStatus.rateLimited === currentKeyStatus.total || currentKeyStatus.available === 0)) {
              // All keys are rate limited - give mode-specific responses
              if (mode === 'thani') {
                const thaniResponses = [
                  "Enthuva myre, ith onnum nadakolla! API limit okke poyalo. Poyi oru 10 minute wait cheythu va.",
                  "Eda thayoli, evide limit adichu poyittund. Ninte achan aadhyam credit kooduthal vaangikkotte!",
                  "Umbikko myre, server okke oru panikketta avastha aanu. Pinne vaa, ketto?",
                  "Da kunne, limit kazhinjallo. Njan poyi ente kaaryam nokkatte, nee koode wait cheyth iru.",
                  "Naaye, enth konayadi rate limit aanu ith! Pinne try cheyyada mone."
                ]
                errorMessage = thaniResponses[Math.floor(Math.random() * thaniResponses.length)]
              } else {
                const thankanResponses = [
                  "Aiyyo machane, API limit adichu poyittund! Dubai-il ulla companies okke ingane thanne aanu - rush time-il slow. Konja wait cheyyeda mone.",
                  "Eda mwone, server traffic kooduthal aayittund. Nee potte oru KSRTC bus pole - wait cheythal eventually ethum alle?",
                  "Listen machane, rate limit is like fish curry without fish - technically there but not really working. Try again in few minutes, ketto?",
                  "Adipoli scene aanu - everyone wants to talk to me! Server overload aayittund. Engineering padichavar okke ingane thanne cheyyum - wait and try again.",
                  "Mwone, API quota okke kazhinjallo. Life is like internet quota - always runs out when you need it most. Pinne vaa!"
                ]
                errorMessage = thankanResponses[Math.floor(Math.random() * thankanResponses.length)]
              }
            } else {
              // Other errors - still give mode-specific responses
              if (mode === 'thani') {
                errorMessage = "Enthuva myre, server-il oru problem und. Pinne try cheyy."
              } else {
                errorMessage = "Aiyyo machane, some technical issue. Try again, scene clear aayikkum."
              }
            }
            
            console.log('Sending error message:', errorMessage)
            
            try {
              const errorData = JSON.stringify({
                success: false,
                error: errorMessage,
                done: true
              })
              controller.enqueue(new TextEncoder().encode(`data: ${errorData}\n\n`))
            } catch (controllerError) {
              console.error('Error sending error message:', controllerError)
            }
            break
          }
        }
        
        try {
          controller.close()
        } catch (closeError) {
          console.error('Error closing controller:', closeError)
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
    
    // Get mode from request body if possible for error message
    let mode = 'thankan'
    try {
      const body = await request.clone().json()
      mode = body.mode || 'thankan'
    } catch {
      // Fallback to thankan mode
    }
    
    const errorMessage = mode === 'thani' 
      ? "Enthuva myre, server crash aayittund. Ninte achan enth cheyyum ippo?"
      : "Aiyyo machane, server-il oru major issue. IT team okke Dubai-il training-il aanu - try later!"
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
