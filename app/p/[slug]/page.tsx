"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import posthog from "posthog-js"
import { Upload, CheckCircle, AlertCircle, Loader2, X, FileIcon, Lock } from "lucide-react"

interface Portal {
  id: string
  name: string
  slug: string
  description: string | null
  primaryColor: string
  isActive: boolean
  requireClientName: boolean
  requireClientEmail: boolean
  maxFileSize: number
  isPasswordProtected?: boolean
}

interface UploadFile {
  file: File
  id: string
  progress: number
  status: "pending" | "uploading" | "complete" | "error"
  error?: string
}

export default function PublicUploadPage() {
  const params = useParams()
  const slug = params.slug as string

  const [portal, setPortal] = useState<Portal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [clientName, setClientName] = useState("")
  const [clientEmail, setClientEmail] = useState("")
  const [clientMessage, setClientMessage] = useState("")
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadComplete, setUploadComplete] = useState(false)

  // Password protection state
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [password, setPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [verifyingPassword, setVerifyingPassword] = useState(false)
  const [accessToken, setAccessToken] = useState("")

  useEffect(() => {
    fetchPortal()
  }, [slug])

  async function fetchPortal() {
    try {
      const res = await fetch(`/api/public/portals/${slug}`)
      if (res.ok) {
        const data = await res.json()
        setPortal(data)
        // If not password protected, mark as unlocked
        if (!data.isPasswordProtected) {
          setIsUnlocked(true)
        }
      } else if (res.status === 404) {
        setError("Portal not found")
      } else {
        setError("Failed to load portal")
      }
    } catch {
      setError("Failed to load portal")
    } finally {
      setLoading(false)
    }
  }

  async function verifyPasswordAndUnlock(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError("")
    setVerifyingPassword(true)

    try {
      const res = await fetch(`/api/public/portals/${slug}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        const data = await res.json()
        setAccessToken(data.token || "")
        setIsUnlocked(true)
        posthog.capture('portal_password_verified', {
          portal_id: portal?.id,
          portal_slug: slug,
        })
      } else {
        setPasswordError("Incorrect password")
        posthog.capture('portal_password_failed', {
          portal_id: portal?.id,
          portal_slug: slug,
        })
      }
    } catch {
      setPasswordError("Failed to verify password")
    } finally {
      setVerifyingPassword(false)
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    addFiles(droppedFiles)
  }, [])

  function addFiles(newFiles: File[]) {
    const uploadFiles: UploadFile[] = newFiles.map(file => ({
      file,
      id: Math.random().toString(36).substring(7),
      progress: 0,
      status: "pending"
    }))
    setFiles(prev => [...prev, ...uploadFiles])
  }

  function removeFile(id: string) {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!portal) return
    if (files.length === 0) {
      alert("Please select at least one file to upload")
      return
    }

    setIsUploading(true)

    // Track upload started event
    const totalFileSize = files.reduce((acc, f) => acc + f.file.size, 0);
    posthog.capture('file_upload_started', {
      portal_id: portal.id,
      portal_name: portal.name,
      portal_slug: slug,
      file_count: files.length,
      total_file_size: totalFileSize,
      has_client_name: !!clientName,
      has_client_email: !!clientEmail,
      has_client_message: !!clientMessage,
    });

    let successCount = 0;
    let failCount = 0;

    for (const uploadFile of files) {
      if (uploadFile.status === "complete") continue

      setFiles(prev => prev.map(f =>
        f.id === uploadFile.id ? { ...f, status: "uploading" as const } : f
      ))

      try {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percentComplete = Math.round((event.loaded / event.total) * 100)
              setFiles(prev => prev.map(f => 
                f.id === uploadFile.id ? { ...f, progress: percentComplete } : f
              ))
            }
          }

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve()
            } else {
              let errorMessage = "Upload failed"
              try {
                const response = JSON.parse(xhr.responseText)
                errorMessage = response.error || errorMessage
              } catch (e) {
                // ignore json parse error
              }
              reject(new Error(errorMessage))
            }
          }

          xhr.onerror = () => {
            reject(new Error("Network error"))
          }

          const formData = new FormData()
          formData.append("file", uploadFile.file)
          formData.append("portalId", portal.id)
          formData.append("clientName", clientName)
          formData.append("clientEmail", clientEmail)
          formData.append("clientMessage", clientMessage)
          if (accessToken) {
            formData.append("token", accessToken)
          }

          xhr.open("POST", "/api/upload")
          if (accessToken) {
            xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`)
          }
          xhr.send(formData)
        })

        setFiles(prev => prev.map(f =>
          f.id === uploadFile.id ? { ...f, status: "complete" as const, progress: 100 } : f
        ))
        successCount++;

        // Track individual file upload completion
        posthog.capture('file_upload_completed', {
          portal_id: portal.id,
          portal_name: portal.name,
          portal_slug: slug,
          file_name: uploadFile.file.name,
          file_size: uploadFile.file.size,
          file_type: uploadFile.file.type,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Upload failed"
        setFiles(prev => prev.map(f =>
          f.id === uploadFile.id ? { ...f, status: "error" as const, error: errorMessage } : f
        ))
        failCount++;

        // Track upload exception
        posthog.capture('file_upload_failed', {
          portal_id: portal.id,
          portal_name: portal.name,
          portal_slug: slug,
          file_name: uploadFile.file.name,
          file_size: uploadFile.file.size,
          file_type: uploadFile.file.type,
          error: errorMessage,
        });
      }
    }

    setIsUploading(false)
    const allComplete = files.every(f => f.status === "complete")
    if (allComplete) {
      setUploadComplete(true)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !portal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            {error || "Portal not found"}
          </h1>
          <p className="text-gray-600">This upload portal doesn't exist or has been disabled.</p>
        </div>
      </div>
    )
  }

  if (!portal.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Portal Inactive</h1>
          <p className="text-gray-600">This upload portal is currently not accepting files.</p>
        </div>
      </div>
    )
  }

  // Password protection screen
  if (portal.isPasswordProtected && !isUnlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: portal.primaryColor }}
            >
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{portal.name}</h1>
            <p className="text-gray-600">This portal is password protected</p>
          </div>

          <form onSubmit={verifyPasswordAndUnlock} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter the portal password"
                required
                autoFocus
              />
              {passwordError && (
                <p className="mt-2 text-sm text-red-600">{passwordError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={verifyingPassword || !password}
              className="w-full py-3 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: portal.primaryColor }}
            >
              {verifyingPassword ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  Unlock Portal
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-6">
            Powered by SecureUploadHub
          </p>
        </div>
      </div>
    )
  }

  if (uploadComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: portal.primaryColor + "20" }}
          >
            <CheckCircle className="w-8 h-8" style={{ color: portal.primaryColor }} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Files Uploaded Successfully!</h1>
          <p className="text-gray-600 mb-6">
            Your files have been sent to {portal.name}. You can close this page.
          </p>
          <button
            onClick={() => {
              setUploadComplete(false)
              setFiles([])
              setClientMessage("")

              // Track engagement - user wants to upload more files
              posthog.capture('upload_more_clicked', {
                portal_id: portal.id,
                portal_name: portal.name,
                portal_slug: portal.slug,
              });
            }}
            className="px-6 py-2 text-white rounded-lg font-medium"
            style={{ backgroundColor: portal.primaryColor }}
          >
            Upload More Files
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold"
            style={{ backgroundColor: portal.primaryColor }}
          >
            {portal.name.charAt(0).toUpperCase()}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{portal.name}</h1>
          {portal.description && (
            <p className="text-gray-600">{portal.description}</p>
          )}
        </div>

        {/* Upload Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {/* Client Info */}
          <div className="space-y-4 mb-6">
            {portal.requireClientName && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            )}
            {portal.requireClientEmail && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Email *</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message (Optional)</label>
              <textarea
                value={clientMessage}
                onChange={(e) => setClientMessage(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Any notes about these files..."
              />
            </div>
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
              isDragging ? "border-indigo-500 bg-indigo-50" : "border-gray-300 hover:border-gray-400"
            }`}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <Upload className="w-10 h-10 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">
              <span className="font-medium">Click to browse</span> or drag and drop files here
            </p>
            <p className="text-sm text-gray-400">
              Max file size: {formatFileSize(portal.maxFileSize)}
            </p>
            <input
              id="file-input"
              type="file"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && addFiles(Array.from(e.target.files))}
            />
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((uploadFile) => (
                <div key={uploadFile.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <FileIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{uploadFile.file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(uploadFile.file.size)}</p>
                  </div>
                  {uploadFile.status === "complete" && <CheckCircle className="w-5 h-5 text-green-500" />}
                  {uploadFile.status === "error" && <AlertCircle className="w-5 h-5 text-red-500" />}
                  {uploadFile.status === "uploading" && <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />}
                  {uploadFile.status === "pending" && (
                    <button type="button" onClick={() => removeFile(uploadFile.id)} className="p-1 hover:bg-gray-200 rounded">
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isUploading || files.length === 0}
            className="w-full mt-6 py-3 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: portal.primaryColor }}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Upload {files.length > 0 ? `${files.length} File${files.length > 1 ? "s" : ""}` : "Files"}
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          Powered by SecureUploadHub
        </p>
      </div>
    </div>
  )
}

