"use client"

import { useState } from 'react'

export default function TestDisconnectPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function testDisconnect(provider: string) {
    setLoading(true)
    setResult(null)
    
    try {
      console.log(`🧪 Testing disconnect for ${provider}...`)
      
      const response = await fetch('/api/storage/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider })
      })
      
      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)
      
      const data = await response.json()
      console.log('Response data:', data)
      
      setResult({
        status: response.status,
        success: response.ok,
        data: data
      })
      
    } catch (error) {
      console.error('Test error:', error)
      setResult({
        status: 'error',
        success: false,
        data: { error: error instanceof Error ? error.message : 'Unknown error' }
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Test Disconnect API</h1>
      
      <div className="space-y-4">
        <div className="flex gap-4">
          <button
            onClick={() => testDisconnect('google')}
            disabled={loading}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Disconnect Google'}
          </button>
          
          <button
            onClick={() => testDisconnect('dropbox')}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Disconnect Dropbox'}
          </button>
        </div>

        {result && (
          <div className={`p-4 rounded ${result.success ? 'bg-green-100' : 'bg-red-100'}`}>
            <h2 className="font-bold mb-2">API Test Result:</h2>
            <p><strong>Status:</strong> {result.status}</p>
            <p><strong>Success:</strong> {result.success ? '✅ YES' : '❌ NO'}</p>
            <pre className="text-sm mt-2 overflow-auto bg-white p-2 rounded">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </div>
        )}
        
        <div className="bg-yellow-100 p-4 rounded">
          <h3 className="font-bold mb-2">Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Open browser console (F12)</li>
            <li>Click one of the test buttons above</li>
            <li>Check console for detailed logs</li>
            <li>Check the result displayed here</li>
            <li>Go back to storage accounts page to see if status changed</li>
          </ol>
        </div>
      </div>
    </div>
  )
}