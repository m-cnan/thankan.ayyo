import { GoogleGenerativeAI } from '@google/generative-ai'

// Function to create Google AI client with API key
export function createGoogleAIClient(apiKey: string) {
  return new GoogleGenerativeAI(apiKey)
}

// Function to get Gemini model with system instruction
export function getGeminiModel(client: GoogleGenerativeAI, systemPrompt: string, model: string = 'gemini-2.0-flash-exp') {
  return client.getGenerativeModel({ 
    model,
    systemInstruction: systemPrompt
  })
}

// Convert messages to Google AI format
export function convertMessagesToGoogleFormat(messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }>) {
  // Google AI uses systemInstruction separately, so we extract it
  const systemPrompt = messages.find(msg => msg.role === 'system')?.content || ''
  
  // Filter out system messages and convert to Google format
  const history = messages
    .filter(msg => msg.role !== 'system')
    .map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))

  return { history, systemPrompt }
}
