'use client'

import { useEffect } from 'react'

interface PaystackPopupProps {
  email: string
  amount: number
  currency: string
  reference: string
  publicKey: string
  onSuccess: (response: any) => void
  onClose: () => void
  metadata?: Record<string, any>
  channels?: string[]
  customFields?: Array<{
    display_name: string
    variable_name: string
    value: string
  }>
}

declare global {
  interface Window {
    PaystackPop: {
      setup: (config: any) => {
        openIframe: () => void
      }
    }
  }
}

export default function PaystackPopup({
  email,
  amount,
  currency,
  reference,
  publicKey,
  onSuccess,
  onClose,
  metadata = {},
  channels = ['card', 'bank', 'ussd', 'bank_transfer'],
  customFields = []
}: PaystackPopupProps) {
  
  useEffect(() => {
    // Load Paystack script
    const script = document.createElement('script')
    script.src = 'https://js.paystack.co/v1/inline.js'
    script.async = true
    document.body.appendChild(script)

    script.onload = () => {
      // Initialize Paystack popup
      const handler = window.PaystackPop.setup({
        key: publicKey,
        email: email,
        amount: amount * 100, // Convert to kobo/cents
        currency: currency,
        ref: reference,
        channels: channels,
        custom_fields: customFields,
        metadata: {
          ...metadata,
          cancel_action: 'redirect',
        },
        callback: function(response: any) {
          onSuccess(response)
        },
        onClose: function() {
          onClose()
        }
      })

      // Auto-open the popup
      handler.openIframe()
    }

    return () => {
      document.body.removeChild(script)
    }
  }, [email, amount, currency, reference, publicKey, onSuccess, onClose, metadata, channels, customFields])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-700">Loading secure payment...</span>
        </div>
      </div>
    </div>
  )
}