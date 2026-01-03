/**
 * Payment status constants
 */
export const PAYMENT_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
  REFUNDED: "refunded",
} as const

export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS]

/**
 * Subscription status constants
 */
export const SUBSCRIPTION_STATUS = {
  ACTIVE: "active",
  INCOMPLETE: "incomplete",
  INCOMPLETE_EXPIRED: "incomplete_expired",
  PAST_DUE: "past_due",
  CANCELED: "canceled",
  UNPAID: "unpaid",
} as const

export type SubscriptionStatus = typeof SUBSCRIPTION_STATUS[keyof typeof SUBSCRIPTION_STATUS]

/**
 * Subscription history action constants
 */
export const SUBSCRIPTION_HISTORY_ACTION = {
  PLAN_CHANGED: "plan_changed",
  STATUS_CHANGED: "status_changed",
  CANCELLED: "cancelled",
  REACTIVATED: "reactivated",
  RENEWED: "renewed",
  GRACE_PERIOD_STARTED: "grace_period_started",
  GRACE_PERIOD_ENDED: "grace_period_ended",
} as const

export type SubscriptionHistoryAction = typeof SUBSCRIPTION_HISTORY_ACTION[keyof typeof SUBSCRIPTION_HISTORY_ACTION]

/**
 * Billing interval constants
 */
export const BILLING_INTERVAL = {
  MONTHLY: "monthly",
  YEARLY: "yearly",
} as const

export type BillingInterval = typeof BILLING_INTERVAL[keyof typeof BILLING_INTERVAL]

/**
 * Map Paystack payment status to internal status
 */
export function mapPaystackPaymentStatus(paystackStatus: string): PaymentStatus {
  const statusMap: Record<string, PaymentStatus> = {
    pending: PAYMENT_STATUS.PENDING,
    processing: PAYMENT_STATUS.PROCESSING,
    success: PAYMENT_STATUS.SUCCEEDED,
    succeeded: PAYMENT_STATUS.SUCCEEDED,
    completed: PAYMENT_STATUS.SUCCEEDED,
    failed: PAYMENT_STATUS.FAILED,
    refunded: PAYMENT_STATUS.REFUNDED,
  }

  return statusMap[paystackStatus.toLowerCase()] || PAYMENT_STATUS.PENDING
}

/**
 * Map Paystack subscription status to internal status
 */
export function mapPaystackSubscriptionStatus(paystackStatus: string): SubscriptionStatus {
  const statusMap: Record<string, SubscriptionStatus> = {
    active: SUBSCRIPTION_STATUS.ACTIVE,
    incomplete: SUBSCRIPTION_STATUS.INCOMPLETE,
    incomplete_expired: SUBSCRIPTION_STATUS.INCOMPLETE_EXPIRED,
    past_due: SUBSCRIPTION_STATUS.PAST_DUE,
    canceled: SUBSCRIPTION_STATUS.CANCELED,
    cancelled: SUBSCRIPTION_STATUS.CANCELED,
    unpaid: SUBSCRIPTION_STATUS.UNPAID,
  }

  return statusMap[paystackStatus.toLowerCase()] || SUBSCRIPTION_STATUS.ACTIVE
}

