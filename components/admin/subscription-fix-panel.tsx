'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle, RefreshCw, Zap } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface FixStats {
  totalIncomplete: number
  incompleteWithPayments: number
  canFix: number
}

interface FixResult {
  subscriptionId: string
  userEmail: string
  planName: string
  paymentAmount?: number
  error?: string
}

interface FixResponse {
  success: boolean
  summary: {
    total: number
    successful: number
    failed: number
  }
  results: {
    successful: FixResult[]
    failed: FixResult[]
  }
}

export function SubscriptionFixPanel() {
  const [stats, setStats] = useState<FixStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [fixing, setFixing] = useState(false)
  const [lastFix, setLastFix] = useState<FixResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadStats = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/admin/fix-subscriptions')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      setStats(data)
    } catch (err: any) {
      setError(err.message)
      console.error('Error loading stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const runFix = async () => {
    try {
      setFixing(true)
      setError(null)
      
      const response = await fetch('/api/admin/fix-subscriptions', {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      setLastFix(data)
      
      // Reload stats after fix
      await loadStats()
    } catch (err: any) {
      setError(err.message)
      console.error('Error running fix:', err)
    } finally {
      setFixing(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Subscription Status Fix
          </CardTitle>
          <CardDescription>
            Monitor and fix incomplete subscriptions that have successful payments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{stats.totalIncomplete}</div>
                <div className="text-sm text-gray-600">Total Incomplete</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-900">{stats.incompleteWithPayments}</div>
                <div className="text-sm text-yellow-600">With Payments</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-900">{stats.canFix}</div>
                <div className="text-sm text-green-600">Can Fix</div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={loadStats}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Stats
            </Button>
            
            <Button
              onClick={runFix}
              disabled={fixing || !stats?.canFix}
              size="sm"
            >
              <Zap className={`h-4 w-4 mr-2 ${fixing ? 'animate-pulse' : ''}`} />
              {fixing ? 'Fixing...' : `Fix ${stats?.canFix || 0} Subscriptions`}
            </Button>
          </div>

          {/* Last Fix Results */}
          {lastFix && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Last Fix Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Badge variant="outline">
                    Total: {lastFix.summary.total}
                  </Badge>
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Fixed: {lastFix.summary.successful}
                  </Badge>
                  {lastFix.summary.failed > 0 && (
                    <Badge variant="destructive">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Failed: {lastFix.summary.failed}
                    </Badge>
                  )}
                </div>

                {/* Successful fixes */}
                {lastFix.results.successful.length > 0 && (
                  <div>
                    <h4 className="font-medium text-green-700 mb-2">Successfully Fixed:</h4>
                    <div className="space-y-1">
                      {lastFix.results.successful.map((result, index) => (
                        <div key={index} className="text-sm bg-green-50 p-2 rounded">
                          <span className="font-medium">{result.userEmail}</span>
                          <span className="text-gray-600"> - {result.planName}</span>
                          {result.paymentAmount && (
                            <span className="text-green-600"> (${result.paymentAmount})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Failed fixes */}
                {lastFix.results.failed.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-700 mb-2">Failed to Fix:</h4>
                    <div className="space-y-1">
                      {lastFix.results.failed.map((result, index) => (
                        <div key={index} className="text-sm bg-red-50 p-2 rounded">
                          <span className="font-medium">{result.userEmail}</span>
                          <span className="text-gray-600"> - {result.planName}</span>
                          <div className="text-red-600 text-xs">{result.error}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  )
}