import { GoogleGenerativeAI } from '@google/generative-ai'
import { GoogleGenAI } from '@google/genai'

export interface ModelConfig {
  name: string
  description: string
  priority: number
  package: 'google-ai' | 'google-genai' // Which package to use
}

/**
 * Tiered fallback model system for maximum uptime
 * Tier 0: All 6 APIs use Gemini 2.0 Flash Experimental (Primary - Best Quality)
 * Tier 1: All 6 APIs use Gemini 2.5 Flash-Lite (Secondary - Good Quality) 
 * Tier 2: All 6 APIs use Gemma 3 (Final Fallback - Basic Quality with Higher Quota)
 */
export const FALLBACK_MODELS: ModelConfig[] = [
  {
    name: 'gemini-2.0-flash-exp',
    description: 'Gemini 2.0 Flash Experimental (Primary)',
    priority: 1,
    package: 'google-ai'
  },
  {
    name: 'gemini-2.5-flash-lite', 
    description: 'Gemini 2.5 Flash-Lite (Secondary)',
    priority: 2,
    package: 'google-ai'
  },
  {
    name: 'gemma-3-27b-it',
    description: 'Gemma 3 (Final Fallback - Higher Quota)',
    priority: 3,
    package: 'google-genai'
  }
]

// Function to create Google AI client with API key
export function createGoogleAIClient(apiKey: string) {
  return new GoogleGenerativeAI(apiKey)
}

// Function to create Google GenAI client for Gemma models
export function createGoogleGenAIClient(apiKey: string) {
  return new GoogleGenAI({ apiKey })
}

// Function to get Gemini model with system instruction (for google-ai package)
export function getGeminiModel(client: GoogleGenerativeAI, systemPrompt: string, model: string = 'gemini-2.0-flash-exp') {
  console.log(`🤖 Initializing Gemini model: ${model}`)
  
  return client.getGenerativeModel({ 
    model,
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature: 0.9,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
  })
}

// Function to generate content with Gemma models (for google-genai package)
export async function generateWithGemma(client: GoogleGenAI, prompt: string, model: string = 'gemma-3-27b-it') {
  console.log(`🤖 Using Gemma model: ${model}`)
  
  const response = await client.models.generateContent({
    model,
    contents: prompt,
  })
  
  return response.text
}

// Convert messages to Google AI format
export function convertMessagesToGoogleFormat(messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }>) {
  // Google AI uses systemInstruction separately, so we extract it
  const systemPrompt = messages.find(msg => msg.role === 'system')?.content || ''
  
  // Filter out system messages and convert to Google format
  let history = messages
    .filter(msg => msg.role !== 'system')
    .map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))

  // Google AI requires conversation to start with user and alternate user->model->user->model
  // Remove any leading model messages
  while (history.length > 0 && history[0].role === 'model') {
    history = history.slice(1)
  }

  // Ensure proper alternating pattern by removing consecutive messages of same role
  const cleanHistory = []
  let lastRole = null
  
  for (const message of history) {
    if (message.role !== lastRole) {
      cleanHistory.push(message)
      lastRole = message.role
    }
    // Skip consecutive messages of same role (this shouldn't happen but safety check)
  }

  return { history: cleanHistory, systemPrompt }
}
