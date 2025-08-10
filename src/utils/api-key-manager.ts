interface APIKeyStatus {
  key: string
  isRateLimited: boolean
  rateLimitResetTime?: number
  consecutiveErrors: number
}

class APIKeyManager {
  private apiKeys: APIKeyStatus[] = []
  private currentKeyIndex = 0
  private readonly MAX_CONSECUTIVE_ERRORS = 3
  private readonly RATE_LIMIT_COOLDOWN = 60 * 1000 // 1 minute

  constructor() {
    this.initializeKeys()
  }

  private initializeKeys() {
    const keys = [
      process.env.GOOGLE_AI_API_KEY_1,
      process.env.GOOGLE_AI_API_KEY_2,
      process.env.GOOGLE_AI_API_KEY_3,
      process.env.GOOGLE_AI_API_KEY_4,
      process.env.GOOGLE_AI_API_KEY_5,
      process.env.GOOGLE_AI_API_KEY_6,
      process.env.GOOGLE_GEMINI_API_KEY, // fallback to existing key
    ].filter(Boolean) as string[]

    // Remove duplicates and initialize status
    const uniqueKeys = [...new Set(keys)]
    this.apiKeys = uniqueKeys.map(key => ({
      key,
      isRateLimited: false,
      consecutiveErrors: 0
    }))

    console.log(`Initialized ${this.apiKeys.length} Google AI Studio API keys for rotation`)
  }

  getCurrentKey(): string {
    if (this.apiKeys.length === 0) {
      throw new Error('No API keys available')
    }

    // Clean up expired rate limits
    this.cleanupExpiredRateLimits()

    // Find the next available key
    const availableKey = this.findNextAvailableKey()
    if (!availableKey) {
      // All keys are rate limited, return the one with earliest reset time
      const keyWithEarliestReset = this.apiKeys.reduce((earliest, current) => {
        if (!current.rateLimitResetTime) return earliest
        if (!earliest.rateLimitResetTime) return current
        return current.rateLimitResetTime < earliest.rateLimitResetTime ? current : earliest
      })
      
      console.warn('All API keys are rate limited, using key with earliest reset time')
      return keyWithEarliestReset.key
    }

    return availableKey.key
  }

  private findNextAvailableKey(): APIKeyStatus | null {
    const startIndex = this.currentKeyIndex
    
    do {
      const currentKey = this.apiKeys[this.currentKeyIndex]
      
      if (!currentKey.isRateLimited && currentKey.consecutiveErrors < this.MAX_CONSECUTIVE_ERRORS) {
        return currentKey
      }
      
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length
    } while (this.currentKeyIndex !== startIndex)
    
    return null
  }

  private cleanupExpiredRateLimits() {
    const now = Date.now()
    this.apiKeys.forEach(keyStatus => {
      if (keyStatus.isRateLimited && keyStatus.rateLimitResetTime && now > keyStatus.rateLimitResetTime) {
        keyStatus.isRateLimited = false
        keyStatus.rateLimitResetTime = undefined
        keyStatus.consecutiveErrors = 0
        console.log('Rate limit expired for key ending in:', keyStatus.key.slice(-8))
      }
    })
  }

  markKeyAsRateLimited(apiKey: string, retryAfterSeconds?: number) {
    const keyStatus = this.apiKeys.find(k => k.key === apiKey)
    if (keyStatus) {
      keyStatus.isRateLimited = true
      keyStatus.consecutiveErrors++
      keyStatus.rateLimitResetTime = Date.now() + (retryAfterSeconds ? retryAfterSeconds * 1000 : this.RATE_LIMIT_COOLDOWN)
      
      console.log(`Marked API key ending in ${apiKey.slice(-8)} as rate limited. Reset time: ${new Date(keyStatus.rateLimitResetTime)}`)
      
      // Move to next key
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length
    }
  }

  markKeyAsSuccessful(apiKey: string) {
    const keyStatus = this.apiKeys.find(k => k.key === apiKey)
    if (keyStatus) {
      keyStatus.consecutiveErrors = 0
      keyStatus.isRateLimited = false
      keyStatus.rateLimitResetTime = undefined
    }
  }

  getKeyStatus(): { total: number, available: number, rateLimited: number } {
    const available = this.apiKeys.filter(k => !k.isRateLimited && k.consecutiveErrors < this.MAX_CONSECUTIVE_ERRORS).length
    const rateLimited = this.apiKeys.filter(k => k.isRateLimited).length
    
    return {
      total: this.apiKeys.length,
      available,
      rateLimited
    }
  }
}

// Singleton instance
export const apiKeyManager = new APIKeyManager()
