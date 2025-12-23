"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import posthog from "posthog-js"
import { motion, AnimatePresence } from "framer-motion"
import {
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  FileIcon,
  Lock,
  ChevronRight,
  ShieldCheck,
  FileText,
  Mail,
  User,
  MessageSquare,
  CheckCircle2,
  LockKeyhole,
  Rocket
} from "lucide-react"

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
  allowedFileTypes?: string[]
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
  const [uploadError, setUploadError] = useState("")

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
        if (!data.isPasswordProtected) {
          setIsUnlocked(true)
        }
      } else if (res.status === 404) {
        setError("Repository ID not recognized")
      } else {
        setError("System link synchronization failure")
      }
    } catch {
      setError("Network infrastructure timeout")
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
        setPasswordError("Passkey verification rejected")
        posthog.capture('portal_password_failed', {
          portal_id: portal?.id,
          portal_slug: slug,
        })
      }
    } catch {
      setPasswordError("Encryption verification failure")
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
    if (!portal) return
    const maxBytes = portal.maxFileSize
    const allowedTypes = portal.allowedFileTypes || []

    const accepted: UploadFile[] = []
    for (const file of newFiles) {
      if (file.size > maxBytes) {
        setUploadError(`"${file.name}" exceeds the ${formatFileSize(maxBytes)} limit.`)
        continue
      }

      if (allowedTypes.length > 0) {
        const isAllowed = allowedTypes.some((allowed) => {
          if (allowed.endsWith("/*")) {
            return file.type.startsWith(allowed.split("/")[0] + "/")
          }
          return file.type === allowed
        })

        if (!isAllowed) {
          setUploadError(`"${file.name}" is not an allowed file type for this portal.`)
          continue
        }
      }

      accepted.push({
        file,
        id: Math.random().toString(36).substring(7),
        progress: 0,
        status: "pending"
      })
    }

    if (accepted.length) {
      setUploadError("")
      setFiles(prev => [...prev, ...accepted])
    }
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
    if (files.length === 0) return

    setUploadError("")
    setIsUploading(true)

    const totalFileSize = files.reduce((acc, f) => acc + f.file.size, 0);
    posthog.capture('file_upload_started', {
      portal_id: portal.id,
      portal_name: portal.name,
      portal_slug: slug,
      file_count: files.length,
      total_file_size: totalFileSize,
    });

    for (const uploadFile of files) {
      if (uploadFile.status === "complete") continue

      setFiles(prev => prev.map(f =>
        f.id === uploadFile.id ? { ...f, status: "uploading" as const } : f
      ))

      try {
        const sessionRes = await fetch("/api/upload/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            portalId: portal.id,
            fileName: uploadFile.file.name,
            fileSize: uploadFile.file.size,
            mimeType: uploadFile.file.type,
            clientName,
            clientEmail,
            token: accessToken
          })
        })

        if (!sessionRes.ok) {
          const error = await sessionRes.json()
          throw new Error(error.error || "Failed to initiate upload")
        }

        const session = await sessionRes.json()

        if (session.strategy === "resumable") {
          let uploadedFileId: string | null = null
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
                // Parse response to get file ID
                try {
                  const data = JSON.parse(xhr.responseText)
                  uploadedFileId = data.id || null
                } catch (e) {
                  // Ignore parse errors
                }
                resolve()
              } else {
                reject(new Error("Cloud stream interruption"))
              }
            }
            xhr.onerror = () => reject(new Error("Network layer instability"))
            xhr.open("PUT", session.uploadUrl)
            xhr.setRequestHeader("Content-Type", uploadFile.file.type || "application/octet-stream")
            xhr.setRequestHeader("Content-Range", `bytes 0-${uploadFile.file.size - 1}/${uploadFile.file.size}`)
            xhr.send(uploadFile.file)
          })

          const completeRes = await fetch("/api/upload/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              portalId: portal.id,
              fileName: uploadFile.file.name,
              uniqueFileName: session.uniqueFileName,
              fileSize: uploadFile.file.size,
              mimeType: uploadFile.file.type,
              clientName,
              clientEmail,
              clientMessage,
              storageProvider: session.storageProvider,
              token: accessToken,
              fileId: uploadedFileId || session.fileId
            })
          })

          if (!completeRes.ok) throw new Error("Sync finalization failure")
        } else {
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
              if (xhr.status >= 200 && xhr.status < 300) resolve()
              else {
                let errorMessage = "Transmission intercepted"
                try {
                  const response = JSON.parse(xhr.responseText)
                  errorMessage = response.error || errorMessage
                } catch (e) { }
                reject(new Error(errorMessage))
              }
            }
            xhr.onerror = () => reject(new Error("Protocol handshake failed"))
            const formData = new FormData()
            formData.append("file", uploadFile.file)
            formData.append("portalId", portal.id)
            formData.append("clientName", clientName)
            formData.append("clientEmail", clientEmail)
            formData.append("clientMessage", clientMessage)
            if (accessToken) formData.append("token", accessToken)
            xhr.open("POST", "/api/upload")
            if (accessToken) xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`)
            xhr.send(formData)
          })
        }

        setFiles(prev => prev.map(f =>
          f.id === uploadFile.id ? { ...f, status: "complete" as const, progress: 100 } : f
        ))
        posthog.capture('file_upload_completed', {
          portal_id: portal.id,
          portal_slug: slug,
          file_name: uploadFile.file.name,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Handshake failure"
        setFiles(prev => prev.map(f =>
          f.id === uploadFile.id ? { ...f, status: "error" as const, error: errorMessage } : f
        ))
        posthog.capture('file_upload_failed', {
          portal_id: portal.id,
          portal_slug: slug,
          error: errorMessage,
        });
      }
    }

    setIsUploading(false)
    const someSuccess = files.some(f => f.status === "complete")
    if (someSuccess) setUploadComplete(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 animate-spin text-slate-200" />
        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Synchronizing Repository...</p>
      </div>
    )
  }

  if (error || !portal || !portal.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm"
        >
          <div className="w-20 h-20 bg-red-50 rounded-[28px] flex items-center justify-center mx-auto mb-8">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-3">
            {error || "Access Denied"}
          </h1>
          <p className="text-slate-500 font-medium leading-relaxed">
            This repository connection has been terminated or moved to a private subnet.
          </p>
          <div className="mt-8 pt-8 border-t border-slate-50">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">Hub Security Protocol</span>
          </div>
        </motion.div>
      </div>
    )
  }

  // Password Verification UI
  if (portal.isPasswordProtected && !isUnlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50/50 py-12 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <div className="text-center mb-10">
            <motion.div
              animate={{ backgroundColor: portal.primaryColor }}
              className="w-24 h-24 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-current/20 border-4 border-white"
            >
              <LockKeyhole className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">{portal.name}</h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Encrypted Transmission Access Required</p>
          </div>

          <form onSubmit={verifyPasswordAndUnlock} className="bg-white rounded-[40px] shadow-2xl border border-slate-100 p-10">
            <div className="mb-8">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                Transmission Passkey
              </label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-3xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-bold text-slate-900"
                  placeholder="Enter secure key..."
                  required
                  autoFocus
                />
              </div>
              {passwordError && (
                <motion.p
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="mt-3 text-xs font-bold text-red-500 uppercase tracking-tight flex items-center gap-1.5"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  {passwordError}
                </motion.p>
              )}
            </div>

            <button
              type="submit"
              disabled={verifyingPassword || !password}
              className="block w-full py-5 rounded-3xl font-black text-xs text-white uppercase tracking-[0.2em] shadow-xl shadow-slate-200 transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ backgroundColor: portal.primaryColor }}
            >
              {verifyingPassword ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                "Authorize Connection"
              )}
            </button>
          </form>

          <p className="text-center text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 mt-10">
            Hub Integrity Verified
          </p>
        </motion.div>
      </div>
    )
  }

  // Upload Complete Screen
  if (uploadComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm"
        >
          <div className="relative inline-block mb-10">
            <motion.div
              animate={{ backgroundColor: portal.primaryColor, scale: 1 }}
              initial={{ scale: 0 }}
              className="w-24 h-24 rounded-[36px] flex items-center justify-center mx-auto shadow-2xl shadow-current/20"
            >
              <ShieldCheck className="w-12 h-12 text-white" />
            </motion.div>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute -top-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full border-4 border-white flex items-center justify-center shadow-lg"
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
            </motion.div>
          </div>

          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4">Transmission Verified</h1>
          <p className="text-slate-500 font-medium leading-relaxed mb-10">
            Assets have been successfully offloaded to <span className="text-slate-900 font-bold">"{portal.name}"</span>.
            Digital handshake complete.
          </p>

          <div className="space-y-4">
            <button
              onClick={() => {
                setUploadComplete(false)
                setFiles([])
                setClientMessage("")
                posthog.capture('upload_more_clicked', { portal_id: portal.id, portal_slug: portal.slug });
              }}
              className="w-full py-5 border-2 border-slate-100 rounded-[28px] font-black text-xs text-slate-400 hover:text-slate-900 hover:border-slate-900 transition-all uppercase tracking-[0.2em]"
            >
              Initiate New Transfer
            </button>
            <div className="pt-8 flex items-center justify-center gap-2">
              <Rocket className="w-4 h-4 text-slate-200" />
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-300">Hub Architecture v1.0</span>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white py-12 px-6">
      <div className="max-w-xl mx-auto">
        {/* Modern Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <motion.div
            animate={{ backgroundColor: portal.primaryColor }}
            className="w-24 h-24 rounded-[36px] flex items-center justify-center mx-auto mb-8 text-white text-4xl font-black shadow-2xl shadow-current/20 border-4 border-white"
          >
            {portal.name.charAt(0).toUpperCase()}
          </motion.div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight mb-3 px-4">{portal.name}</h1>
          {portal.description && (
            <p className="text-slate-500 font-medium leading-relaxed max-w-sm mx-auto">{portal.description}</p>
          )}
          {!portal.description && (
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Secure Transmission Gateway</p>
          )}
        </motion.div>

        {/* Core Frame */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[48px] shadow-2xl border border-slate-50 p-6 sm:p-10 relative overflow-hidden"
        >
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-10 relative z-10">
            {/* Metadata Section */}
            {(portal.requireClientName || portal.requireClientEmail) && (
              <section className="space-y-6">
                <div className="flex items-center gap-2 pb-4 border-b border-slate-50">
                  <User className="w-4 h-4 text-slate-300" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Transmission Metadata</h3>
                </div>

                <div className="grid gap-6">
                  {portal.requireClientName && (
                    <div className="relative group">
                      <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-slate-900 transition-colors" />
                      <input
                        type="text"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="w-full pl-12 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-bold text-slate-900 placeholder:text-slate-300"
                        placeholder="Your identity..."
                        required
                      />
                    </div>
                  )}
                  {portal.requireClientEmail && (
                    <div className="relative group">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-slate-900 transition-colors" />
                      <input
                        type="email"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        className="w-full pl-12 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-bold text-slate-900 placeholder:text-slate-300"
                        placeholder="Your email address..."
                        required
                      />
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Message section */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-50">
                <MessageSquare className="w-4 h-4 text-slate-300" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Briefing (Optional)</h3>
              </div>
              <textarea
                value={clientMessage}
                onChange={(e) => setClientMessage(e.target.value)}
                rows={4}
                className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-[32px] focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-medium text-slate-700 placeholder:text-slate-300 leading-relaxed"
                placeholder="Additional instructions or technical context..."
              />
            </section>

            {/* Asset Offload Zone */}
            <section className="space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-50">
                <FileText className="w-4 h-4 text-slate-300" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Assets Offload</h3>
              </div>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById("file-input")?.click()}
                className={`relative border-4 border-dashed rounded-[40px] p-12 text-center transition-all cursor-pointer group ${isDragging ? "border-slate-900 bg-slate-50 scale-[0.99]" : "border-slate-100 bg-slate-50/30 hover:bg-slate-50 hover:border-slate-300"
                  }`}
              >
                <div className="p-6 bg-white rounded-full inline-block shadow-inner mb-6 group-hover:scale-110 transition-transform">
                  <Upload className={`w-10 h-10 ${isDragging ? "text-slate-900" : "text-slate-200"}`} />
                </div>
                <p className="text-sm font-black text-slate-900 tracking-tight uppercase">Drop assets to transmit</p>
                <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest leading-relaxed">
                  Payload Ceiling: <span className="text-slate-900">{formatFileSize(portal.maxFileSize)}</span>
                </p>
                <input
                  id="file-input"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && addFiles(Array.from(e.target.files))}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                <span>Accepted:</span>
                {portal.allowedFileTypes && portal.allowedFileTypes.length > 0 ? (
                  portal.allowedFileTypes.map((type) => (
                    <span key={type} className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px]">
                      {type}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500">Any file type</span>
                )}
              </div>
              {uploadError && (
                <div className="flex items-center gap-2 text-xs font-bold text-red-500 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                  <AlertCircle className="w-4 h-4" />
                  {uploadError}
                </div>
              )}

              {/* Enhanced File List */}
              <AnimatePresence>
                {files.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-3 pt-6"
                  >
                    {files.map((uploadFile) => (
                      <motion.div
                        key={uploadFile.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="flex items-center gap-4 p-5 bg-white border border-slate-100 rounded-3xl shadow-sm group hover:shadow-md transition-shadow"
                      >
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0">
                          {uploadFile.status === 'complete' ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <FileText className="w-6 h-6 text-slate-300" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-4 mb-2">
                            <p className="text-sm font-bold text-slate-900 truncate">{uploadFile.file.name}</p>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{formatFileSize(uploadFile.file.size)}</span>
                          </div>

                          {/* Progress bar */}
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${uploadFile.progress}%`,
                                backgroundColor: uploadFile.status === 'error' ? '#ef4444' : portal.primaryColor
                              }}
                            />
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center">
                          {uploadFile.status === "uploading" && <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />}
                          {uploadFile.status === "error" && (
                            <div className="text-red-500 flex items-center gap-1.5 px-3 py-1 bg-red-50 rounded-lg text-[10px] font-black uppercase tracking-tighter">
                              <AlertCircle className="w-3.5 h-3.5" /> FAILED
                            </div>
                          )}
                          {uploadFile.status === "pending" && (
                            <button type="button" onClick={() => removeFile(uploadFile.id)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors group">
                              <X className="w-4 h-4 text-slate-200 group-hover:text-red-500 transition-colors" />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* Launch Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isUploading || files.length === 0}
                className="group relative w-full py-6 rounded-[32px] font-black text-sm text-white uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden"
                style={{ backgroundColor: portal.primaryColor }}
              >
                <div className="relative z-10 flex items-center justify-center gap-3">
                  {isUploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Synchronizing...
                    </>
                  ) : (
                    <>
                      Initialize Transfer
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </div>
                {/* Subtle shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </button>
            </div>
          </form>

          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-[100px] -z-10 opacity-50" />
        </motion.div>

        {/* Brand Footer */}
        <div className="mt-12 text-center pb-12">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-slate-50 rounded-full text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 border border-slate-100/50">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-300" />
            Infrastructure Hardened By SecureUploadHub
          </div>
        </div>
      </div>
    </div>
  )
}
