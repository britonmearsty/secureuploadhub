import { getPaystack } from "./billing"
import { PAYSTACK_CONFIG } from "./paystack-config"

export interface PaystackCustomer {
  id: number
  email: string
  first_name?: string
  last_name?: string
  phone?: string
  customer_code: string
}

export interface PaystackPlan {
  id: number
  name: string
  amount: number
  interval: "daily" | "weekly" | "monthly" | "annually"
  currency: string
  plan_code: string
  description?: string
}

export interface PaystackSubscription {
  id: number
  customer: number
  plan: number
  status: "active" | "non-renewing" | "cancelled"
  subscription_code: string
  email_token: string
  authorization: {
    authorization_code: string
    bin: string
    last4: string
    exp_month: string
    exp_year: string
    channel: string
    card_type: string
    bank: string
    country_code: string
    brand: string
    reusable: boolean
    signature: string
    account_name: string | null
  }
  next_payment_date: string
  createdAt: string
}

export interface CreateCustomerData {
  email: string
  first_name?: string
  last_name?: string
  phone?: string
}

export interface CreatePlanData {
  name: string
  amount: number // in kobo
  interval: "daily" | "weekly" | "monthly" | "annually"
  currency?: string
  description?: string
}

export interface CreateSubscriptionData {
  customer: string // customer code or email
  plan: string // plan code
  authorization?: string // authorization code
  start_date?: string // ISO date
}

export interface UpdateSubscriptionData {
  plan?: string // plan code
  authorization?: string // authorization code
}

/**
 * Get or create a Paystack customer
 */
export async function getOrCreatePaystackCustomer(
  data: CreateCustomerData
): Promise<PaystackCustomer> {
  const paystack = await getPaystack()
  
  try {
    // Try to find existing customer by email
    const customers = await (paystack as any).customer.list({ email: data.email })
    
    if (customers.status && customers.data && customers.data.length > 0) {
      return customers.data[0] as PaystackCustomer
    }
  } catch (error) {
    // Customer doesn't exist, create new one
  }

  // Create new customer
  const response = await (paystack as any).customer.create(data)
  
  if (!response.status) {
    throw new Error(`Failed to create Paystack customer: ${response.message}`)
  }

  return response.data as PaystackCustomer
}

/**
 * Create a Paystack subscription plan
 */
export async function createPaystackPlan(
  data: CreatePlanData
): Promise<PaystackPlan> {
  const paystack = await getPaystack()
  
  const planData = {
    name: data.name,
    amount: data.amount,
    interval: data.interval,
    currency: data.currency || "NGN",
    description: data.description,
  }

  const response = await (paystack as any).plan.create(planData)
  
  if (!response.status) {
    throw new Error(`Failed to create Paystack plan: ${response.message}`)
  }

  return response.data as PaystackPlan
}

/**
 * Get or create a Paystack plan
 */
export async function getOrCreatePaystackPlan(
  data: CreatePlanData
): Promise<PaystackPlan> {
  const paystack = await getPaystack()
  
  try {
    // Try to find existing plan by name
    const plans = await (paystack as any).plan.list()
    
    if (plans.status && plans.data) {
      const existingPlan = plans.data.find(
        (p: any) => p.name === data.name && p.amount === data.amount && p.interval === data.interval
      )
      
      if (existingPlan) {
        return existingPlan as PaystackPlan
      }
    }
  } catch (error) {
    // Plan doesn't exist, create new one
  }

  // Create new plan
  return createPaystackPlan(data)
}

/**
 * Create a Paystack subscription
 */
export async function createPaystackSubscription(
  data: CreateSubscriptionData
): Promise<PaystackSubscription> {
  const paystack = await getPaystack()
  
  const subscriptionData: any = {
    customer: data.customer,
    plan: data.plan,
  }

  if (data.authorization) {
    subscriptionData.authorization = data.authorization
  }

  if (data.start_date) {
    subscriptionData.start_date = data.start_date
  }

  const response = await (paystack as any).subscription.create(subscriptionData)
  
  if (!response.status) {
    throw new Error(`Failed to create Paystack subscription: ${response.message}`)
  }

  return response.data as PaystackSubscription
}

/**
 * Get a Paystack subscription by code
 */
export async function getPaystackSubscription(
  subscriptionCode: string
): Promise<PaystackSubscription | null> {
  const paystack = await getPaystack()
  
  try {
    const response = await (paystack as any).subscription.get(subscriptionCode)
    
    if (!response.status) {
      return null
    }

    return response.data as PaystackSubscription
  } catch (error) {
    return null
  }
}

/**
 * Update a Paystack subscription
 */
export async function updatePaystackSubscription(
  subscriptionCode: string,
  data: UpdateSubscriptionData
): Promise<PaystackSubscription> {
  const paystack = await getPaystack()
  
  const updateData: any = {}
  
  if (data.plan) {
    updateData.plan = data.plan
  }
  
  if (data.authorization) {
    updateData.authorization = data.authorization
  }

  const response = await (paystack as any).subscription.update(subscriptionCode, updateData)
  
  if (!response.status) {
    throw new Error(`Failed to update Paystack subscription: ${response.message}`)
  }

  return response.data as PaystackSubscription
}

/**
 * Cancel a Paystack subscription
 */
export async function cancelPaystackSubscription(
  subscriptionCode: string,
  token?: string
): Promise<PaystackSubscription> {
  const paystack = await getPaystack()
  
  const cancelData: any = {}
  if (token) {
    cancelData.token = token
  }

  const response = await (paystack as any).subscription.disable(subscriptionCode, cancelData)
  
  if (!response.status) {
    throw new Error(`Failed to cancel Paystack subscription: ${response.message}`)
  }

  return response.data as PaystackSubscription
}

/**
 * Process a Paystack refund
 */
export interface RefundData {
  transaction: string // transaction reference or ID
  amount?: number // in kobo, if not provided, full refund
  currency?: string
  customer_note?: string
  merchant_note?: string
}

export interface PaystackRefund {
  id: number
  transaction: {
    id: number
    reference: string
  }
  amount: number
  currency: string
  status: "pending" | "processed" | "failed"
  createdAt: string
}

export async function processPaystackRefund(
  data: RefundData
): Promise<PaystackRefund> {
  const paystack = await getPaystack()
  
  const refundData: any = {
    transaction: data.transaction,
  }

  if (data.amount) {
    refundData.amount = data.amount
  }

  if (data.currency) {
    refundData.currency = data.currency
  }

  if (data.customer_note) {
    refundData.customer_note = data.customer_note
  }

  if (data.merchant_note) {
    refundData.merchant_note = data.merchant_note
  }

  const response = await (paystack as any).refund.create(refundData)
  
  if (!response.status) {
    throw new Error(`Failed to process Paystack refund: ${response.message}`)
  }

  return response.data as PaystackRefund
}

