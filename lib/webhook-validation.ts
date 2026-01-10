/**
 * Enhanced Webhook Validation and Metadata Parsing
 * Improves reliability of webhook data processing
 */

import { z } from 'zod'

// Paystack webhook event schemas
const PaystackCustomerSchema = z.object({
  email: z.string().email().optional(),
  customer_code: z.string().optional(),
  id: z.number().optional()
})

const PaystackAuthorizationSchema = z.object({
  authorization_code: z.string(),
  bin: z.string().optional(),
  last4: z.string().optional(),
  exp_month: z.string().optional(),
  exp_year: z.string().optional(),
  channel: z.string().optional(),
  card_type: z.string().optional(),
  bank: z.string().optional(),
  country_code: z.string().optional(),
  brand: z.string().optional(),
  reusable: z.boolean().optional(),
  signature: z.string().optional()
})

const PaystackMetadataSchema = z.object({
  type: z.string().optional(),
  subscription_id: z.string().optional(),
  user_id: z.string().optional(),
  plan_id: z.string().optional(),
  user_email: z.string().email().optional()
}).passthrough() // Allow additional fields

const PaystackChargeDataSchema = z.object({
  id: z.number(),
  domain: z.string(),
  status: z.string(),
  reference: z.string(),
  amount: z.number(),
  message: z.string().optional(),
  gateway_response: z.string().optional(),
  paid_at: z.string().optional(),
  created_at: z.string(),
  channel: z.string(),
  currency: z.string(),
  ip_address: z.string().optional(),
  metadata: z.union([z.string(), z.object({}).passthrough()]).optional(),
  fees: z.number().optional(),
  customer: PaystackCustomerSchema.optional(),
  authorization: PaystackAuthorizationSchema.optional(),
  plan: z.object({
    plan_code: z.string().optional()
  }).optional()
})

const PaystackSubscriptionDataSchema = z.object({
  subscription_code: z.string(),
  email_token: z.string().optional(),
  amount: z.number(),
  cron_expression: z.string().optional(),
  next_payment_date: z.string().optional(),
  open_invoice: z.string().optional(),
  id: z.number(),
  customer: PaystackCustomerSchema.optional(),
  plan: z.object({
    plan_code: z.string(),
    name: z.string().optional(),
    amount: z.number().optional(),
    interval: z.string().optional()
  }).optional(),
  authorization: PaystackAuthorizationSchema.optional(),
  status: z.string()
})

const PaystackInvoiceDataSchema = z.object({
  subscription_code: z.string().optional(),
  amount: z.number(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  status: z.string(),
  paid: z.boolean().optional(),
  customer: PaystackCustomerSchema.optional(),
  authorization: PaystackAuthorizationSchema.optional()
})

/**
 * Safely parse and validate Paystack metadata
 */
export function parsePaystackMetadata(metadata: any): z.infer<typeof PaystackMetadataSchema> {
  if (!metadata) {
    return {}
  }

  let parsedMetadata: any = metadata

  // Handle string metadata (JSON encoded)
  if (typeof metadata === 'string') {
    try {
      parsedMetadata = JSON.parse(metadata)
    } catch (error) {
      console.warn('Failed to parse metadata JSON:', error)
      return {}
    }
  }

  // Validate against schema
  try {
    return PaystackMetadataSchema.parse(parsedMetadata)
  } catch (error) {
    console.warn('Invalid metadata structure:', error)
    return {}
  }
}

/**
 * Validate charge.success webhook data
 */
export function validateChargeData(data: any): {
  isValid: boolean
  data?: z.infer<typeof PaystackChargeDataSchema>
  errors?: string[]
} {
  try {
    const validatedData = PaystackChargeDataSchema.parse(data)
    return {
      isValid: true,
      data: validatedData
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      }
    }
    return {
      isValid: false,
      errors: ['Unknown validation error']
    }
  }
}

/**
 * Validate subscription webhook data
 */
export function validateSubscriptionData(data: any): {
  isValid: boolean
  data?: z.infer<typeof PaystackSubscriptionDataSchema>
  errors?: string[]
} {
  try {
    const validatedData = PaystackSubscriptionDataSchema.parse(data)
    return {
      isValid: true,
      data: validatedData
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      }
    }
    return {
      isValid: false,
      errors: ['Unknown validation error']
    }
  }
}

/**
 * Validate invoice webhook data
 */
export function validateInvoiceData(data: any): {
  isValid: boolean
  data?: z.infer<typeof PaystackInvoiceDataSchema>
  errors?: string[]
} {
  try {
    const validatedData = PaystackInvoiceDataSchema.parse(data)
    return {
      isValid: true,
      data: validatedData
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      }
    }
    return {
      isValid: false,
      errors: ['Unknown validation error']
    }
  }
}

/**
 * Extract subscription correlation data from webhook
 */
export interface SubscriptionCorrelationData {
  subscriptionId?: string
  userId?: string
  userEmail?: string
  planId?: string
  reference: string
  amount: number
  currency: string
  paymentId: string
  authorization?: any
}

export function extractSubscriptionCorrelation(
  validatedData: z.infer<typeof PaystackChargeDataSchema>
): SubscriptionCorrelationData {
  const metadata = parsePaystackMetadata(validatedData.metadata)
  
  return {
    subscriptionId: metadata.subscription_id,
    userId: metadata.user_id,
    userEmail: metadata.user_email || validatedData.customer?.email,
    planId: metadata.plan_id,
    reference: validatedData.reference,
    amount: validatedData.amount,
    currency: validatedData.currency,
    paymentId: validatedData.id.toString(),
    authorization: validatedData.authorization
  }
}

/**
 * Validate webhook signature with enhanced error reporting
 */
export function validateWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret: string
): { isValid: boolean; error?: string } {
  if (!signature) {
    return { isValid: false, error: 'Missing signature header' }
  }

  if (!secret) {
    return { isValid: false, error: 'Missing webhook secret configuration' }
  }

  try {
    const crypto = require('crypto')
    const hash = crypto
      .createHmac("sha512", secret)
      .update(rawBody)
      .digest("hex")
    
    const isValid = hash === signature
    
    if (!isValid) {
      return { 
        isValid: false, 
        error: `Signature mismatch. Expected: ${hash.substring(0, 10)}..., Got: ${signature.substring(0, 10)}...` 
      }
    }
    
    return { isValid: true }
  } catch (error) {
    return { 
      isValid: false, 
      error: `Signature validation error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}

/**
 * Check if webhook event should be processed (not duplicate)
 */
export function shouldProcessWebhookEvent(
  event: string,
  reference: string,
  processedEvents: Set<string> = new Set()
): boolean {
  const eventKey = `${event}:${reference}`
  
  if (processedEvents.has(eventKey)) {
    console.log(`Skipping duplicate webhook event: ${eventKey}`)
    return false
  }
  
  processedEvents.add(eventKey)
  return true
}

/**
 * Log webhook validation results
 */
export function logWebhookValidation(
  event: string,
  reference: string,
  validation: { isValid: boolean; errors?: string[] }
): void {
  if (validation.isValid) {
    console.log(`Webhook validation passed for ${event}:${reference}`)
  } else {
    console.error(`Webhook validation failed for ${event}:${reference}:`, validation.errors)
  }
}