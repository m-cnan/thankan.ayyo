interface APIKeyStatus {
  key: string
  isRateLimited: boolean
  rateLimitResetTime?: number
  consecutiveErrors: number
  currentModelTier: number
}

interface KeyStatus {
  total: number
  available: number
  rateLimited: number
  currentModelTier: number
  modelName: string
  keysPerTier: Record<number, number>
}

class APIKeyManager {
  private apiKeys: APIKeyStatus[] = []
  private currentKeyIndex = 0
  private readonly MAX_CONSECUTIVE_ERRORS = 3
  private readonly RATE_LIMIT_COOLDOWN = 60 * 1000 // 1 minute
  private globalModelTier = 0 // Global tier for all keys

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
      consecutiveErrors: 0,
      currentModelTier: 0 // All start with primary model
    }))

    console.log(`🔑 Initialized ${this.apiKeys.length} Google AI Studio API keys for tiered rotation`)
    console.log(`🎯 Starting with Tier ${this.globalModelTier}: ${this.getModelName(this.globalModelTier)}`)
  }

  private getModelName(tier: number): string {
    const modelNames = ['Gemini 2.0 Flash Experimental', 'Gemini 2.5 Flash-Lite', 'Gemma 3']
    return modelNames[tier] || 'Unknown Model'
  }

  getCurrentKey(): string | null {
    this.cleanupExpiredRateLimits()

    const availableKeys = this.apiKeys.filter(key => 
      !key.isRateLimited && key.consecutiveErrors < this.MAX_CONSECUTIVE_ERRORS
    )

    // Check if most keys are rate limited due to quota exhaustion
    const rateLimitedKeys = this.apiKeys.filter(key => key.isRateLimited)
    const quotaExhaustedKeys = rateLimitedKeys.length
    
    // DOWNGRADE tier when 4+ out of 6 keys are rate limited (move to less powerful but higher quota model)
    if (quotaExhaustedKeys >= 4 && this.globalModelTier < 2) {
      console.log(`📊 Quota Status: ${quotaExhaustedKeys}/${this.apiKeys.length} keys rate limited - DOWNGRADING to lower tier for higher quotas`)
      if (this.checkAndUpgradeTier()) {
        console.log(`⬇️ DOWNGRADED to model tier ${this.globalModelTier} for better quota availability`)
        return this.getCurrentKey() // Recursive call with new tier
      }
    }

    if (availableKeys.length === 0) {
      // Final fallback - try tier upgrade if not already attempted
      if (this.checkAndUpgradeTier()) {
        console.log(`🆙 Final fallback - Upgraded to model tier ${this.globalModelTier}`)
        return this.getCurrentKey() // Recursive call with new tier
      }
      
      console.warn('⚠️ All API keys exhausted and max tier reached')
      return null
    }

    // Use round-robin for available keys
    if (this.currentKeyIndex >= availableKeys.length) {
      this.currentKeyIndex = 0
    }

    const selectedKey = availableKeys[this.currentKeyIndex]
    this.currentKeyIndex = (this.currentKeyIndex + 1) % availableKeys.length

    console.log(`🔑 Using key ${this.currentKeyIndex}/${availableKeys.length} on tier ${this.globalModelTier}`)
    return selectedKey.key
  }

  getCurrentModelTier(): number {
    return this.globalModelTier
  }

  public checkAndUpgradeTier(): boolean {
    const maxTier = 2 // We have 3 tiers (0, 1, 2)
    
    if (this.globalModelTier >= maxTier) {
      return false // Already at highest tier
    }

    // Upgrade tier and reset all keys
    this.globalModelTier++
    this.apiKeys.forEach(key => {
      key.isRateLimited = false
      key.consecutiveErrors = 0
      key.currentModelTier = this.globalModelTier
    })

    this.currentKeyIndex = 0
    console.log(`🆙 TIER UPGRADE: Now using Tier ${this.globalModelTier} - ${this.getModelName(this.globalModelTier)}`)
    return true
  }

  checkForTierDowngrade(): boolean {
    const availableKeys = this.apiKeys.filter(key => 
      !key.isRateLimited && key.consecutiveErrors < this.MAX_CONSECUTIVE_ERRORS
    )

    // If we have keys available and we're not on primary tier, downgrade
    if (availableKeys.length > 0 && this.globalModelTier > 0) {
      this.globalModelTier = 0
      this.apiKeys.forEach(key => {
        key.isRateLimited = false
        key.consecutiveErrors = 0
        key.currentModelTier = 0
      })
      this.currentKeyIndex = 0
      console.log(`🔽 TIER DOWNGRADE: Back to Tier 0 - ${this.getModelName(0)}`)
      return true
    }

    return false
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

  markKeyAsDisabled(apiKey: string, reason: string = 'API access disabled') {
    const keyStatus = this.apiKeys.find(k => k.key === apiKey)
    if (keyStatus) {
      keyStatus.isRateLimited = true // Use this flag to mark as unavailable
      keyStatus.consecutiveErrors = this.MAX_CONSECUTIVE_ERRORS // Mark as max errors to exclude from available pool
      keyStatus.rateLimitResetTime = Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      
      console.log(`🚫 Marked API key ending in ${apiKey.slice(-8)} as disabled: ${reason}`)
      
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

  getKeyStatus(): KeyStatus {
    const available = this.apiKeys.filter(k => !k.isRateLimited && k.consecutiveErrors < this.MAX_CONSECUTIVE_ERRORS).length
    const rateLimited = this.apiKeys.filter(k => k.isRateLimited).length
    
    // Count keys per tier
    const keysPerTier: Record<number, number> = {}
    this.apiKeys.forEach(key => {
      const tier = key.currentModelTier
      keysPerTier[tier] = (keysPerTier[tier] || 0) + 1
    })

    // Get model name for current tier
    const modelName = this.getModelName(this.globalModelTier)
    
    return {
      total: this.apiKeys.length,
      available,
      rateLimited,
      currentModelTier: this.globalModelTier,
      modelName,
      keysPerTier
    }
  }
}

// Singleton instance
export const apiKeyManager = new APIKeyManager()
