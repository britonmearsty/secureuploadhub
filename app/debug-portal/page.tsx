"use client"

import { useEffect, useState } from 'react'

export default function DebugPortalPage() {
  const [storageData, setStorageData] = useState<any>(null)
  const [portalResult, setPortalResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
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

    fetchStorageData()
  }, [])

  async function testPortalCreation() {
    setCreating(true)
    setPortalResult(null)
    
    try {
      const response = await fetch('/api/portals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Debug Test Portal',
          slug: `debug-test-${Date.now()}`,
          description: 'Test portal for debugging',
          storageProvider: 'google_drive',
          requireClientName: true,
          requireClientEmail: false,
        })
      })
      
      const result = await response.json()
      setPortalResult({
        status: response.status,
        success: response.ok,
        data: result
      })
      
    } catch (error) {
      setPortalResult({
        status: 'error',
        success: false,
        data: { error: error.message }
      })
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Portal Creation Debug</h1>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Portal Creation Debug</h1>
      
      <div className="space-y-6">
        <div className="bg-blue-100 p-4 rounded">
          <h2 className="font-bold mb-2">Storage Accounts Status:</h2>
          {storageData?.accounts?.map((account: any, index: number) => (
            <div key={index} className="mb-2 p-2 bg-white rounded">
              <p><strong>Provider:</strong> {account.provider}</p>
              <p><strong>Is Connected:</strong> {account.isConnected ? '✅ YES' : '❌ NO'}</p>
              <p><strong>Has Valid OAuth:</strong> {account.hasValidOAuth ? '✅ YES' : '❌ NO'}</p>
              <p><strong>Storage Status:</strong> {account.storageStatus || 'N/A'}</p>
            </div>
          )) || <p>No storage accounts found</p>}
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold mb-2">Test Portal Creation:</h2>
          <button
            onClick={testPortalCreation}
            disabled={creating}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Test Create Portal'}
          </button>
        </div>

        {portalResult && (
          <div className={`p-4 rounded ${portalResult.success ? 'bg-green-100' : 'bg-red-100'}`}>
            <h2 className="font-bold mb-2">Portal Creation Result:</h2>
            <p><strong>Status:</strong> {portalResult.status}</p>
            <p><strong>Success:</strong> {portalResult.success ? '✅ YES' : '❌ NO'}</p>
            <pre className="text-sm mt-2 overflow-auto">
              {JSON.stringify(portalResult.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}