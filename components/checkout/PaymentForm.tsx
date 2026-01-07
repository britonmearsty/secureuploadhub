'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { CreditCard, Shield, Clock, CheckCircle } from 'lucide-react'

interface PaymentFormProps {
  plan: {
    id: string
    name: string
    price: number
    currency: string
    features: string[]
  }
  onPaymentInitiate?: () => void
  onPaymentSuccess?: () => void
  onPaymentError?: (error: string) => void
}

export default function PaymentForm({ 
  plan, 
  onPaymentInitiate, 
  onPaymentSuccess, 
  onPaymentError 
}: PaymentFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [paymentStep, setPaymentStep] = useState<'details' | 'processing' | 'success'>('details')

  const handlePayment = async () => {
    setIsLoading(true)
    setPaymentStep('processing')
    onPaymentInitiate?.()

    try {
      const response = await fetch('/api/billing/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: plan.id,
        }),
      })

      const data = await response.json()

      if (data.paymentLink) {
        // Redirect to Paystack checkout
        window.location.href = data.paymentLink
      } else if (data.subscription) {
        setPaymentStep('success')
        onPaymentSuccess?.()
      }
    } catch (error) {
      console.error('Payment error:', error)
      onPaymentError?.(error instanceof Error ? error.message : 'Payment failed')
      setPaymentStep('details')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Header with branding */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-8 text-white">
        <div className="flex items-center justify-center mb-4">
          <Shield className="h-8 w-8 mr-2" />
          <h2 className="text-2xl font-bold">SecureUploadHub</h2>
        </div>
        <p className="text-center text-blue-100">Secure. Fast. Reliable.</p>
      </div>

      {/* Plan Details */}
      <div className="px-6 py-6">
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name} Plan</h3>
          <div className="flex items-center justify-center">
            <span className="text-3xl font-bold text-gray-900">
              {plan.currency === 'USD' ? '$' : '₦'}{plan.price}
            </span>
            <span className="text-gray-500 ml-2">/month</span>
          </div>
        </div>

        {/* Features */}
        <div className="mb-6">
          <h4 className="font-semibold text-gray-900 mb-3">What's included:</h4>
          <ul className="space-y-2">
            {plan.features.map((feature, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center text-gray-700"
              >
                <CheckCircle className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                {feature}
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Security badges */}
        <div className="flex items-center justify-center space-x-4 mb-6 text-sm text-gray-500">
          <div className="flex items-center">
            <Shield className="h-4 w-4 mr-1" />
            SSL Secured
          </div>
          <div className="flex items-center">
            <CreditCard className="h-4 w-4 mr-1" />
            PCI Compliant
          </div>
        </div>

        {/* Payment Button */}
        <motion.button
          onClick={handlePayment}
          disabled={isLoading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-200 ${
            isLoading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Processing...
            </div>
          ) : (
            `Subscribe to ${plan.name} - ${plan.currency === 'USD' ? '$' : '₦'}{plan.price}/month`
          )}
        </motion.button>

        {/* Trust indicators */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Powered by Paystack • Cancel anytime • 30-day money-back guarantee
          </p>
        </div>
      </div>
    </div>
  )
}