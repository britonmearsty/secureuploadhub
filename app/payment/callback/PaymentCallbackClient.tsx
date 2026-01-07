'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Clock, ArrowRight, Home } from 'lucide-react'

type PaymentStatus = 'processing' | 'success' | 'failed' | 'cancelled'

export default function PaymentCallbackClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<PaymentStatus>('processing')
  const [message, setMessage] = useState('')
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null)

  useEffect(() => {
    const reference = searchParams.get('reference')
    const trxref = searchParams.get('trxref')
    const paymentRef = reference || trxref

    if (!paymentRef) {
      setStatus('failed')
      setMessage('No payment reference found')
      return
    }

    // Verify payment with your backend
    verifyPayment(paymentRef)
  }, [searchParams])

  const verifyPayment = async (reference: string) => {
    try {
      const response = await fetch(`/api/billing/verify-payment?reference=${reference}`)
      const data = await response.json()

      if (data.success) {
        setStatus('success')
        setMessage('Payment successful! Your subscription is now active.')
        setSubscriptionDetails(data.subscription)
      } else {
        setStatus('failed')
        setMessage(data.message || 'Payment verification failed')
      }
    } catch (error) {
      setStatus('failed')
      setMessage('Failed to verify payment. Please contact support.')
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-16 w-16 text-green-500" />
      case 'failed':
        return <XCircle className="h-16 w-16 text-red-500" />
      case 'cancelled':
        return <XCircle className="h-16 w-16 text-gray-500" />
      default:
        return <Clock className="h-16 w-16 text-blue-500 animate-pulse" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'from-green-400 to-green-600'
      case 'failed':
        return 'from-red-400 to-red-600'
      case 'cancelled':
        return 'from-gray-400 to-gray-600'
      default:
        return 'from-blue-400 to-blue-600'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${getStatusColor()} px-6 py-8 text-white text-center`}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="flex justify-center mb-4"
          >
            {getStatusIcon()}
          </motion.div>
          <h1 className="text-2xl font-bold mb-2">
            {status === 'processing' && 'Processing Payment...'}
            {status === 'success' && 'Payment Successful!'}
            {status === 'failed' && 'Payment Failed'}
            {status === 'cancelled' && 'Payment Cancelled'}
          </h1>
          <p className="text-white/90">{message}</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {status === 'success' && subscriptionDetails && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-6"
            >
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">Subscription Details</h3>
                <div className="space-y-1 text-sm text-green-800">
                  <p><span className="font-medium">Plan:</span> {subscriptionDetails.plan?.name}</p>
                  <p><span className="font-medium">Amount:</span> ${subscriptionDetails.plan?.price}/month</p>
                  <p><span className="font-medium">Status:</span> Active</p>
                </div>
              </div>
            </motion.div>
          )}

          {status === 'failed' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-6"
            >
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-900 mb-2">What to do next:</h3>
                <ul className="space-y-1 text-sm text-red-800">
                  <li>• Check your payment details and try again</li>
                  <li>• Ensure you have sufficient funds</li>
                  <li>• Contact your bank if the issue persists</li>
                  <li>• Reach out to our support team for help</li>
                </ul>
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {status === 'success' && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                onClick={() => router.push('/dashboard')}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
              >
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </motion.button>
            )}

            {status === 'failed' && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                onClick={() => router.push('/dashboard/billing')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
              >
                Try Again
                <ArrowRight className="ml-2 h-4 w-4" />
              </motion.button>
            )}

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              onClick={() => router.push('/')}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
            >
              <Home className="mr-2 h-4 w-4" />
              Back to Home
            </motion.button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 text-center">
          <p className="text-xs text-gray-500">
            Need help? Contact our support team at support@secureuploadhub.com
          </p>
        </div>
      </motion.div>
    </div>
  )
}