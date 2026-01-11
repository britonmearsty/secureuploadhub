/**
 * Paystack Payment Button Component
 * Integrates with your backend to handle subscription payments
 */

'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'

interface PaystackPaymentButtonProps {
  planId: string
  planName: string
  amount: number
  currency?: string
  onSuccess?: (reference: string) => void
  onError?: (error: string) => void
}

export default function PaystackPaymentButton({
  planId,
  planName,
  amount,
  currency = 'NGN',
  onSuccess,
  onError
}: PaystackPaymentButtonProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)

  const handlePayment = async () => {
    if (!session?.user?.email) {
      onError?.('Please sign in to continue')
      return
    }

    setLoading(true)

    try {
      // Initialize payment with your backend
      const response = await fetch('/api/billing/initialize-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: session.user.email,
          amount,
          planId,
          currency
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to initialize payment')
      }

      const { access_code, authorization_url, reference } = await response.json()

      // Option 1: Use Paystack Popup (requires @paystack/inline-js)
      if (typeof window !== 'undefined' && window.PaystackPop) {
        const popup = new window.PaystackPop()
        popup.resumeTransaction(access_code)
        
        // Note: You'll need to handle the callback in your app
        // Paystack will redirect to your callback_url after payment
        onSuccess?.(reference)
      } else {
        // Option 2: Redirect to Paystack checkout page
        window.location.href = authorization_url
      }

    } catch (error) {
      console.error('Payment error:', error)
      onError?.(error instanceof Error ? error.message : 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handlePayment}
      disabled={loading || !session}
      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Processing...
        </span>
      ) : (
        `Pay ${currency} ${amount.toLocaleString()} for ${planName}`
      )}
    </button>
  )
}

// Type declaration for Paystack Popup
declare global {
  interface Window {
    PaystackPop: {
      new(): {
        resumeTransaction: (access_code: string) => void
      }
      setup: (config: any) => {
        openIframe: () => void
      }
    }
  }
}