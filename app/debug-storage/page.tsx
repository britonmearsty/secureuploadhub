"use client"

import { useEffect, useState } from 'react'

export default function DebugStoragePage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/storage/accounts')
        if (response.ok) {
          const result = await response.json()
          setData(result)
        } else {
          const errorText = await response.text()
          setError(`API Error: ${response.status} - ${errorText}`)
        }
      } catch (err) {
        setError(`Network Error: ${err}`)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Storage Debug Page</h1>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Storage Debug Page</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <div className="bg-gray-100 p-4 rounded">
            <h2 className="font-bold mb-2">Raw API Response:</h2>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>

          <div className="bg-blue-100 p-4 rounded">
            <h2 className="font-bold mb-2">Account Summary:</h2>
            <p><strong>Total Accounts:</strong> {data.accounts?.length || 0}</p>
            
            {data.accounts?.map((account: any, index: number) => (
              <div key={index} className="mt-2 p-2 bg-white rounded">
                <p><strong>Provider:</strong> {account.provider}</p>
                <p><strong>Email:</strong> {account.email}</p>
                <p><strong>Is Connected:</strong> {account.isConnected ? '✅ YES' : '❌ NO'}</p>
                <p><strong>Has Valid OAuth:</strong> {account.hasValidOAuth ? '✅ YES' : '❌ NO'}</p>
                <p><strong>Storage Status:</strong> {account.storageStatus || 'N/A'}</p>
                <p><strong>Storage Account ID:</strong> {account.storageAccountId || 'N/A'}</p>
              </div>
            ))}
          </div>

          {data.fallbackInfo && (
            <div className="bg-yellow-100 p-4 rounded">
              <h2 className="font-bold mb-2">Fallback Info:</h2>
              <p><strong>Accounts Created:</strong> {data.fallbackInfo.accountsCreated}</p>
              <p><strong>Errors:</strong> {data.fallbackInfo.errors?.length || 0}</p>
              {data.fallbackInfo.errors?.map((error: string, index: number) => (
                <p key={index} className="text-red-600 text-sm">• {error}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}