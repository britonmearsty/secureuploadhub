'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle, RefreshCw, Clock } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Subscription {
  id: string
  status: string
  plan: {
    name: string
    price: number
    currency: string
  }
  currentPeriodStart?: string
  currentPeriodEnd?: string
  cancelAtPeriodEnd?: boolean
  lastPayment?: {
    id: string
    amount: number
    status: string
    createdAt: string
  }
}

interface StatusCheckResponse {
  updated: boolean
  message: string
  subscription: Subscription
}

export function SubscriptionStatusChecker({ initialSubscription }: { initialSubscription?: Subscription }) {
  const [subscription, setSubscription] = useState<Subscription | null>(initialSubscription || null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const checkStatus = async () => {
    try {
      setChecking(true)
      setError(null)
      setMessage(null)
      
      const response = await fetch('/api/billing/subscription/status', {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data: StatusCheckResponse = await response.json()
      setMessage(data.message)
      
      if (data.updated) {
        setSubscription(data.subscription)
        // Refresh the page after a short delay to show updated status
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      }
    } catch (err: any) {
      setError(err.message)
      console.error('Error checking status:', err)
    } finally {
      setChecking(false)
    }
  }

  const loadCurrentStatus = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/billing/subscription/status')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      setSubscription(data.subscription)
    } catch (err: any) {
      setError(err.message)
      console.error('Error loading status:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>
      case 'incomplete':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Incomplete</Badge>
      case 'past_due':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Past Due</Badge>
      case 'canceled':
        return <Badge variant="outline">Canceled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription Status</CardTitle>
          <CardDescription>Check your current subscription status</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={loadCurrentStatus} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Load Subscription Status
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Subscription Status
          {getStatusBadge(subscription.status)}
        </CardTitle>
        <CardDescription>
          {subscription.plan.name} - ${subscription.plan.price}/{subscription.plan.currency}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {message && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {/* Show incomplete status warning */}
        {subscription.status === 'incomplete' && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Your subscription is incomplete. If you've already made a payment, 
              click "Check Status" to refresh your subscription status.
            </AlertDescription>
          </Alert>
        )}

        {/* Subscription details */}
        <div className="space-y-2 text-sm">
          {subscription.currentPeriodStart && subscription.currentPeriodEnd && (
            <div>
              <span className="font-medium">Billing Period:</span>{' '}
              {new Date(subscription.currentPeriodStart).toLocaleDateString()} - {' '}
              {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
            </div>
          )}
          
          {subscription.lastPayment && (
            <div>
              <span className="font-medium">Last Payment:</span>{' '}
              ${subscription.lastPayment.amount} on {' '}
              {new Date(subscription.lastPayment.createdAt).toLocaleDateString()}
              {' '}({subscription.lastPayment.status})
            </div>
          )}

          {subscription.cancelAtPeriodEnd && (
            <div className="text-orange-600">
              <span className="font-medium">Notice:</span> Subscription will cancel at the end of the current period
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={checkStatus}
            disabled={checking}
            variant={subscription.status === 'incomplete' ? 'default' : 'outline'}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Checking...' : 'Check Status'}
          </Button>
          
          <Button
            onClick={loadCurrentStatus}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}