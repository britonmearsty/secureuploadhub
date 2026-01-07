'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, RefreshCw, Wrench, Eye, AlertTriangle, CheckCircle } from 'lucide-react'

interface HealthIssue {
  type: string
  severity: 'high' | 'medium' | 'low'
  userEmail: string
  planName: string
  issue: string
  suggestedFix: string
  subscriptionId: string
}

interface HealthReport {
  timestamp: string
  summary: {
    totalSubscriptions: number
    activeSubscriptions: number
    incompleteSubscriptions: number
    issuesFound: number
    fixesApplied: number
  }
  issues: HealthIssue[]
  mode: 'dry-run' | 'auto-fix' | 'report-only'
}

export default function SubscriptionHealthDashboard() {
  const [report, setReport] = useState<HealthReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkHealth = async (autoFix: boolean = false, dryRun: boolean = false) => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (autoFix) params.set('fix', 'true')
      if (dryRun) params.set('dryRun', 'true')

      const response = await fetch(`/api/admin/subscription-health?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check subscription health')
      }

      setReport(data.report)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'default'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="h-4 w-4" />
      case 'medium': return <AlertTriangle className="h-4 w-4" />
      case 'low': return <Eye className="h-4 w-4" />
      default: return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Subscription Health Monitor</h2>
          <p className="text-muted-foreground">
            Monitor and fix subscription payment issues
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => checkHealth(false, true)}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            Preview Fixes
          </Button>
          <Button
            variant="outline"
            onClick={() => checkHealth(false, false)}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Check Health
          </Button>
          <Button
            onClick={() => checkHealth(true, false)}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wrench className="h-4 w-4 mr-2" />}
            Fix Issues
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {report && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.summary.totalSubscriptions}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{report.summary.activeSubscriptions}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Incomplete</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{report.summary.incompleteSubscriptions}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Issues Found</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{report.summary.issuesFound}</div>
                {report.summary.fixesApplied > 0 && (
                  <div className="text-sm text-green-600 mt-1">
                    {report.summary.fixesApplied} fixed
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Mode Badge */}
          <div className="flex items-center gap-2">
            <Badge variant={report.mode === 'auto-fix' ? 'default' : 'secondary'}>
              {report.mode === 'dry-run' && 'Preview Mode'}
              {report.mode === 'auto-fix' && 'Auto-Fix Applied'}
              {report.mode === 'report-only' && 'Report Only'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Last checked: {new Date(report.timestamp).toLocaleString()}
            </span>
          </div>

          {/* Issues List */}
          {report.issues.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Issues Detected</CardTitle>
                <CardDescription>
                  {report.issues.length} issue(s) found that may affect subscription functionality
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {report.issues.map((issue, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={getSeverityColor(issue.severity)}>
                            {getSeverityIcon(issue.severity)}
                            {issue.severity.toUpperCase()}
                          </Badge>
                          <span className="font-medium">{issue.userEmail}</span>
                          <span className="text-sm text-muted-foreground">({issue.planName})</span>
                        </div>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {issue.subscriptionId}
                        </code>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm">{issue.issue}</p>
                        <p className="text-sm text-muted-foreground">
                          <strong>Suggested fix:</strong> {issue.suggestedFix}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium">All Subscriptions Healthy</h3>
                  <p className="text-muted-foreground">No issues detected in your subscription system</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!report && !loading && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <RefreshCw className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">Ready to Check</h3>
              <p className="text-muted-foreground mb-4">
                Click "Check Health" to analyze your subscription system
              </p>
              <Button onClick={() => checkHealth(false, false)}>
                Start Health Check
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}