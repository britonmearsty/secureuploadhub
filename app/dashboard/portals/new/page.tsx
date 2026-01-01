"use client"

import { useState, useRef, useEffect } from "react"
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
  Type,
  ChevronDown
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
interface FolderNodeProps {
  folder: any
  navigateToFolder: (folder: any) => void
  expandedFolders: Set<string>
  toggleFolder: (id: string) => void
}

const FolderNode: React.FC<FolderNodeProps> = ({ folder, navigateToFolder, expandedFolders, toggleFolder }) => {
  const isExpanded = expandedFolders.has(folder.id)
  return (
    <div className="pl-4">
      <div className="flex items-center justify-between py-2 hover:bg-slate-50 transition-colors group rounded-lg pr-2">
        <button
          type="button"
          onClick={() => navigateToFolder(folder)}
          className="flex items-center gap-2 text-left flex-1"
        >
          <FolderOpen className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 truncate">{folder.name}</span>
        </button>

        {folder.subfolders?.length > 0 && (
          <button
            type="button"
            onClick={() => toggleFolder(folder.id)}
            className="p-1 hover:bg-slate-200 rounded-md transition-colors"
          >
            <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
          </button>
        )}
      </div>

      {/* Recursively render subfolders */}
      {isExpanded && folder.subfolders?.length > 0 && (
        <div className="pl-4 border-l border-slate-100 ml-2">
          {folder.subfolders.map((sub: any) => (
            <FolderNode
              key={sub.id}
              folder={sub}
              navigateToFolder={navigateToFolder}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function CreatePortalPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const DEFAULT_LOGOS = [
    { label: "No Logo", value: "" },
    { label: "Secure Hub Logo", value: "https://via.placeholder.com/150x50/3b82f6/ffffff?text=Secure+Hub" },
    { label: "Upload Icon", value: "https://via.placeholder.com/150x50/10b981/ffffff?text=Upload" },
    { label: "Generic Logo", value: "https://via.placeholder.com/150x50/6b7280/ffffff?text=Logo" },
  ]

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    primaryColor: "#3b82f6", // Default to blue-500
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
    maxFileSize: 200 as number | string,
    storageProvider: "google_drive" as "google_drive" | "dropbox",
    storageFolderId: "",
    storageFolderPath: "",
    password: "",
    allowedFileTypes: [
      "image/*",
      "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv",
      "application/zip,application/x-rar-compressed,application/x-7z-compressed",
      "video/*",
      "audio/*"
    ] as string[],
  })

  const [activeTab, setActiveTab] = useState('Identity')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) newSet.delete(id)
      else newSet.add(id)
      return newSet
    })
  }


  useEffect(() => {
    fetchAccounts()
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
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
    const newPath = [...folderPath, folder]
    setFolderPath(newPath)
    setFormData({
      ...formData,
      storageFolderId: folder.id,
      storageFolderPath: newPath.map(f => f.name).join('/'),
    })
    fetchFolders(formData.storageProvider, folder.id)
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
          maxFileSize: Number(formData.maxFileSize) * 1024 * 1024,
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
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Link
        href="/dashboard"
        className="group inline-flex items-center gap-2 text-slate-400 hover:text-slate-900 mb-8 transition-colors font-medium text-sm"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Dashboard
      </Link>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Navigation Sidebar */}
        <aside className="lg:w-64 flex-shrink-0">
          <div className="mb-6 px-2">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">New Portal</h1>
            <p className="text-slate-600 text-sm mt-1">Create a secure space for your clients.</p>
          </div>
          <nav className="space-y-1">
            {[
              { id: 'Identity', icon: Type, label: 'Identity' },
              { id: 'Branding', icon: Palette, label: 'Branding' },
              { id: 'Storage', icon: Cloud, label: 'Storage' },
              { id: 'Security', icon: Lock, label: 'Security' },
              { id: 'Messaging', icon: Settings2, label: 'Messaging' }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                    ? "bg-white shadow-sm border border-slate-200 text-slate-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600"}`} />
                  <span className="font-medium text-sm">{tab.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="new-portal-active-indicator"
                      className="ml-auto"
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </motion.div>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0">
          <form onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 bg-slate-50/30">
                    <h2 className="text-2xl font-black text-slate-900">
                      {activeTab} Settings
                    </h2>
                    <p className="text-sm text-slate-600 mt-1 font-medium">
                      Configure the {activeTab.toLowerCase()} parameters for your new portal.
                    </p>
                  </div>

                  <div className="p-8 space-y-8">
                    {activeTab === 'Identity' && (
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-bold text-slate-900 mb-2">
                            Workspace Name
                          </label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            placeholder="e.g. Project Delivery Materials"
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-bold text-slate-900 placeholder:text-slate-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-slate-900 mb-2">
                            Access Address
                          </label>
                          <div className="flex items-stretch shadow-sm rounded-xl">
                            <div className="px-4 flex items-center bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl text-slate-500 text-sm font-medium">
                              /p/
                            </div>
                            <input
                              type="text"
                              value={formData.slug}
                              onChange={(e) =>
                                setFormData({ ...formData, slug: e.target.value.toLowerCase() })
                              }
                              placeholder="custom-address"
                              className="flex-1 px-5 py-4 bg-white border border-slate-200 rounded-r-2xl focus:ring-2 focus:ring-slate-900 transition-all outline-none font-bold text-slate-900"
                              pattern="[a-z0-9-]+"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-slate-900 mb-2">
                            Description (Optional)
                          </label>
                          <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Tell your clients what this portal is for..."
                            rows={4}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-medium text-slate-900 placeholder:text-slate-500 resize-none"
                          />
                        </div>

                        <div className="pt-4 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setActiveTab('Branding')}
                            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
                          >
                            Next: Branding
                          </button>
                        </div>
                      </div>
                    )}

                    {activeTab === 'Branding' && (
                      <div className="space-y-8">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Logo Source
                          </label>
                          <input
                            type="url"
                            value={formData.logoUrl}
                            onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                            placeholder="https://your-brand.com/logo.png"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-medium text-slate-900 placeholder:text-slate-400"
                          />
                        </div>

                        <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
                          <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">Color Configuration</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase">
                                Primary Brand Color
                              </label>
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <input
                                    type="color"
                                    value={formData.primaryColor}
                                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                                    className="w-12 h-12 rounded-xl cursor-pointer border-2 border-white shadow-md overflow-hidden shrink-0"
                                  />
                                  <div className="absolute inset-0 rounded-xl border border-slate-200 pointer-events-none" />
                                </div>
                                <input
                                  type="text"
                                  value={formData.primaryColor}
                                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 transition-all outline-none font-mono text-sm uppercase"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase">
                                Text Color
                              </label>
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <input
                                    type="color"
                                    value={formData.textColor}
                                    onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                                    className="w-12 h-12 rounded-xl cursor-pointer border-2 border-white shadow-md overflow-hidden shrink-0"
                                  />
                                  <div className="absolute inset-0 rounded-xl border border-slate-200 pointer-events-none" />
                                </div>
                                <input
                                  type="text"
                                  value={formData.textColor}
                                  onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 transition-all outline-none font-mono text-sm uppercase"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase">
                                Background
                              </label>
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <input
                                    type="color"
                                    value={formData.backgroundColor || "#ffffff"}
                                    onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                                    className="w-12 h-12 rounded-xl cursor-pointer border-2 border-white shadow-md overflow-hidden shrink-0"
                                  />
                                  <div className="absolute inset-0 rounded-xl border border-slate-200 pointer-events-none" />
                                </div>
                                <input
                                  type="text"
                                  value={formData.backgroundColor || ""}
                                  onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                                  placeholder="#FFFFFF"
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 transition-all outline-none font-mono text-sm uppercase"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase">
                                Card Background
                              </label>
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <input
                                    type="color"
                                    value={formData.cardBackgroundColor}
                                    onChange={(e) => setFormData({ ...formData, cardBackgroundColor: e.target.value })}
                                    className="w-12 h-12 rounded-xl cursor-pointer border-2 border-white shadow-md overflow-hidden shrink-0"
                                  />
                                  <div className="absolute inset-0 rounded-xl border border-slate-200 pointer-events-none" />
                                </div>
                                <input
                                  type="text"
                                  value={formData.cardBackgroundColor}
                                  onChange={(e) => setFormData({ ...formData, cardBackgroundColor: e.target.value })}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 transition-all outline-none font-mono text-sm uppercase"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setActiveTab('Storage')}
                            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
                          >
                            Next: Storage
                          </button>
                        </div>
                      </div>
                    )}

                    {activeTab === 'Storage' && (
                      <div className="space-y-8">
                        <div className="grid grid-cols-2 gap-4">
                          {[
                            { id: "google_drive", name: "Google Drive", icon: Cloud, disabled: !accounts.find(a => a.provider === "google") },
                            { id: "dropbox", name: "Dropbox", icon: Cloud, disabled: !accounts.find(a => a.provider === "dropbox") }
                          ].map((provider) => {
                            const Icon = provider.icon;
                            const isActive = formData.storageProvider === provider.id;
                            return (
                              <button
                                key={provider.id}
                                type="button"
                                disabled={provider.disabled}
                                onClick={() => selectStorageProvider(provider.id as any)}
                                className={`relative p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${isActive
                                  ? "border-slate-900 bg-slate-50"
                                  : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
                                  } ${provider.disabled ? "opacity-40 grayscale cursor-not-allowed" : ""}`}
                              >
                                <div className={`p-3 rounded-xl ${isActive ? "bg-slate-900 text-white shadow-md" : "bg-slate-100 text-slate-400"}`}>
                                  <Icon className="w-6 h-6" />
                                </div>
                                <span className="font-bold text-sm text-slate-900">{provider.name}</span>
                                {isActive && (
                                  <CheckCircle2 className="absolute top-3 right-3 w-5 h-5 text-slate-900" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
                          <div className="px-5 py-4 border-b border-slate-200 bg-slate-100/50 flex justify-between items-center">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Destination</span>
                            <span className="text-xs font-mono font-bold text-slate-900">{formData.storageFolderPath || "/"}</span>
                          </div>

                          <div className="max-h-72 overflow-y-auto p-2 bg-white">
                            {loadingFolders ? (
                              <div className="p-8 text-center">
                                <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" />
                              </div>
                            ) : folders.length === 0 ? (
                              <div className="p-8 text-center text-slate-400 text-sm">No subdirectories found</div>
                            ) : (
                              <div className="space-y-1">
                                {folders.map((folder) => (
                                  <FolderNode
                                    key={folder.id}
                                    folder={folder}
                                    navigateToFolder={navigateToFolder}
                                    expandedFolders={expandedFolders}
                                    toggleFolder={toggleFolder}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setActiveTab('Security')}
                            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
                          >
                            Next: Security
                          </button>
                        </div>
                      </div>
                    )}

                    {activeTab === 'Security' && (
                      <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              Max File Size (MB)
                            </label>
                            <div className="relative">
                              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <input
                                type="number"
                                value={formData.maxFileSize}
                                onChange={(e) => setFormData({ ...formData, maxFileSize: e.target.value === '' ? '' : parseInt(e.target.value) })}
                                placeholder="e.g. 200"
                                className={`w-full pl-10 pr-4 py-3 bg-white border rounded-xl focus:ring-2 focus:ring-slate-900 transition-all outline-none font-semibold text-slate-900 ${!formData.maxFileSize ? 'border-amber-300' : 'border-slate-200'}`}
                              />
                            </div>
                            {!formData.maxFileSize && (
                              <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider mt-1.5 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Please specify a capacity limit
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              Password Protection
                            </label>
                            <div className="relative">
                              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="Optional"
                                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 transition-all outline-none font-semibold text-slate-900"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                            Required Information
                          </label>
                          <div className="flex gap-4">
                            {[
                              { id: 'name', label: 'Client Name', key: 'requireClientName' },
                              { id: 'email', label: 'Email Address', key: 'requireClientEmail' }
                            ].map(req => (
                              <button
                                key={req.id}
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, [req.key]: !prev[req.key as keyof typeof prev] }))}
                                className={`flex-1 px-4 py-3 rounded-xl border font-bold text-sm transition-all ${formData[req.key as keyof typeof formData]
                                  ? "border-slate-900 bg-slate-900 text-white shadow-md"
                                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                                  }`}
                              >
                                {req.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Allowed File Types
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                            {FILE_TYPE_OPTIONS.map((opt) => {
                              const isSelected = formData.allowedFileTypes.includes(opt.value);
                              return (
                                <label key={opt.value} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() =>
                                      setFormData((prev) => ({
                                        ...prev,
                                        allowedFileTypes: isSelected
                                          ? prev.allowedFileTypes.filter((v) => v !== opt.value)
                                          : [...prev.allowedFileTypes, opt.value],
                                      }))
                                    }
                                    className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                  />
                                  <span className={`text-sm font-medium ${isSelected ? "text-slate-900" : "text-slate-500"}`}>
                                    {opt.label.split(' (')[0]}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              if (!formData.maxFileSize) {
                                setError("Please provide a valid file size limit before proceeding.");
                                return;
                              }
                              setActiveTab('Messaging');
                            }}
                            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
                          >
                            Next: Messaging
                          </button>
                        </div>
                      </div>
                    )}

                    {activeTab === 'Messaging' && (
                      <div className="space-y-8">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Welcome Message
                          </label>
                          <textarea
                            value={formData.welcomeMessage}
                            onChange={(e) => setFormData({ ...formData, welcomeMessage: e.target.value })}
                            placeholder="Welcome! Please upload your documents for review."
                            rows={3}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-medium text-slate-900 placeholder:text-slate-400 resize-none"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              Submit Button Label
                            </label>
                            <input
                              type="text"
                              value={formData.submitButtonText}
                              onChange={(e) => setFormData({ ...formData, submitButtonText: e.target.value })}
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 transition-all outline-none font-semibold text-slate-900"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              Success Message
                            </label>
                            <input
                              type="text"
                              value={formData.successMessage}
                              onChange={(e) => setFormData({ ...formData, successMessage: e.target.value })}
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 transition-all outline-none font-semibold text-slate-900"
                            />
                          </div>
                        </div>

                        <div className="bg-slate-900 rounded-xl p-6 text-white shadow-lg">
                          <div className="flex items-start gap-4">
                            <div className="p-2 bg-white/10 rounded-lg">
                              <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="font-bold text-lg">Ready to Create?</h4>
                              <p className="text-slate-300 text-sm mt-1 leading-relaxed">
                                Your new portal will be accessible at <strong className="text-white">/p/{formData.slug || "..."}</strong> and linked to your selected storage.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                          <Link
                            href="/dashboard"
                            className="px-6 py-3 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all font-bold text-sm"
                          >
                            Cancel
                          </Link>
                          <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-md active:scale-95 disabled:opacity-50 font-bold text-sm"
                          >
                            {loading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>Create Portal <ChevronRight className="w-4 h-4" /></>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Error Toast Positioned or Inline */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm font-bold"
              >
                <AlertCircle className="w-5 h-5" />
                {error}
              </motion.div>
            )}
          </form>
        </main>
      </div>
    </div>
  )
}
