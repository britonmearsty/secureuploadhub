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
    logoUrl?: string | null
    backgroundImageUrl?: string | null
    backgroundColor?: string | null
    cardBackgroundColor?: string | null
    textColor?: string | null
    welcomeMessage?: string | null
    submitButtonText?: string | null
    successMessage?: string | null
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
    const [uploadStats, setUploadStats] = useState({
        totalFiles: 0,
        completedFiles: 0,
        failedFiles: 0,
        totalSize: 0,
        uploadedSize: 0
    })

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
        e.stopPropagation()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        // Only set to false if leaving the drop zone entirely
        if (e.currentTarget === e.target) {
            setIsDragging(false)
        }
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
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

    // Retry with exponential backoff
    async function retryWithBackoff<T>(
        fn: () => Promise<T>,
        maxRetries = 3,
        initialDelay = 1000
    ): Promise<T> {
        let lastError: Error | null = null
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await fn()
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error))
                if (attempt < maxRetries - 1) {
                    const delay = initialDelay * Math.pow(2, attempt)
                    console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`)
                    await new Promise(resolve => setTimeout(resolve, delay))
                }
            }
        }
        throw lastError
    }

    // Upload single file with retry logic
    async function uploadSingleFile(uploadFile: UploadFile) {
        setFiles(prev => prev.map(f =>
            f.id === uploadFile.id ? { ...f, status: "uploading" as const } : f
        ))

        try {
            console.log(`Initiating upload session for: ${uploadFile.file.name}`);
            const session = await retryWithBackoff(
                () => fetch("/api/upload/session", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        portalId: portal!.id,
                        fileName: uploadFile.file.name,
                        fileSize: uploadFile.file.size,
                        mimeType: uploadFile.file.type,
                        clientName,
                        clientEmail,
                        token: accessToken
                    })
                }).then(res => {
                    if (!res.ok) throw new Error(res.statusText)
                    return res.json()
                })
            )
            console.log(`Session obtained, strategy: ${session.strategy}`);

            if (session.strategy === "resumable") {
                let uploadedFileId: string | null = null
                console.log(`Starting resumable PUT to: ${session.uploadUrl}`);

                await retryWithBackoff(() =>
                    new Promise<void>((resolve, reject) => {
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
                            console.log(`Upload status for ${uploadFile.file.name}: ${xhr.status}`);
                            if (xhr.status >= 200 && xhr.status < 300) {
                                try {
                                    if (xhr.responseText) {
                                        const data = JSON.parse(xhr.responseText)
                                        uploadedFileId = data.id || null
                                        console.log(`Extracted file ID: ${uploadedFileId}`);
                                    }
                                } catch (e) {
                                    console.warn("Could not parse Google Drive response:", e);
                                }
                                resolve()
                            } else {
                                console.error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`);
                                reject(new Error(`Cloud stream interruption (Status: ${xhr.status})`))
                            }
                        }
                        xhr.onerror = () => {
                            console.error(`XHR network error for ${uploadFile.file.name}. This is often a CORS issue or network interruption. URL: ${session.uploadUrl}`);
                            reject(new Error("Network layer instability or CORS policy violation"));
                        }
                        xhr.open("PUT", session.uploadUrl)
                        xhr.setRequestHeader("Content-Type", uploadFile.file.type || "application/octet-stream")
                        xhr.setRequestHeader("Content-Range", `bytes 0-${uploadFile.file.size - 1}/${uploadFile.file.size}`)
                        xhr.send(uploadFile.file)
                    })
                )

                console.log("Upload successful, finalizing with backend...");
                await retryWithBackoff(() =>
                    fetch("/api/upload/complete", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            portalId: portal!.id,
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
                    }).then(res => {
                        if (!res.ok) throw new Error(res.statusText)
                        return res.json()
                    })
                )
                console.log("Finalization complete!");
            } else {
                await retryWithBackoff(() =>
                    new Promise<void>((resolve, reject) => {
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
                        formData.append("portalId", portal!.id)
                        formData.append("clientName", clientName)
                        formData.append("clientEmail", clientEmail)
                        formData.append("clientMessage", clientMessage)
                        if (accessToken) formData.append("token", accessToken)
                        xhr.open("POST", "/api/upload")
                        if (accessToken) xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`)
                        xhr.send(formData)
                    })
                )
            }

            setFiles(prev => prev.map(f =>
                f.id === uploadFile.id ? { ...f, status: "complete" as const, progress: 100 } : f
            ))
            posthog.capture('file_upload_completed', {
                portal_id: portal!.id,
                portal_slug: slug,
                file_name: uploadFile.file.name,
            });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Handshake failure"
            setFiles(prev => prev.map(f =>
                f.id === uploadFile.id ? { ...f, status: "error" as const, error: errorMessage } : f
            ))
            posthog.capture('file_upload_failed', {
                portal_id: portal!.id,
                portal_slug: slug,
                error: errorMessage,
            });
            throw err
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        if (!portal) return
        if (files.length === 0) return

        setUploadError("")
        setIsUploading(true)

        const totalFileSize = files.reduce((acc, f) => acc + f.file.size, 0);
        const pendingFiles = files.filter(f => f.status !== "complete")

        // Initialize upload stats
        setUploadStats({
            totalFiles: pendingFiles.length,
            completedFiles: 0,
            failedFiles: 0,
            totalSize: totalFileSize,
            uploadedSize: 0
        })

        posthog.capture('file_upload_started', {
            portal_id: portal.id,
            portal_name: portal.name,
            portal_slug: slug,
            file_count: pendingFiles.length,
            total_file_size: totalFileSize,
        });

        // Upload all files in parallel (up to 4 concurrent)
        const results = await Promise.allSettled(
            pendingFiles.map(uploadFile => uploadSingleFile(uploadFile))
        )

        // Update final stats
        const completed = results.filter(r => r.status === "fulfilled").length
        const failed = results.filter(r => r.status === "rejected").length

        setUploadStats(prev => ({
            ...prev,
            completedFiles: completed,
            failedFiles: failed,
            uploadedSize: totalFileSize
        }))

        setIsUploading(false)
        const someSuccess = results.some(r => r.status === "fulfilled")
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
        const allSuccess = uploadStats.failedFiles === 0
        const uploadDuration = files.filter(f => f.status === "complete").length > 0 ? "optimized" : "standard"

        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="max-w-md w-full"
                >
                    {/* Success Icon */}
                    <div className="relative inline-block mx-auto mb-10 w-32 h-32 flex items-center justify-center">
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.1 }}
                            className="absolute w-full h-full rounded-[40px] flex items-center justify-center shadow-2xl shadow-current/20"
                            style={{ backgroundColor: portal.primaryColor }}
                        >
                            <ShieldCheck className="w-16 h-16 text-white" />
                        </motion.div>

                        {/* Pulsing success badge */}
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="absolute -bottom-2 -right-2 w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full border-4 border-white flex items-center justify-center shadow-lg"
                        >
                            <motion.div
                                animate={{ scale: [1, 1.15, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                            >
                                <CheckCircle2 className="w-6 h-6 text-white" />
                            </motion.div>
                        </motion.div>
                    </div>

                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-center mb-8"
                    >
                        <h1 className="text-4xl font-black tracking-tight mb-3" style={{ color: portal.textColor || '#0f172a' }}>
                            {allSuccess ? portal.successMessage || "Upload Complete" : "Partial Success"}
                        </h1>
                        <p className="font-medium leading-relaxed text-sm" style={{ color: portal.textColor ? `${portal.textColor}99` : '#64748b' }}>
                            {allSuccess ? (
                                <>Assets transmitted to <span className="font-bold">"{portal.name}"</span> successfully.</>
                            ) : (
                                <>
                                    <span className="text-emerald-600 font-bold">{uploadStats.completedFiles}</span> of <span className="font-bold">{uploadStats.totalFiles}</span> files transmitted.
                                </>
                            )}
                        </p>
                    </motion.div>

                    {/* Stats Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white rounded-[32px] border border-slate-100 p-6 mb-8 shadow-sm"
                    >
                        <div className="grid grid-cols-2 gap-4">
                            {/* Files */}
                            <div className="text-center">
                                <div className="text-2xl font-black text-slate-900 mb-1">
                                    {uploadStats.completedFiles}/{uploadStats.totalFiles}
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Files Uploaded</p>
                            </div>

                            {/* Size */}
                            <div className="text-center">
                                <div className="text-2xl font-black text-slate-900 mb-1">
                                    {formatFileSize(uploadStats.uploadedSize)}
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Size</p>
                            </div>

                            {/* Completion Rate */}
                            <div className="col-span-2">
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(uploadStats.completedFiles / uploadStats.totalFiles) * 100}%` }}
                                        transition={{ delay: 0.5, duration: 0.8 }}
                                        className="h-full rounded-full transition-all"
                                        style={{ backgroundColor: portal.primaryColor }}
                                    />
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 text-center">
                                    {Math.round((uploadStats.completedFiles / uploadStats.totalFiles) * 100)}% Complete
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Failed Files Alert */}
                    {uploadStats.failedFiles > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6"
                        >
                            <div className="flex gap-3 items-start">
                                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-red-700 mb-1">
                                        {uploadStats.failedFiles} file{uploadStats.failedFiles > 1 ? 's' : ''} failed
                                    </p>
                                    <p className="text-xs text-red-600">
                                        Check the file list below for details
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* File Summary */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-slate-50 rounded-[24px] p-4 mb-8 max-h-48 overflow-y-auto"
                    >
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Transmission Summary</h3>
                        <div className="space-y-2">
                            {files.map((file) => (
                                <div key={file.id} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <FileIcon className={`w-3.5 h-3.5 flex-shrink-0 ${file.status === 'complete' ? 'text-emerald-500' : 'text-red-500'
                                            }`} />
                                        <span className="font-medium text-slate-700 truncate">{file.file.name}</span>
                                    </div>
                                    {file.status === 'complete' ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                    ) : (
                                        <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Actions */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="space-y-3"
                    >
                        <button
                            onClick={() => {
                                setUploadComplete(false)
                                setFiles([])
                                setClientMessage("")
                                setClientName("")
                                setClientEmail("")
                                posthog.capture('upload_more_clicked', { portal_id: portal.id, portal_slug: portal.slug });
                            }}
                            className="w-full py-4 rounded-[28px] font-black text-xs text-white uppercase tracking-[0.2em] shadow-lg transition-all active:scale-[0.98] hover:shadow-xl"
                            style={{ backgroundColor: portal.primaryColor }}
                        >
                            Start New Transfer
                        </button>

                        <button
                            onClick={() => window.open('/', '_blank')}
                            className="w-full py-4 border-2 border-slate-200 rounded-[28px] font-black text-xs text-slate-600 hover:text-slate-900 hover:border-slate-900 transition-all uppercase tracking-[0.2em]"
                        >
                            Back to Hub
                        </button>

                        <div className="pt-4 flex items-center justify-center gap-2 border-t border-slate-100">
                            <Rocket className="w-3.5 h-3.5 text-slate-300" />
                            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-300">Infrastructure Verified</span>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        )
    }

    return (
        <div
            className="min-h-screen py-12 px-6 flex flex-col items-center"
            style={{
                backgroundColor: portal.backgroundColor || '#ffffff',
                color: portal.textColor || '#0f172a',
                backgroundImage: portal.backgroundImageUrl ? `url(${portal.backgroundImageUrl})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundAttachment: 'fixed',
            }}
        >
            <div className="max-w-xl w-full mx-auto relative z-10">
                {/* Modern Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    {portal.logoUrl ? (
                        <div className="w-auto h-24 mx-auto mb-8 flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={portal.logoUrl} alt={portal.name} className="max-h-full max-w-full object-contain drop-shadow-lg" />
                        </div>
                    ) : (
                        <motion.div
                            animate={{ backgroundColor: portal.primaryColor }}
                            className="w-24 h-24 rounded-[36px] flex items-center justify-center mx-auto mb-8 text-white text-4xl font-black shadow-2xl shadow-current/20 border-4 border-white"
                        >
                            {portal.name.charAt(0).toUpperCase()}
                        </motion.div>
                    )}

                    <h1 className="text-4xl font-black tracking-tight leading-tight mb-4 px-4 drop-shadow-sm">{portal.name}</h1>

                    {portal.welcomeMessage ? (
                        <p className="font-medium leading-relaxed max-w-sm mx-auto text-lg opacity-90">{portal.welcomeMessage}</p>
                    ) : portal.description ? (
                        <p className="font-medium leading-relaxed max-w-sm mx-auto opacity-75">{portal.description}</p>
                    ) : (
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Secure Transmission Gateway</p>
                    )}
                </motion.div>

                {/* Core Frame */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-[48px] shadow-2xl border p-6 sm:p-10 relative overflow-hidden backdrop-blur-sm"
                    style={{
                        backgroundColor: portal.cardBackgroundColor || '#ffffff',
                        borderColor: portal.cardBackgroundColor ? 'transparent' : 'rgba(248,250,252,1)',
                        color: portal.textColor || '#0f172a' // Ensure card text inherits or overrides if needed. 
                        // Ideally text color is global, but if card is dark and page is light, user should set text color accordingly.
                        // For now, we inherit the global textColor set on the container.
                    }}
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
                                className={`relative border-4 border-dashed rounded-[40px] p-12 text-center transition-all cursor-pointer group overflow-hidden ${isDragging ? "border-slate-900 bg-slate-100 scale-[0.98] shadow-lg" : "border-slate-200 bg-gradient-to-br from-slate-50/50 to-slate-50 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md"
                                    }`}
                            >
                                {/* Animated drag overlay */}
                                <AnimatePresence>
                                    {isDragging && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute inset-0 bg-gradient-to-br from-slate-900/5 to-slate-900/0 pointer-events-none"
                                        />
                                    )}
                                </AnimatePresence>

                                <motion.div
                                    animate={{ scale: isDragging ? 1.15 : 1 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                    className="p-6 bg-white rounded-full inline-block shadow-inner mb-6 group-hover:shadow-md transition-shadow relative z-10"
                                >
                                    <motion.div
                                        animate={{ y: isDragging ? -4 : 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <Upload className={`w-10 h-10 transition-colors ${isDragging ? "text-slate-900" : "text-slate-300 group-hover:text-slate-400"}`} />
                                    </motion.div>
                                </motion.div>

                                <motion.div
                                    animate={{ opacity: isDragging ? 1 : 0.8 }}
                                    transition={{ duration: 0.2 }}
                                    className="relative z-10"
                                >
                                    <p className="text-sm font-black text-slate-900 tracking-tight uppercase">
                                        {isDragging ? "Release to upload files" : "Drop assets to transmit"}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest leading-relaxed">
                                        {isDragging ? (
                                            <span className="text-slate-600 font-semibold">Files ready for transmission</span>
                                        ) : (
                                            <>Payload Ceiling: <span className="text-slate-900">{formatFileSize(portal.maxFileSize)}</span></>
                                        )}
                                    </p>
                                </motion.div>

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
                                        {/* Upload Progress Summary (during upload) */}
                                        {isUploading && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 rounded-[24px] p-4"
                                            >
                                                <div className="flex items-center gap-3 mb-3">
                                                    <motion.div
                                                        animate={{ rotate: 360 }}
                                                        transition={{ repeat: Infinity, duration: 2 }}
                                                    >
                                                        <Loader2 className="w-4 h-4 text-blue-600" />
                                                    </motion.div>
                                                    <div>
                                                        <p className="text-sm font-black text-blue-900">Uploading Files</p>
                                                        <p className="text-xs text-blue-600">
                                                            {files.filter(f => f.status === 'complete').length} of {files.length} complete
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Overall progress */}
                                                <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                                                    <motion.div
                                                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${Math.round((files.filter(f => f.status === 'complete').length / files.length) * 100)}%` }}
                                                        transition={{ duration: 0.3 }}
                                                    />
                                                </div>
                                            </motion.div>
                                        )}

                                        {files.map((uploadFile) => (
                                            <motion.div
                                                key={uploadFile.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                className={`flex items-center gap-4 p-5 border rounded-3xl transition-all group ${uploadFile.status === 'complete'
                                                        ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-100'
                                                        : uploadFile.status === 'error'
                                                            ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-100'
                                                            : 'bg-white border-slate-100 hover:shadow-md'
                                                    } shadow-sm`}
                                            >
                                                {/* File Icon */}
                                                <motion.div
                                                    animate={{
                                                        scale: uploadFile.status === 'uploading' ? [1, 1.05, 1] : 1
                                                    }}
                                                    transition={{
                                                        repeat: uploadFile.status === 'uploading' ? Infinity : 0,
                                                        duration: 0.5
                                                    }}
                                                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 flex-col ${uploadFile.status === 'complete'
                                                            ? 'bg-emerald-100'
                                                            : uploadFile.status === 'error'
                                                                ? 'bg-red-100'
                                                                : 'bg-slate-50'
                                                        }`}
                                                >
                                                    {uploadFile.status === 'complete' && (
                                                        <motion.div
                                                            initial={{ scale: 0 }}
                                                            animate={{ scale: 1 }}
                                                            className="relative"
                                                        >
                                                            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                                        </motion.div>
                                                    )}
                                                    {uploadFile.status === 'error' && (
                                                        <AlertCircle className="w-6 h-6 text-red-500" />
                                                    )}
                                                    {(uploadFile.status === 'uploading' || uploadFile.status === 'pending') && (
                                                        <FileText className="w-6 h-6 text-slate-300" />
                                                    )}
                                                </motion.div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-4 mb-2">
                                                        <div>
                                                            <p className={`text-sm font-bold truncate ${uploadFile.status === 'complete'
                                                                    ? 'text-emerald-900'
                                                                    : uploadFile.status === 'error'
                                                                        ? 'text-red-900'
                                                                        : 'text-slate-900'
                                                                }`}>
                                                                {uploadFile.file.name}
                                                            </p>
                                                            {uploadFile.status === 'error' && uploadFile.error && (
                                                                <p className="text-[10px] text-red-600 font-medium mt-0.5">{uploadFile.error}</p>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex-shrink-0">
                                                            {formatFileSize(uploadFile.file.size)}
                                                        </span>
                                                    </div>

                                                    {/* Progress bar */}
                                                    {(uploadFile.status === 'uploading' || uploadFile.status === 'pending') && (
                                                        <motion.div
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            className="space-y-1"
                                                        >
                                                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                                <motion.div
                                                                    className="h-full rounded-full transition-all"
                                                                    style={{
                                                                        width: `${uploadFile.progress}%`,
                                                                        backgroundColor: portal.primaryColor
                                                                    }}
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${uploadFile.progress}%` }}
                                                                    transition={{ duration: 0.3 }}
                                                                />
                                                            </div>
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[9px] font-bold text-slate-400">
                                                                    {uploadFile.status === 'uploading' ? 'Uploading...' : 'Queued'}
                                                                </span>
                                                                <span className="text-[9px] font-black text-slate-500">{uploadFile.progress}%</span>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </div>

                                                {/* Status Indicators */}
                                                <div className="shrink-0 flex items-center">
                                                    {uploadFile.status === "uploading" && (
                                                        <motion.div
                                                            animate={{ rotate: 360 }}
                                                            transition={{ repeat: Infinity, duration: 2 }}
                                                        >
                                                            <Loader2 className="w-5 h-5 text-blue-500" />
                                                        </motion.div>
                                                    )}
                                                    {uploadFile.status === "error" && (
                                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-100 rounded-lg">
                                                            <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                                                            <span className="text-[10px] font-black text-red-700 uppercase tracking-tighter">Failed</span>
                                                        </div>
                                                    )}
                                                    {uploadFile.status === "complete" && (
                                                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-tighter">Uploaded</span>
                                                    )}
                                                    {uploadFile.status === "pending" && !isUploading && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeFile(uploadFile.id)}
                                                            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                                                        >
                                                            <X className="w-4 h-4 text-slate-300 hover:text-red-500 transition-colors" />
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
                                            {portal.submitButtonText || "Initialize Transfer"}
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
