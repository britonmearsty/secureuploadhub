'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Shield, CreditCard, Smartphone, Building2, CheckCircle, AlertCircle } from 'lucide-react'
import PaymentForm from './PaymentForm'

interface CheckoutPageProps {
  plan: {
    id: string
    name: string
    price: number
    currency: string
    features: string[]
    description?: string
  }
  onBack?: () => void
}

export default function CheckoutPage({ plan, onBack }: CheckoutPageProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank' | 'ussd'>('card')
  const [showPaymentForm, setShowPaymentForm] = useState(false)

  const paymentMethods = [
    {
      id: 'card' as const,
      name: 'Debit/Credit Card',
      icon: CreditCard,
      description: 'Visa, Mastercard, Verve',
      popular: true
    },
    {
      id: 'bank' as const,
      name: 'Bank Transfer',
      icon: Building2,
      description: 'Direct bank transfer'
    },
    {
      id: 'ussd' as const,
      name: 'USSD',
      icon: Smartphone,
      description: 'Pay with your phone'
    }
  ]

  const steps = [
    { number: 1, title: 'Plan Selection', completed: true },
    { number: 2, title: 'Payment Method', completed: currentStep > 2 },
    { number: 3, title: 'Payment', completed: false }
  ]

  const handleContinue = () => {
    if (currentStep === 2) {
      setCurrentStep(3)
      setShowPaymentForm(true)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {onBack && (
                <button
                  onClick={onBack}
                  className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              <div className="flex items-center">
                <Shield className="h-6 w-6 text-blue-600 mr-2" />
                <h1 className="text-xl font-bold text-gray-900">SecureUploadHub</h1>
              </div>
            </div>
            
            {/* Progress Steps */}
            <div className="hidden md:flex items-center space-x-4">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                    step.completed 
                      ? 'bg-green-500 text-white' 
                      : currentStep === step.number
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step.completed ? <CheckCircle className="h-4 w-4" /> : step.number}
                  </div>
                  <span className={`ml-2 text-sm ${
                    step.completed || currentStep === step.number ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </span>
                  {index < steps.length - 1 && (
                    <div className="w-8 h-px bg-gray-300 mx-4" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {currentStep === 2 && !showPaymentForm && (
                <motion.div
                  key="payment-method"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white rounded-2xl shadow-lg p-6"
                >
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Choose Payment Method</h2>
                  
                  <div className="space-y-4">
                    {paymentMethods.map((method) => (
                      <motion.div
                        key={method.id}
                        whileHover={{ scale: 1.02 }}
                        className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all ${
                          paymentMethod === method.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setPaymentMethod(method.id)}
                      >
                        <div className="flex items-center">
                          <div className={`p-3 rounded-lg mr-4 ${
                            paymentMethod === method.id ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                            <method.icon className={`h-6 w-6 ${
                              paymentMethod === method.id ? 'text-blue-600' : 'text-gray-600'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center">
                              <h3 className="font-semibold text-gray-900">{method.name}</h3>
                              {method.popular && (
                                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                  Popular
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{method.description}</p>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 ${
                            paymentMethod === method.id
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-gray-300'
                          }`}>
                            {paymentMethod === method.id && (
                              <div className="w-full h-full rounded-full bg-white scale-50" />
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <motion.button
                    onClick={handleContinue}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
                  >
                    Continue to Payment
                  </motion.button>
                </motion.div>
              )}

              {showPaymentForm && (
                <motion.div
                  key="payment-form"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <PaymentForm 
                    plan={plan}
                    onPaymentInitiate={() => console.log('Payment initiated')}
                    onPaymentSuccess={() => console.log('Payment successful')}
                    onPaymentError={(error) => console.error('Payment error:', error)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-900">{plan.name} Plan</h4>
                    <p className="text-sm text-gray-500">Monthly subscription</p>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {plan.currency === 'USD' ? '$' : '₦'}{plan.price}
                    </div>
                    <div className="text-sm text-gray-500">/month</div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center font-semibold text-lg">
                    <span>Total</span>
                    <span>{plan.currency === 'USD' ? '$' : '₦'}{plan.price}/month</span>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-medium text-gray-900 mb-3">Included features:</h4>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Security Notice */}
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                  <Shield className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-900">Secure Payment</p>
                    <p className="text-xs text-green-700">Your payment information is encrypted and secure</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}