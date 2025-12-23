"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  Loader2,
  Save,
  Cloud,
  FolderOpen,
  ChevronRight,
  Trash2,
  Lock,
  Upload,
  Settings2,
  Layout,
  CheckCircle2,
  AlertCircle,
  Hash,
  Palette,
  Eye,
  Type,
  ExternalLink,
  Copy,
  Info
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
  storageProvider: string
  storageFolderId: string | null
  storageFolderPath: string | null
  passwordHash: string | null
  allowedFileTypes: string[]
  _count: { uploads: number }
}

interface ConnectedAccount {
  provider: "google" | "dropbox"
  providerAccountId: string
  email?: string
  isConnected: boolean
}

interface StorageFolder {
  id: string
  name: string
  path: string
}

export default function EditPortalPage() {
  const router = useRouter()
  const params = useParams()
  const portalId = params.id as string

  const [portal, setPortal] = useState<Portal | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // Connected accounts
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([])

  // Folder selection
  const [folders, setFolders] = useState<StorageFolder[]>([])
  const [loadingFolders, setLoadingFolders] = useState(false)
  const [folderPath, setFolderPath] = useState<StorageFolder[]>([])

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    primaryColor: "#0f172a",
    logoUrl: "",
    backgroundImageUrl: "",
    backgroundColor: "",
    cardBackgroundColor: "#ffffff",
    textColor: "#0f172a",
    welcomeMessage: "",
    submitButtonText: "Initialize Transfer",
    successMessage: "Transmission Verified",
    requireClientName: true,
    requireClientEmail: false,
    maxFileSize: 500,
    storageProvider: "google_drive" as "google_drive" | "dropbox",
    storageFolderId: "",
    storageFolderPath: "",
    newPassword: "",
    allowedFileTypes: [] as string[],
  })
  const [hasPassword, setHasPassword] = useState(false)

  const FILE_TYPE_OPTIONS = [
    { label: "Images (JPG, PNG, GIF)", value: "image/*" },
    { label: "Documents (PDF, DOC)", value: "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
    { label: "Spreadsheets (XLS, CSV)", value: "application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" },
    { label: "Archives (ZIP, RAR)", value: "application/zip,application/x-rar-compressed,application/x-7z-compressed" },
    { label: "Videos (MP4, MOV)", value: "video/*" },
    { label: "Audio (MP3, WAV)", value: "audio/*" },
  ]

  useEffect(() => {
    fetchPortal()
    fetchAccounts()
  }, [portalId])

  async function fetchPortal() {
    try {
      const res = await fetch(`/api/portals/${portalId}`)
      if (res.ok) {
        const data = await res.json()
        setPortal(data)
        setFormData({
          name: data.name,
          slug: data.slug,
          description: data.description || "",
          primaryColor: data.primaryColor || "#0f172a",
          logoUrl: data.logoUrl || "",
          backgroundImageUrl: data.backgroundImageUrl || "",
          backgroundColor: data.backgroundColor || "",
          cardBackgroundColor: data.cardBackgroundColor || "#ffffff",
          textColor: data.textColor || "#0f172a",
          welcomeMessage: data.welcomeMessage || "",
          submitButtonText: data.submitButtonText || "Initialize Transfer",
          successMessage: data.successMessage || "Transmission Verified",
          requireClientName: data.requireClientName,
          requireClientEmail: data.requireClientEmail,
          maxFileSize: Math.round(data.maxFileSize / (1024 * 1024)),
          storageProvider: data.storageProvider,
          storageFolderId: data.storageFolderId || "",
          storageFolderPath: data.storageFolderPath || "",
          newPassword: "",
          allowedFileTypes: data.allowedFileTypes || [],
        })
        setHasPassword(!!data.passwordHash)

        await fetchFolders(data.storageProvider, data.storageFolderId)
      } else {
        setError("Portal not found")
      }
    } catch {
      setError("Failed to load portal")
    } finally {
      setLoading(false)
    }
  }

  async function fetchAccounts() {
    try {
      const res = await fetch("/api/storage/accounts")
      if (res.ok) {
        const data = await res.json()
        setAccounts(data.filter((a: ConnectedAccount) => a.isConnected))
      }
    } catch (error) {
      console.error("Error fetching accounts:", error)
    }
  }

  async function selectStorageProvider(provider: "google_drive" | "dropbox") {
    setFormData({
      ...formData,
      storageProvider: provider,
      storageFolderId: "",
      storageFolderPath: "",
    })
    setFolderPath([])

    await fetchFolders(provider)
  }

  async function fetchFolders(provider: string, parentFolderId?: string) {
    setLoadingFolders(true)
    try {
      const params = new URLSearchParams({ provider })
      if (parentFolderId) {
        params.set("parentFolderId", parentFolderId)
      }
      const res = await fetch(`/api/storage/folders?${params}`)
      if (res.ok) {
        const data = await res.json()
        setFolders(data)
      }
    } catch (error) {
      console.error("Error fetching folders:", error)
    } finally {
      setLoadingFolders(false)
    }
  }

  function navigateToFolder(folder: StorageFolder) {
    setFolderPath([...folderPath, folder])
    setFormData({
      ...formData,
      storageFolderId: folder.id,
      storageFolderPath: folder.path,
    })
    fetchFolders(formData.storageProvider, folder.id)
  }

  function navigateToRoot() {
    setFolderPath([])
    setFormData({
      ...formData,
      storageFolderId: "",
      storageFolderPath: "",
    })
    fetchFolders(formData.storageProvider)
  }

  function navigateBack(index: number) {
    const newPath = folderPath.slice(0, index + 1)
    setFolderPath(newPath)
    const targetFolder = newPath[newPath.length - 1]
    if (targetFolder) {
      setFormData({
        ...formData,
        storageFolderId: targetFolder.id,
        storageFolderPath: targetFolder.path,
      })
      fetchFolders(formData.storageProvider, targetFolder.id)
    } else {
      navigateToRoot()
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess("")
    setSaving(true)

    try {
      const res = await fetch(`/api/portals/${portalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          maxFileSize: formData.maxFileSize * 1024 * 1024,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to update portal")
        return
      }

      setSuccess("Portal profile updated successfully.")
      if (formData.newPassword) setHasPassword(true)
      setTimeout(() => setSuccess(""), 4000)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  async function confirmDeletePortal() {
    setError("")
    setSaving(true)
    setShowDeleteModal(false)

    try {
      const res = await fetch(`/api/portals/${portalId}`, { method: "DELETE" })
      if (res.ok) {
        router.push("/dashboard")
        router.refresh()
      } else {
        setError("Failed to delete portal")
      }
    } catch {
      setError("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-slate-200" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Accessing Portal Registry...</p>
      </div>
    )
  }

  if (!portal) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="p-6 bg-slate-50 rounded-full inline-block mb-6">
          <AlertCircle className="w-12 h-12 text-slate-300" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-2">Portal Not Found</h1>
        <p className="text-slate-500 mb-8">The portal you're looking for doesn't exist or you don't have access.</p>
        <Link href="/dashboard" className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest text-xs">
          Return to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-2 text-slate-400 hover:text-slate-900 mb-4 transition-colors font-medium text-sm"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-900 rounded-2xl shadow-lg shadow-slate-200">
              <Settings2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Configure Portal</h1>
          </div>
          <p className="text-slate-400 mt-2 text-sm font-bold uppercase tracking-widest">
            Registry ID: <span className="text-slate-900 font-mono">{portal.id.slice(0, 8)}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/p/${portal.slug}`}
            target="_blank"
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-900 rounded-2xl hover:bg-slate-50 transition-all font-bold text-xs uppercase tracking-widest shadow-sm"
          >
            <ExternalLink className="w-4 h-4" />
            Preview Live
          </Link>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center justify-center p-3 bg-red-50 text-red-500 hover:bg-red-100 rounded-2xl transition-all"
            title="Decommission Portal"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* Form Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-10 bg-white p-8 md:p-10 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/40 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto lg:pr-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent"
        >
          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-700 text-sm font-bold"
            >
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              {success}
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-12">
            {/* Field Set: Identity */}
            <section className="space-y-8">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-50">
                <Type className="w-4 h-4 text-slate-400" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Identity & Branding</h3>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Portal Designation</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-bold text-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Permanent Access Handle</label>
                  <div className="flex items-center px-5 py-4 bg-slate-100 border border-slate-200 rounded-2xl opacity-60 cursor-not-allowed">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-widest mr-2">Handle:</span>
                    <span className="text-slate-900 font-mono text-sm">{portal.slug}</span>
                    <Lock className="w-3.5 h-3.5 text-slate-300 ml-auto" />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-tight">Handles cannot be modified after registration.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Interface Accent Color</label>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <input
                        type="color"
                        value={formData.primaryColor}
                        onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                        className="w-16 h-16 rounded-2xl cursor-pointer border-4 border-white shadow-xl overflow-hidden shrink-0"
                      />
                      <div className="absolute inset-0 rounded-2xl border border-slate-200 pointer-events-none" />
                    </div>
                    <div className="flex-1 relative">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input
                        type="text"
                        value={formData.primaryColor}
                        onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                        className="w-full pl-10 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-mono text-sm uppercase font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Field Set: Visual Customization */}
            <section className="space-y-8">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-50">
                <Palette className="w-4 h-4 text-slate-400" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Visual DNA</h3>
              </div>

              <div className="space-y-6">
                {/* Logo URL */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Logo URL</label>
                  <input
                    type="url"
                    value={formData.logoUrl}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-medium placeholder:text-slate-300 text-sm"
                  />
                </div>

                {/* Background Image URL */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Background Image URL</label>
                  <input
                    type="url"
                    value={formData.backgroundImageUrl}
                    onChange={(e) => setFormData({ ...formData, backgroundImageUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-medium placeholder:text-slate-300 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Text Color */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Content Text</label>
                    <div className="flex items-center gap-3">
                      <div className="relative group w-12 h-12">
                        <input
                          type="color"
                          value={formData.textColor}
                          onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                          className="w-full h-full rounded-xl cursor-pointer border-2 border-white shadow-md overflow-hidden"
                        />
                      </div>
                      <input
                        type="text"
                        value={formData.textColor}
                        onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-mono text-xs uppercase"
                      />
                    </div>
                  </div>

                  {/* Background Color */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Page BG</label>
                    <div className="flex items-center gap-3">
                      <div className="relative group w-12 h-12">
                        <input
                          type="color"
                          value={formData.backgroundColor || "#ffffff"}
                          onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                          className="w-full h-full rounded-xl cursor-pointer border-2 border-white shadow-md overflow-hidden"
                        />
                      </div>
                      <input
                        type="text"
                        value={formData.backgroundColor || ""}
                        onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                        placeholder="#HEX"
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-mono text-xs uppercase"
                      />
                    </div>
                  </div>

                  {/* Card Color */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Card BG</label>
                    <div className="flex items-center gap-3">
                      <div className="relative group w-12 h-12">
                        <input
                          type="color"
                          value={formData.cardBackgroundColor}
                          onChange={(e) => setFormData({ ...formData, cardBackgroundColor: e.target.value })}
                          className="w-full h-full rounded-xl cursor-pointer border-2 border-white shadow-md overflow-hidden"
                        />
                      </div>
                      <input
                        type="text"
                        value={formData.cardBackgroundColor}
                        onChange={(e) => setFormData({ ...formData, cardBackgroundColor: e.target.value })}
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-mono text-xs uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Field Set: Messaging & Experience */}
            <section className="space-y-8">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-50">
                <Type className="w-4 h-4 text-slate-400" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Message & Tone</h3>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Welcome Message</label>
                  <textarea
                    value={formData.welcomeMessage}
                    onChange={(e) => setFormData({ ...formData, welcomeMessage: e.target.value })}
                    placeholder="Welcome to our secure upload portal. Please submit your files below."
                    rows={2}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-medium placeholder:text-slate-300 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Submit Button Label</label>
                    <input
                      type="text"
                      value={formData.submitButtonText}
                      onChange={(e) => setFormData({ ...formData, submitButtonText: e.target.value })}
                      placeholder="Initialize Transfer"
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Success Message</label>
                    <input
                      type="text"
                      value={formData.successMessage}
                      onChange={(e) => setFormData({ ...formData, successMessage: e.target.value })}
                      placeholder="Transmission Verified"
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-medium"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Field Set: Storage */}
            <section className="space-y-8">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-50">
                <Cloud className="w-4 h-4 text-slate-400" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Storage Architecture</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: "google_drive", name: "Google", icon: Cloud, disabled: !accounts.find(a => a.provider === "google") },
                  { id: "dropbox", name: "Dropbox", icon: Cloud, disabled: !accounts.find(a => a.provider === "dropbox") }
                ].map((provider) => {
                  const Icon = provider.icon
                  const isActive = formData.storageProvider === provider.id
                  return (
                    <button
                      key={provider.id}
                      type="button"
                      disabled={provider.disabled}
                      onClick={() => selectStorageProvider(provider.id as any)}
                      className={`group relative p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${isActive
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-50 bg-white hover:border-slate-200"
                        } ${provider.disabled ? "opacity-30 grayscale cursor-not-allowed" : ""}`}
                    >
                      <div className={`p-3 rounded-2xl transition-colors ${isActive ? "bg-slate-900 text-white shadow-lg shadow-slate-200" : "bg-slate-50 text-slate-300 group-hover:bg-slate-100"}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-black text-[10px] uppercase tracking-widest text-slate-900">{provider.name}</span>
                    </button>
                  )
                })}
              </div>

              {/* Modern Folder Explorer */}
              <AnimatePresence mode="wait">
                {true && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-slate-50 border border-slate-100 rounded-3xl overflow-hidden"
                  >
                    <div className="p-4 bg-white border-b border-slate-50 flex items-center gap-2 overflow-x-auto scrollbar-hide">
                      <button type="button" onClick={navigateToRoot} className="text-[10px] font-black text-slate-300 hover:text-slate-900 transition-colors uppercase tracking-[0.2em] shrink-0">Root</button>
                      {folderPath.map((folder, index) => (
                        <div key={folder.id} className="flex items-center gap-2 shrink-0">
                          <ChevronRight className="w-3 h-3 text-slate-300" />
                          <button type="button" onClick={() => navigateBack(index)} className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">{folder.name}</button>
                        </div>
                      ))}
                    </div>
                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-100/50">
                      {loadingFolders ? (
                        <div className="p-12 text-center">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-200" />
                        </div>
                      ) : folders.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">End of Directory</div>
                      ) : (
                        folders.map((folder) => (
                          <button
                            key={folder.id}
                            type="button"
                            onClick={() => navigateToFolder(folder)}
                            className="w-full px-6 py-4 text-left hover:bg-white flex items-center justify-between group transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <FolderOpen className="w-4 h-4 text-amber-500" />
                              <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900">{folder.name}</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-slate-400 transition-all group-hover:translate-x-1" />
                          </button>
                        ))
                      )}
                    </div>
                    <div className="p-4 bg-slate-900/5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                      Active Destination: <span className="text-slate-900">{formData.storageFolderPath || "Core Workspace"}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* Field Set: Rules */}
            <section className="space-y-8">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-50">
                <Settings2 className="w-4 h-4 text-slate-400" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Security & Scale</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Payload Ceiling (MB)</label>
                  <input
                    type="number"
                    value={formData.maxFileSize}
                    onChange={(e) => setFormData({ ...formData, maxFileSize: parseInt(e.target.value) || 100 })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Entrance Passkey</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input
                      type="password"
                      value={formData.newPassword}
                      onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                      placeholder={hasPassword ? "Roll to new key..." : "Establish encryption key..."}
                      className="w-full pl-10 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Metadata Harvesting</label>
                <div className="flex gap-4">
                  {[
                    { id: 'name', label: 'Identity', key: 'requireClientName' },
                    { id: 'email', label: 'E-Mail', key: 'requireClientEmail' }
                  ].map(req => (
                    <button
                      key={req.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, [req.key]: !prev[req.key as keyof typeof prev] }))}
                      className={`flex-1 p-4 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${formData[req.key as keyof typeof formData]
                        ? "border-slate-900 bg-slate-900 text-white shadow-xl shadow-slate-200"
                        : "border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200 hover:bg-white"
                        }`}
                    >
                      {req.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Allowed File Types</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {FILE_TYPE_OPTIONS.map((opt) => {
                    const isSelected = formData.allowedFileTypes.includes(opt.value)
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            allowedFileTypes: isSelected
                              ? prev.allowedFileTypes.filter((v) => v !== opt.value)
                              : [...prev.allowedFileTypes, opt.value],
                          }))
                        }
                        className={`flex items-center justify-between gap-3 p-4 rounded-2xl border-2 text-left transition-all ${isSelected
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-50 bg-slate-50 text-slate-500 hover:border-slate-200 hover:bg-white"
                          }`}
                      >
                        <span className="text-sm font-semibold">{opt.label}</span>
                        <CheckCircle2 className={`w-5 h-5 ${isSelected ? "text-white" : "text-slate-300"}`} />
                      </button>
                    )
                  })}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {formData.allowedFileTypes.length === 0
                    ? "All file types permitted"
                    : `${formData.allowedFileTypes.length} categories enabled`}
                </div>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, allowedFileTypes: [] }))}
                  className="text-[11px] font-bold text-slate-400 hover:text-slate-900 transition-colors underline"
                >
                  Allow any file type
                </button>
              </div>
            </section>

            {/* Actions */}
            <div className="flex gap-4 pt-6">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-8 py-5 bg-slate-900 text-white rounded-3xl hover:bg-slate-800 transition-all shadow-2xl shadow-slate-200 disabled:opacity-50 font-black text-xs uppercase tracking-[0.2em] active:scale-[0.98]"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>Commit Changes <Save className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </form>
        </motion.div>

        {/* Live Preview Column */}
        <div className="hidden lg:block sticky top-8">
          <div className="relative">
            <div className="absolute -inset-10 bg-slate-50 border border-slate-100 rounded-[60px] -z-10" />

            <div className="flex items-center justify-between mb-8 px-4">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Environment View</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Simulating Live</span>
              </div>
            </div>

            <div className="bg-white rounded-[45px] shadow-2xl border border-slate-200/50 overflow-hidden min-h-[750px] flex flex-col relative">
              {/* Browser Chrome */}
              <div className="bg-slate-50 h-10 border-b border-slate-100 flex items-center px-6 gap-2 shrink-0">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-200" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-200" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-200" />
                </div>
                <div className="mx-auto bg-white border border-slate-100 rounded-lg h-6 px-4 flex items-center w-3/5">
                  <Lock className="w-2.5 h-2.5 text-emerald-400 mr-2" />
                  <span className="text-[9px] text-slate-400 font-mono truncate">
                    assets.uploadhub.io/p/{formData.slug}
                  </span>
                </div>
              </div>

              {/* Content Frame */}
              <div className="flex-1 overflow-y-auto p-12 bg-white flex flex-col items-center">
                <div className="w-full max-w-sm">
                  {/* Branding Preview */}
                  <div className="text-center mb-12">
                    <motion.div
                      animate={{ backgroundColor: formData.primaryColor }}
                      className="w-20 h-20 rounded-[28px] mx-auto mb-6 flex items-center justify-center text-white text-3xl font-black shadow-2xl shadow-current/20 border-4 border-white"
                    >
                      {formData.name.charAt(0).toUpperCase() || <Palette className="w-8 h-8" />}
                    </motion.div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight px-4">
                      {formData.name || "Portal Designation"}
                    </h2>
                    <p className="text-slate-400 text-xs mt-3 font-bold uppercase tracking-widest">
                      {formData.description ? "Status: Receiving Files" : "Status: Awaiting Setup"}
                    </p>
                  </div>

                  {/* Password Shield if active */}
                  {(hasPassword || formData.newPassword) && (
                    <div className="bg-slate-900 text-white rounded-3xl p-5 flex items-center gap-4 mb-8 shadow-xl shadow-slate-200">
                      <div className="p-2 bg-white/10 rounded-xl">
                        <Lock className="w-4 h-4 " />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Security Core</span>
                        <span className="text-xs font-bold">Access Encryption Active</span>
                      </div>
                    </div>
                  )}

                  {/* Input Mockups */}
                  <div className="space-y-6 mb-10">
                    {formData.requireClientName && (
                      <div className="space-y-2">
                        <div className="h-3 bg-slate-50 rounded w-1/3" />
                        <div className="h-14 bg-slate-50 border border-slate-100 rounded-2xl" />
                      </div>
                    )}
                    {formData.requireClientEmail && (
                      <div className="space-y-2">
                        <div className="h-3 bg-slate-50 rounded w-1/4" />
                        <div className="h-14 bg-slate-50 border border-slate-100 rounded-2xl" />
                      </div>
                    )}
                  </div>

                  {/* Payload Zone */}
                  <div className="border-4 border-dashed border-slate-50 rounded-[40px] p-12 flex flex-col items-center justify-center text-center bg-slate-50/30 group">
                    <div className="p-5 bg-white rounded-full mb-5 shadow-inner transition-transform group-hover:scale-105">
                      <Upload className="w-8 h-8 text-slate-200" />
                    </div>
                    <p className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Transmission Ready</p>
                    <p className="text-[10px] text-slate-400 mt-2 font-bold whitespace-nowrap uppercase tracking-widest">Volume Threshold: {formData.maxFileSize} MB</p>
                  </div>

                  {/* Final Submission Preview */}
                  <motion.div
                    animate={{ backgroundColor: formData.primaryColor }}
                    className="h-16 rounded-3xl mt-12 flex items-center justify-center text-[10px] font-black text-white uppercase tracking-[0.3em] shadow-2xl shadow-current/30 border-4 border-white"
                  >
                    Initialize Transfer
                  </motion.div>
                </div>
              </div>

              <div className="py-8 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-2">
                <Layout className="w-3.5 h-3.5 text-slate-300" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">Hub Architecture Verified</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[40px] shadow-2xl max-w-md w-full overflow-hidden border border-slate-100"
            >
              <div className="p-10">
                <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <div className="text-center mb-10">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">Decommission Portal?</h3>
                  <p className="text-slate-500 mt-4 font-medium leading-relaxed">
                    You are about to permanently erase <span className="font-bold text-slate-900">"{portal.name}"</span>.
                    This will instantly terminate all access links and destroy associated metadata.
                    <span className="block mt-2 text-red-500 font-bold uppercase tracking-widest text-[10px]">Warning: Irreversible Action</span>
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={confirmDeletePortal}
                    disabled={saving}
                    className="w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-red-700 transition-all shadow-xl shadow-red-100 active:scale-[0.98] disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Confirm Deletion"}
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="w-full py-5 bg-white text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] hover:text-slate-900 transition-all"
                  >
                    Abort Operation
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
