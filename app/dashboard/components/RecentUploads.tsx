"use client"

import { useState, useEffect } from "react"
import { FileIcon, Download, Clock, User, Mail } from "lucide-react"

interface Upload {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  clientName: string | null
  clientEmail: string | null
  clientMessage: string | null
  status: string
  createdAt: string
  portal: {
    name: string
    slug: string
    primaryColor: string
  }
}

export default function RecentUploads() {
  const [uploads, setUploads] = useState<Upload[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUploads()
    const interval = setInterval(fetchUploads, 5000)
    return () => clearInterval(interval)
  }, [])

  async function fetchUploads() {
    try {
      const res = await fetch("/api/uploads?limit=10")
      if (res.ok) {
        const data = await res.json()
        setUploads(data)
      }
    } catch (error) {
      console.error("Error fetching uploads:", error)
    } finally {
      setLoading(false)
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (seconds < 60) return "Just now"
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-16 bg-gray-100 rounded"></div>
          <div className="h-16 bg-gray-100 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 text-lg">Recent Uploads</h3>
      </div>

      {uploads.length === 0 ? (
        <div className="p-8 text-center">
          <FileIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h4 className="font-medium text-gray-900 mb-2">No uploads yet</h4>
          <p className="text-gray-600 text-sm">
            Files uploaded by your clients will appear here
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {uploads.map((upload) => (
            <div key={upload.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-4">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: upload.portal.primaryColor + "20" }}
                >
                  <FileIcon className="w-5 h-5" style={{ color: upload.portal.primaryColor }} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900 truncate">{upload.fileName}</p>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {formatFileSize(upload.fileSize)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(upload.createdAt)}
                    </span>
                    
                    {upload.clientName && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {upload.clientName}
                      </span>
                    )}
                    
                    {upload.clientEmail && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {upload.clientEmail}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-xs text-gray-400 mt-1">
                    via {upload.portal.name}
                  </p>
                </div>

                <a
                  href={`/api/uploads/${upload.id}/download`}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Download"
                  download
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

