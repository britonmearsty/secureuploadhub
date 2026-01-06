"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react"

interface HealthCheckResult {
  accountId: string | null
  provider: string
  action: string
  previousStatus: string | null
  newStatus: string | null
  error: string | null
}

interface HealthCheckResponse {
  success: boolean
  checkedAccounts: number
  createdAccounts: number
  results: HealthCheckResult[]
  error?: string
}

export function StorageHealthCheck() {
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<HealthCheckResponse | null>(null)

  const runHealthCheck = async () => {
    setIsRunning(true)
    setResults(null)

    try {
      const response = await fetch("/api/storage/health-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()
      setResults(data)
    } catch (error) {
      setResults({
        success: false,
        checkedAccounts: 0,
        createdAccounts: 0,
        results: [],
        error: error instanceof Error ? error.message : "Unknown error"
      })
    } finally {
      setIsRunning(false)
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case "created":
      case "reactivated":
      case "validated":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "disconnected":
      case "create_failed":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getActionDescription = (result: HealthCheckResult) => {
    switch (result.action) {
      case "created":
        return `Created new ${result.provider} storage account`
      case "reactivated":
        return `Reactivated ${result.provider} account (was ${result.previousStatus})`
      case "validated":
        return `${result.provider} account is working correctly`
      case "disconnected":
        return `Disconnected ${result.provider} account: ${result.error}`
      case "create_failed":
        return `Failed to create ${result.provider} account: ${result.error}`
      default:
        return `Unknown action for ${result.provider}`
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Storage Health Check
        </CardTitle>
        <CardDescription>
          Check and fix your storage account connections. This can resolve the "No active storage account available" error.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runHealthCheck} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Running Health Check...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Run Storage Health Check
            </>
          )}
        </Button>

        {results && (
          <div className="space-y-4">
            {results.error ? (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  Health check failed: {results.error}
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Health check completed successfully. 
                    Checked {results.checkedAccounts} accounts, 
                    created {results.createdAccounts} new accounts.
                  </AlertDescription>
                </Alert>

                {results.results.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Results:</h4>
                    {results.results.map((result, index) => (
                      <div key={index} className="flex items-start gap-2 p-3 border rounded-lg">
                        {getActionIcon(result.action)}
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {getActionDescription(result)}
                          </p>
                          {result.newStatus && (
                            <p className="text-xs text-muted-foreground">
                              Status: {result.newStatus}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    If you're still experiencing issues after running the health check, 
                    try disconnecting and reconnecting your storage accounts in the settings.
                  </AlertDescription>
                </Alert>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}