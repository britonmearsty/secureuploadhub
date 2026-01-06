"use client"

import { useState } from "react"

interface OrphanedFile {
  id: string
  fileName: string
  reason: string
}

interface CleanupResult {
  success: boolean
  message: string
  orphanedFiles: OrphanedFile[]
  totalChecked: number
  deletedCount: number
  dryRun: boolean
  error?: string
  details?: string
}

export default function DebugCleanupPage() {
  const [results, setResults] = useState<Record<string, CleanupResult>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  const runCleanup = async (provider: "google_drive" | "dropbox", dryRun: boolean = true) => {
    const key = `${provider}_${dryRun ? 'dry' : 'real'}`
    setLoading(prev => ({ ...prev, [key]: true }))

    try {
      const response = await fetch('/api/storage/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          dryRun
        })
      })

      const result = await response.json()
      setResults(prev => ({ ...prev, [key]: result }))
    } catch (error) {
      setResults(prev => ({ 
        ...prev, 
        [key]: { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error',
          message: '',
          orphanedFiles: [],
          totalChecked: 0,
          deletedCount: 0,
          dryRun
        } 
      }))
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }))
    }
  }

  const ResultCard = ({ title, result, isLoading }: { 
    title: string
    result?: CleanupResult
    isLoading: boolean 
  }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      
      {isLoading && (
        <div className="flex items-center gap-2 text-blue-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>Checking files...</span>
        </div>
      )}

      {result && !isLoading && (
        <div className="space-y-3">
          <div className={`p-3 rounded ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            <div className="font-medium">
              {result.success ? '✅' : '❌'} {result.message}
            </div>
            {result.error && (
              <div className="text-sm mt-1">Error: {result.error}</div>
            )}
            {result.details && (
              <div className="text-sm mt-1">Details: {result.details}</div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
              <div className="font-medium">Files Checked</div>
              <div className="text-lg">{result.totalChecked}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
              <div className="font-medium">Orphaned Found</div>
              <div className="text-lg">{result.orphanedFiles.length}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
              <div className="font-medium">Deleted</div>
              <div className="text-lg">{result.deletedCount}</div>
            </div>
          </div>

          {result.orphanedFiles.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Orphaned Files:</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {result.orphanedFiles.map((file, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700 p-2 rounded text-sm">
                    <div className="font-medium">{file.fileName}</div>
                    <div className="text-gray-600 dark:text-gray-400">{file.reason}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Storage Cleanup Debug</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Find and clean up orphaned database records for files that no longer exist in cloud storage.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Google Drive */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-500 rounded"></div>
              Google Drive
            </h2>
            
            <div className="space-y-2">
              <button
                onClick={() => runCleanup("google_drive", true)}
                disabled={loading.google_drive_dry}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {loading.google_drive_dry ? "Checking..." : "Check for Orphaned Files (Dry Run)"}
              </button>
              
              <button
                onClick={() => runCleanup("google_drive", false)}
                disabled={loading.google_drive_real}
                className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
              >
                {loading.google_drive_real ? "Cleaning..." : "Clean Up Orphaned Files (REAL)"}
              </button>
            </div>

            <ResultCard 
              title="Dry Run Results"
              result={results.google_drive_dry}
              isLoading={loading.google_drive_dry}
            />
            
            <ResultCard 
              title="Cleanup Results"
              result={results.google_drive_real}
              isLoading={loading.google_drive_real}
            />
          </div>

          {/* Dropbox */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-600 rounded"></div>
              Dropbox
            </h2>
            
            <div className="space-y-2">
              <button
                onClick={() => runCleanup("dropbox", true)}
                disabled={loading.dropbox_dry}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {loading.dropbox_dry ? "Checking..." : "Check for Orphaned Files (Dry Run)"}
              </button>
              
              <button
                onClick={() => runCleanup("dropbox", false)}
                disabled={loading.dropbox_real}
                className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
              >
                {loading.dropbox_real ? "Cleaning..." : "Clean Up Orphaned Files (REAL)"}
              </button>
            </div>

            <ResultCard 
              title="Dry Run Results"
              result={results.dropbox_dry}
              isLoading={loading.dropbox_dry}
            />
            
            <ResultCard 
              title="Cleanup Results"
              result={results.dropbox_real}
              isLoading={loading.dropbox_real}
            />
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">How It Works</h3>
          <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
            <li>• <strong>Dry Run:</strong> Checks which files exist in database but not in cloud storage (safe)</li>
            <li>• <strong>Real Cleanup:</strong> Actually deletes orphaned database records (permanent)</li>
            <li>• Files are considered orphaned if they can't be found in the cloud storage</li>
            <li>• This helps maintain data consistency between your database and cloud storage</li>
          </ul>
        </div>
      </div>
    </div>
  )
}