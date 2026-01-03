/**
 * Paystack currency configuration and validation
 */

// Supported currencies by Paystack (as of 2024/2025)
export const PAYSTACK_SUPPORTED_CURRENCIES = ['NGN', 'GHS', 'ZAR', 'USD', 'KES'] as const;

export type PaystackCurrency = typeof PAYSTACK_SUPPORTED_CURRENCIES[number];

/**
 * Default currency mapping for Paystack
 * This can be configured based on your business needs
 */
const CURRENCY_MAPPING: Record<string, PaystackCurrency> = {
  'USD': 'USD', // Keep USD as USD - Paystack supports USD
  'NGN': 'NGN',
  'GHS': 'GHS', 
  'ZAR': 'ZAR',
  'KES': 'KES', // Kenyan Shilling
};

/**
 * Get the appropriate Paystack currency for a given plan currency
 * @param planCurrency - The currency from the billing plan
 * @returns The currency to use with Paystack API
 */
export function getPaystackCurrency(planCurrency: string): PaystackCurrency {
  // First, check if the plan currency is directly supported
  if (PAYSTACK_SUPPORTED_CURRENCIES.includes(planCurrency as PaystackCurrency)) {
    return planCurrency as PaystackCurrency;
  }

  // Check if we have a mapping for this currency
  const mappedCurrency = CURRENCY_MAPPING[planCurrency.toUpperCase()];
  if (mappedCurrency) {
    return mappedCurrency;
  }

  // Default fallback - you can configure this based on your primary market
  // For USD businesses, this would typically be 'USD'
  // For Nigerian businesses, this would be 'NGN'
  // For Ghanaian businesses, this would be 'GHS', etc.
  const defaultCurrency = process.env.PAYSTACK_DEFAULT_CURRENCY as PaystackCurrency || 'USD';
  
  if (PAYSTACK_SUPPORTED_CURRENCIES.includes(defaultCurrency)) {
    return defaultCurrency;
  }

  // Final fallback
  return 'USD';
}

/**
 * Validate if a currency is supported by Paystack
 * @param currency - Currency code to validate
 * @returns True if supported, false otherwise
 */
export function isPaystackCurrencySupported(currency: string): currency is PaystackCurrency {
  return PAYSTACK_SUPPORTED_CURRENCIES.includes(currency as PaystackCurrency);
}

/**
 * Convert amount to the appropriate subunit for Paystack
 * @param amount - Amount in base currency
 * @param currency - Currency code
 * @returns Amount in subunits (kobo for NGN, pesewas for GHS, cents for USD/ZAR/KES)
 */
export function convertToPaystackSubunit(amount: number, currency: PaystackCurrency): number {
  // All supported Paystack currencies use 100 subunits per base unit
  return Math.round(amount * 100);
}