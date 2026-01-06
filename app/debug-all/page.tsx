"use client"

import { useEffect, useState } from 'react'

export default function DebugAllPage() {
  const [storageData, setStorageData] = useState<any>(null)
  const [disconnectResult, setDisconnectResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    fetchStorageData()
  }, [])

  async function fetchStorageData() {
    try {
      const response = await fetch('/api/storage/accounts')
      if (response.ok) {
        const result = await response.json()
        setStorageData(result)
      }
    } catch (err) {
      console.error('Failed to fetch storage data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function testDisconnect(provider: string) {
    setDisconnecting(true)
    setDisconnectResult(null)
    
    try {
      const response = await fetch('/api/storage/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider })
      })
      
      const data = await response.json()
      
      setDisconnectResult({
        provider,
        status: response.status,
        success: response.ok,
        data: data,
        timestamp: new Date().toLocaleTimeString()
      })
      
      // Refresh storage data after disconnect
      setTimeout(() => {
        fetchStorageData()
      }, 1000)
      
    } catch (error) {
      setDisconnectResult({
        provider,
        status: 'error',
        success: false,
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date().toLocaleTimeString()
      })
    } finally {
      setDisconnecting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Complete Debug Dashboard</h1>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Complete Debug Dashboard</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Current Storage Status */}
        <div className="bg-blue-50 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Current Storage Status</h2>
          {storageData?.accounts?.map((account: any, index: number) => (
            <div key={index} className="mb-4 p-4 bg-white rounded border">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg capitalize">{account.provider}</h3>
                <span className={`px-2 py-1 rounded text-sm ${
                  account.isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {account.isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              <div className="space-y-1 text-sm">
                <p><strong>Email:</strong> {account.email}</p>
                <p><strong>Provider Account ID:</strong> {account.providerAccountId}</p>
                <p><strong>Storage Account ID:</strong> {account.storageAccountId || 'N/A'}</p>
                <p><strong>Storage Status:</strong> 
                  <span className={`ml-1 px-2 py-0.5 rounded text-xs ${
                    account.storageStatus === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
                    account.storageStatus === 'DISCONNECTED' ? 'bg-red-100 text-red-800' : 
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {account.storageStatus}
                  </span>
                </p>
                <p><strong>Has Valid OAuth:</strong> {account.hasValidOAuth ? '✅' : '❌'}</p>
                <p><strong>Is Auth Account:</strong> {account.isAuthAccount ? '✅' : '❌'}</p>
              </div>
              
              <div className="mt-3">
                <button
                  onClick={() => testDisconnect(account.provider)}
                  disabled={disconnecting || account.storageStatus === 'DISCONNECTED'}
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    account.storageStatus === 'DISCONNECTED' 
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-red-500 text-white hover:bg-red-600 disabled:opacity-50'
                  }`}
                >
                  {disconnecting ? 'Testing...' : 
                   account.storageStatus === 'DISCONNECTED' ? 'Already Disconnected' : 
                   'Test Disconnect'}
                </button>
              </div>
            </div>
          )) || <p>No storage accounts found</p>}
          
          <button
            onClick={fetchStorageData}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh Status
          </button>
        </div>

        {/* Disconnect Test Results */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Disconnect Test Results</h2>
          
          {disconnectResult ? (
            <div className={`p-4 rounded border ${
              disconnectResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold">
                  {disconnectResult.provider} Disconnect Test
                </h3>
                <span className="text-sm text-gray-500">
                  {disconnectResult.timestamp}
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <p><strong>Status Code:</strong> {disconnectResult.status}</p>
                <p><strong>Success:</strong> {disconnectResult.success ? '✅ YES' : '❌ NO'}</p>
                
                {disconnectResult.data.message && (
                  <p><strong>Message:</strong> {disconnectResult.data.message}</p>
                )}
                
                {disconnectResult.data.error && (
                  <p><strong>Error:</strong> {disconnectResult.data.error}</p>
                )}
                
                <details className="mt-3">
                  <summary className="cursor-pointer font-medium">Full Response Data</summary>
                  <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto">
                    {JSON.stringify(disconnectResult.data, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No disconnect tests performed yet. Click a "Test Disconnect" button above.</p>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-yellow-50 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">How to Use This Debug Page</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li><strong>Check Current Status:</strong> Look at the storage accounts above to see their current status</li>
          <li><strong>Test Disconnect:</strong> Click "Test Disconnect" on any active account</li>
          <li><strong>Check Results:</strong> The right panel will show the API response</li>
          <li><strong>Refresh Status:</strong> Click "Refresh Status" to see if the database was updated</li>
          <li><strong>Check Server Logs:</strong> Go to Vercel Functions logs to see server-side debug messages</li>
        </ol>
        
        <div className="mt-4 p-3 bg-white rounded border">
          <p className="text-sm"><strong>Expected Behavior:</strong></p>
          <ul className="list-disc list-inside text-sm mt-1 space-y-1">
            <li>Disconnect should return status 200 with success message</li>
            <li>Storage Status should change from "ACTIVE" to "DISCONNECTED"</li>
            <li>Account should still show as auth account but not connected for storage</li>
          </ul>
        </div>
      </div>
    </div>
  )
}