/**
 * Enhanced Webhook Retry Logic
 * Improves reliability without requiring Redis
 */

import { activateSubscription } from "@/lib/subscription-manager"

export interface RetryConfig {
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 250,
  maxDelayMs: 5000,
  backoffMultiplier: 2
}

/**
 * Enhanced retry wrapper for webhook operations
 */
export async function withWebhookRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  operationName: string = 'webhook_operation'
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      const result = await operation()
      
      if (attempt > 1) {
        console.log(`${operationName} succeeded on attempt ${attempt}/${finalConfig.maxAttempts}`)
      }
      
      return result
    } catch (error) {
      lastError = error as Error
      
      console.warn(`${operationName} failed on attempt ${attempt}/${finalConfig.maxAttempts}:`, error)
      
      // Don't retry on final attempt
      if (attempt === finalConfig.maxAttempts) {
        break
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        finalConfig.baseDelayMs * Math.pow(finalConfig.backoffMultiplier, attempt - 1),
        finalConfig.maxDelayMs
      )
      
      console.log(`Retrying ${operationName} in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  console.error(`${operationName} failed after ${finalConfig.maxAttempts} attempts`)
  throw lastError || new Error(`${operationName} failed after ${finalConfig.maxAttempts} attempts`)
}

/**
 * Retry subscription activation with enhanced logic
 */
export async function retrySubscriptionActivation(
  subscriptionId: string,
  paymentData: any,
  source: string,
  config: Partial<RetryConfig> = {}
): Promise<any> {
  return withWebhookRetry(
    async () => {
      const result = await activateSubscription({
        subscriptionId,
        paymentData,
        source
      })

      // Check for specific retry-worthy failures
      if (!result.result.success) {
        const reason = result.result.reason
        
        // Retry on lock timeout or temporary failures
        if (reason === 'lock_timeout' || reason === 'temporary_failure') {
          throw new Error(`Retryable failure: ${reason}`)
        }
        
        // Don't retry on permanent failures
        if (reason === 'subscription_not_found' || reason === 'invalid_status' || reason === 'already_active') {
          console.log(`Non-retryable failure: ${reason}`)
          return result
        }
      }

      return result
    },
    config,
    `subscription_activation_${subscriptionId}`
  )
}

/**
 * Enhanced webhook processing with better error categorization
 */
export function isRetryableWebhookError(error: any): boolean {
  if (!error) return false
  
  const message = error.message?.toLowerCase() || ''
  const code = error.code
  
  // Database connection issues
  if (message.includes('connection') || message.includes('timeout')) {
    return true
  }
  
  // Lock timeout
  if (message.includes('lock_timeout') || message.includes('lock timeout')) {
    return true
  }
  
  // Temporary database issues
  if (code === 'P2024' || code === 'P2034') { // Prisma timeout codes
    return true
  }
  
  // Network issues
  if (message.includes('network') || message.includes('econnreset')) {
    return true
  }
  
  return false
}

/**
 * Log webhook processing attempt with context
 */
export function logWebhookAttempt(
  event: string,
  reference: string,
  attempt: number,
  maxAttempts: number,
  error?: any
): void {
  const context = {
    event,
    reference,
    attempt,
    maxAttempts,
    timestamp: new Date().toISOString()
  }

  if (error) {
    console.error(`Webhook processing failed:`, { ...context, error: error.message })
  } else {
    console.log(`Webhook processing attempt:`, context)
  }
}