"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import posthog from "posthog-js"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  Loader2,
  Cloud,
  FolderOpen,
  ChevronRight,
  Upload,
  Lock,
  Settings2,
  Layout,
  CheckCircle2,
  AlertCircle,
  Hash,
  Palette,
  Eye,
  Type
} from "lucide-react"

interface ConnectedAccount {
  provider: "google" | "dropbox"
  providerAccountId: string
  email?: string
  name?: string
  isConnected: boolean
}

interface StorageFolder {
  id: string
  name: string
  path: string
}

export default function CreatePortalPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Connected accounts
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)

  // Folder selection
  const [folders, setFolders] = useState<StorageFolder[]>([])
  const [loadingFolders, setLoadingFolders] = useState(false)
  const [folderPath, setFolderPath] = useState<StorageFolder[]>([])

  const FILE_TYPE_OPTIONS = [
    { label: "Images (JPG, PNG, GIF)", value: "image/*" },
    { label: "Documents (PDF, DOC)", value: "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
    { label: "Spreadsheets (XLS, CSV)", value: "application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" },
    { label: "Archives (ZIP, RAR)", value: "application/zip,application/x-rar-compressed,application/x-7z-compressed" },
    { label: "Videos (MP4, MOV)", value: "video/*" },
    { label: "Audio (MP3, WAV)", value: "audio/*" },
  ]

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    primaryColor: "#0f172a", // Default to slate-900
    requireClientName: true,
    requireClientEmail: false,
    maxFileSize: 500,
    storageProvider: "local" as "local" | "google_drive" | "dropbox",
    storageFolderId: "",
    storageFolderPath: "",
    password: "",
    allowedFileTypes: [] as string[],
  })

  useEffect(() => {
    fetchAccounts()
  }, [])

  async function fetchAccounts() {
    try {
      const res = await fetch("/api/storage/accounts")
      if (res.ok) {
        const data = await res.json()
        setAccounts(data.filter((a: ConnectedAccount) => a.isConnected))
      }
    } catch (error) {
      console.error("Error fetching accounts:", error)
    } finally {
      setLoadingAccounts(false)
    }
  }

  async function selectStorageProvider(provider: "local" | "google_drive" | "dropbox") {
    setFormData({
      ...formData,
      storageProvider: provider,
      storageFolderId: "",
      storageFolderPath: "",
    })
    setFolderPath([])

    if (provider !== "local") {
      await fetchFolders(provider)
    } else {
      setFolders([])
    }
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
      setFormData({
        ...formData,
        storageFolderId: "",
        storageFolderPath: "",
      })
      fetchFolders(formData.storageProvider)
    }
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

  function handleNameChange(name: string) {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50)

    setFormData({ ...formData, name, slug })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/portals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          maxFileSize: formData.maxFileSize * 1024 * 1024,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to create portal")
        posthog.captureException(new Error(data.error || "Failed to create portal"));
        return
      }

      posthog.capture('portal_created', {
        portal_id: data.id,
        portal_name: formData.name,
        portal_slug: formData.slug,
        storage_provider: formData.storageProvider,
      });

      router.push("/dashboard")
      router.refresh()
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/dashboard"
        className="group inline-flex items-center gap-2 text-slate-400 hover:text-slate-900 mb-8 transition-colors font-medium text-sm"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Dashboard
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* Form Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-10"
        >
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-slate-900 rounded-xl">
                <Layout className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Portal Builder</span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Create a New Portal</h1>
            <p className="text-slate-500 mt-2 text-lg">
              Design a beautiful, secure gateway for your clients' files.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-12">
            {/* Identity Group */}
            <section className="space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Type className="w-4 h-4" /> Identity & Branding
              </h3>

              <div className="grid gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2.5">
                    Portal Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Project Delivery Assets"
                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900 transition-all outline-none font-medium placeholder:text-slate-300"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2.5">
                    URL Access Point
                  </label>
                  <div className="flex items-stretch">
                    <div className="px-5 flex items-center bg-slate-50 border border-r-0 border-slate-200 rounded-l-2xl text-slate-400 text-sm font-medium">
                      /p/
                    </div>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase() })}
                      placeholder="your-custom-slug"
                      className="flex-1 px-5 py-4 bg-white border border-slate-200 rounded-r-2xl focus:ring-2 focus:ring-slate-900 transition-all outline-none font-medium"
                      pattern="[a-z0-9-]+"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2.5">
                    Theme Accent
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="relative group">
                      <input
                        type="color"
                        value={formData.primaryColor}
                        onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                        className="w-16 h-16 rounded-2xl cursor-pointer border-4 border-white shadow-lg overflow-hidden shrink-0"
                      />
                      <div className="absolute inset-0 rounded-2xl pointer-events-none border border-slate-200" />
                    </div>
                    <div className="flex-1 relative">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input
                        type="text"
                        value={formData.primaryColor}
                        onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                        className="w-full pl-10 pr-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900 transition-all outline-none font-mono text-sm uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Storage Group */}
            <section className="space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Cloud className="w-4 h-4" /> Storage Backbone
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: "local", name: "Internal", icon: FolderOpen, color: "slate" },
                  { id: "google_drive", name: "Google", icon: Cloud, color: "emerald", disabled: !accounts.find(a => a.provider === "google") },
                  { id: "dropbox", name: "Dropbox", icon: Cloud, color: "blue", disabled: !accounts.find(a => a.provider === "dropbox") }
                ].map((provider) => {
                  const Icon = provider.icon
                  const isActive = formData.storageProvider === provider.id
                  return (
                    <button
                      key={provider.id}
                      type="button"
                      disabled={provider.disabled}
                      onClick={() => selectStorageProvider(provider.id as any)}
                      className={`relative p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 overflow-hidden ${isActive
                          ? "border-slate-900 bg-slate-50/50"
                          : "border-slate-100 bg-white hover:border-slate-200"
                        } ${provider.disabled ? "opacity-40 grayscale cursor-not-allowed" : ""}`}
                    >
                      <div className={`p-3 rounded-2xl ${isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400 transition-colors group-hover:bg-slate-200"}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-sm text-slate-900">{provider.name}</span>
                      {isActive && (
                        <motion.div layoutId="provider-check" className="absolute top-2 right-2">
                          <CheckCircle2 className="w-4 h-4 text-slate-900" />
                        </motion.div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Folder Selector UI */}
              <AnimatePresence mode="wait">
                {formData.storageProvider !== "local" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-slate-50 border border-slate-200 rounded-3xl overflow-hidden"
                  >
                    <div className="p-4 bg-white border-b border-slate-100 flex items-center gap-2 overflow-x-auto scrollbar-hide">
                      <button type="button" onClick={navigateToRoot} className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest shrink-0">Root</button>
                      {folderPath.map((folder, index) => (
                        <div key={folder.id} className="flex items-center gap-2 shrink-0">
                          <ChevronRight className="w-3 h-3 text-slate-300" />
                          <button type="button" onClick={() => navigateBack(index)} className="text-xs font-bold text-slate-900 hover:text-slate-900 uppercase tracking-widest">{folder.name}</button>
                        </div>
                      ))}
                    </div>
                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                      {loadingFolders ? (
                        <div className="p-12 text-center">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300" />
                        </div>
                      ) : folders.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 text-sm font-medium">No subdirectories found</div>
                      ) : (
                        folders.map((folder) => (
                          <button
                            key={folder.id}
                            type="button"
                            onClick={() => navigateToFolder(folder)}
                            className="w-full px-6 py-4 text-left hover:bg-white flex items-center justify-between group transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <FolderOpen className="w-4 h-4 text-amber-500" />
                              <span className="text-sm font-semibold text-slate-700">{folder.name}</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-slate-400 transition-all group-hover:translate-x-1" />
                          </button>
                        ))
                      )}
                    </div>
                    <div className="p-4 bg-slate-900/5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">
                      Selected: <span className="text-slate-900">{formData.storageFolderPath || "Home Directory"}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* Security & Rules */}
            <section className="space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Settings2 className="w-4 h-4" /> Parameters & Security
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2.5">Max File Size (MB)</label>
                  <input
                    type="number"
                    value={formData.maxFileSize}
                    onChange={(e) => setFormData({ ...formData, maxFileSize: parseInt(e.target.value) || 100 })}
                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900 transition-all outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2.5">Passkey Access</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Secure with password..."
                      className="w-full pl-10 pr-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900 transition-all outline-none font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Mandatory Metadata</label>
                <div className="flex gap-4">
                  {[
                    { id: 'name', label: 'Client Name', key: 'requireClientName' },
                    { id: 'email', label: 'Client Email', key: 'requireClientEmail' }
                  ].map(req => (
                    <button
                      key={req.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, [req.key]: !prev[req.key as keyof typeof prev] }))}
                      className={`flex-1 p-4 rounded-2xl border-2 font-bold text-xs uppercase tracking-widest transition-all ${formData[req.key as keyof typeof formData]
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                        }`}
                    >
                      {req.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Allowed File Types</label>
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
                        className={`flex items-center justify-between gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                          isSelected
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
                        }`}
                      >
                        <span className="text-sm font-semibold">{opt.label}</span>
                        <CheckCircle2 className={`w-5 h-5 ${isSelected ? "text-white" : "text-slate-300"}`} />
                      </button>
                    )
                  })}
                </div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  {formData.allowedFileTypes.length === 0
                    ? "All file types permitted"
                    : `${formData.allowedFileTypes.length} file categories enabled`}
                </div>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, allowedFileTypes: [] }))}
                  className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors underline"
                >
                  Allow any file type
                </button>
              </div>
            </section>

            {/* Error UI */}
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Link
                href="/dashboard"
                className="px-8 py-4 border border-slate-200 rounded-2xl text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all font-bold text-sm uppercase tracking-widest"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 font-bold text-sm uppercase tracking-widest active:scale-[0.98]"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>Deploy Portal <ChevronRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </form>
        </motion.div>

        {/* Preview Section - Modern Mockup */}
        <div className="hidden lg:block sticky top-8">
          <div className="relative">
            <div className="absolute -inset-4 bg-slate-100/50 rounded-[48px] -z-10" />

            <div className="flex items-center gap-2 mb-6 px-6">
              <Eye className="w-4 h-4 text-slate-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Live Preview</span>
            </div>

            <div className="bg-white rounded-[40px] shadow-2xl border border-slate-200/50 overflow-hidden min-h-[700px] flex flex-col">
              {/* Browser Frame */}
              <div className="bg-slate-50 h-10 border-b border-slate-100 flex items-center px-6 gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                <div className="mx-auto bg-white border border-slate-100 rounded-md h-6 px-3 flex items-center w-1/2">
                  <span className="text-[10px] text-slate-300 font-mono italic truncate">
                    assets.secureupload.hub/p/{formData.slug || "..."}
                  </span>
                </div>
              </div>

              {/* Portal Content Scrollable */}
              <div className="flex-1 overflow-y-auto p-12 bg-white flex flex-col items-center">
                <div className="w-full max-w-sm flex flex-col">
                  {/* Header Preview */}
                  <div className="text-center mb-10">
                    <motion.div
                      animate={{ backgroundColor: formData.primaryColor }}
                      className="w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center text-white text-3xl font-black shadow-lg"
                    >
                      {formData.name ? formData.name.charAt(0).toUpperCase() : <Palette className="w-8 h-8" />}
                    </motion.div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
                      {formData.name || "Untitled Portal"}
                    </h2>
                    <p className="text-slate-400 text-sm mt-3 font-medium">
                      {formData.description || "Enter portal description above to preview here."}
                    </p>
                  </div>

                  {/* Password Warning if set */}
                  {formData.password && (
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3 mb-6">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Lock className="w-3 h-3 text-amber-500" />
                      </div>
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Security Enabled</span>
                    </div>
                  )}

                  {/* Form Fields Preview */}
                  <div className="space-y-4 mb-8">
                    {formData.requireClientName && (
                      <div>
                        <div className="h-4 bg-slate-100 rounded w-1/2 mb-2" />
                        <div className="h-12 bg-slate-50 border border-slate-100 rounded-xl" />
                      </div>
                    )}
                    {formData.requireClientEmail && (
                      <div>
                        <div className="h-4 bg-slate-100 rounded w-1/3 mb-2" />
                        <div className="h-12 bg-slate-50 border border-slate-100 rounded-xl" />
                      </div>
                    )}
                    <div>
                      <div className="h-4 bg-slate-100 rounded w-1/4 mb-2" />
                      <div className="h-24 bg-slate-50 border border-slate-100 rounded-xl" />
                    </div>
                  </div>

                  {/* Upload Preview Zone */}
                  <div className="border-2 border-dashed border-slate-200 rounded-[32px] p-10 flex flex-col items-center justify-center text-center group">
                    <div className="p-4 bg-slate-50 rounded-full mb-4 group-hover:scale-110 transition-transform">
                      <Upload className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-sm font-bold text-slate-900 tracking-tight">Drop your assets</p>
                    <p className="text-xs text-slate-400 mt-2 font-medium">Maximum volume available per file: {formData.maxFileSize} MB</p>
                  </div>

                  {/* CTA Preview */}
                  <motion.div
                    animate={{ backgroundColor: formData.primaryColor }}
                    className="h-14 rounded-2xl mt-8 flex items-center justify-center text-sm font-black text-white uppercase tracking-widest shadow-lg"
                  >
                    Prepare Upload
                  </motion.div>
                </div>
              </div>

              <div className="py-6 border-t border-slate-50 text-center">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Hub Integrity Ensured</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
