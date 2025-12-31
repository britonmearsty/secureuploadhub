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
      <button
        type="button"
        onClick={() => toggleFolder(folder.id)}
        className="w-full flex items-center justify-between py-2 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-semibold text-slate-700">{folder.name}</span>
        </div>
        <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
      </button>

      {/* Recursively render subfolders */}
      {isExpanded && folder.subfolders?.length > 0 && (
        <div className="pl-4 border-l border-slate-100">
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

  const COLOR_PRESETS = [
    { name: "Blue", value: "#3b82f6" },
    { name: "Red", value: "#ef4444" },
    { name: "Green", value: "#10b981" },
    { name: "Yellow", value: "#f59e0b" },
    { name: "Purple", value: "#8b5cf6" },
    { name: "Pink", value: "#ec4899" },
    { name: "Gray", value: "#6b7280" },
    { name: "Indigo", value: "#6366f1" },
    { name: "Teal", value: "#14b8a6" },
    { name: "Orange", value: "#f97316" },
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
    maxFileSize: 500,
    storageProvider: "google_drive" as "google_drive" | "dropbox",
    storageFolderId: "",
    storageFolderPath: "",
    password: "",
    allowedFileTypes: [] as string[],
  })
  const [folderSectionOpen, setFolderSectionOpen] = useState(false)
  const [colorSectionOpen, setColorSectionOpen] = useState(false)
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
    <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <Link
        href="/dashboard"
        className="group inline-flex items-center gap-2 text-slate-400 hover:text-slate-900 mb-8 transition-colors font-medium text-sm"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Dashboard
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
        {/* Form Section */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-slate-900 rounded-xl shadow-lg shadow-slate-200">
                <Layout className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Portal Builder</span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">
              Create a New Workspace
            </h1>
            <p className="text-slate-500 mt-2 text-lg font-medium">
              Set up a polished, secure space for sharing client documents.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 md:p-10 rounded-[40px] border border-slate-100 shadow-2xl shadow-slate-200/40"
          >
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="flex items-center gap-1 p-1 bg-slate-100/50 rounded-2xl border border-slate-200/50 overflow-x-auto no-scrollbar mb-6">
                {[
                  { id: 'Identity', icon: Type },
                  { id: 'Branding', icon: Palette },
                  { id: 'Storage', icon: Cloud },
                  { id: 'Security', icon: Lock },
                  { id: 'Messaging', icon: Settings2 }
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 min-w-fit px-4 py-3 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${isActive
                          ? 'bg-slate-900 text-white shadow-md'
                          : 'text-slate-400 hover:text-slate-900 hover:bg-white/50'
                        }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-slate-400"}`} />
                      {tab.id}
                    </button>
                  );
                })}
              </div>

              <AnimatePresence mode="wait">
                {activeTab === 'Identity' && (
                  <motion.div
                    key="identity"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="space-y-6">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                          Workspace Name
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => handleNameChange(e.target.value)}
                          placeholder="e.g. Project Delivery Materials"
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-bold text-slate-900 placeholder:text-slate-300"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                          Access Address
                        </label>
                        <div className="flex items-stretch shadow-sm rounded-2xl">
                          <div className="px-5 flex items-center bg-slate-100 border border-r-0 border-slate-200 rounded-l-2xl text-slate-400 text-sm font-bold">
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
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                          Description (Optional)
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Tell your clients what this portal is for..."
                          rows={3}
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-bold text-slate-900 placeholder:text-slate-300 resize-none"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('Branding')}
                      className="w-full py-4 bg-slate-50 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-100 transition-colors"
                    >
                      Next: Branding & Style
                    </button>
                  </motion.div>
                )}

                {activeTab === 'Branding' && (
                  <motion.div
                    key="branding"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="space-y-6">

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                            Logo Source
                          </label>
                          <input
                            type="url"
                            value={formData.logoUrl}
                            onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                            placeholder="https://your-brand.com/logo.png"
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-bold text-slate-900 placeholder:text-slate-300"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => setColorSectionOpen(!colorSectionOpen)}
                          className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
                        >
                          <Palette className="w-4 h-4" />
                          <span>Advanced Color Configuration</span>
                          <ChevronDown className={`w-3 h-3 transition-transform ${colorSectionOpen ? "rotate-180" : ""}`} />
                        </button>

                        <AnimatePresence>
                          {(colorSectionOpen || true) && ( // Always open for now for better UX, or keep collapsible
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="grid grid-cols-1 md:grid-cols-2 gap-4"
                            >
                              <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                  Primary Brand Color
                                </label>
                                <div className="flex items-center gap-3">
                                  <div className="relative">
                                    <input
                                      type="color"
                                      value={formData.primaryColor}
                                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                                      className="w-14 h-14 rounded-2xl cursor-pointer border-4 border-white shadow-lg overflow-hidden shrink-0"
                                    />
                                    <div className="absolute inset-0 rounded-2xl border border-slate-200 pointer-events-none" />
                                  </div>
                                  <input
                                    type="text"
                                    value={formData.primaryColor}
                                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-mono text-xs font-bold uppercase"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                  Text Color
                                </label>
                                <div className="flex items-center gap-3">
                                  <div className="relative">
                                    <input
                                      type="color"
                                      value={formData.textColor}
                                      onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                                      className="w-14 h-14 rounded-2xl cursor-pointer border-4 border-white shadow-lg overflow-hidden shrink-0"
                                    />
                                    <div className="absolute inset-0 rounded-2xl border border-slate-200 pointer-events-none" />
                                  </div>
                                  <input
                                    type="text"
                                    value={formData.textColor}
                                    onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-mono text-xs font-bold uppercase"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                  Background
                                </label>
                                <div className="flex items-center gap-3">
                                  <div className="relative">
                                    <input
                                      type="color"
                                      value={formData.backgroundColor || "#ffffff"}
                                      onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                                      className="w-14 h-14 rounded-2xl cursor-pointer border-4 border-white shadow-lg overflow-hidden shrink-0"
                                    />
                                    <div className="absolute inset-0 rounded-2xl border border-slate-200 pointer-events-none" />
                                  </div>
                                  <input
                                    type="text"
                                    value={formData.backgroundColor || ""}
                                    onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                                    placeholder="#FFFFFF"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-mono text-xs font-bold uppercase"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                  Card Background
                                </label>
                                <div className="flex items-center gap-3">
                                  <div className="relative">
                                    <input
                                      type="color"
                                      value={formData.cardBackgroundColor}
                                      onChange={(e) => setFormData({ ...formData, cardBackgroundColor: e.target.value })}
                                      className="w-14 h-14 rounded-2xl cursor-pointer border-4 border-white shadow-lg overflow-hidden shrink-0"
                                    />
                                    <div className="absolute inset-0 rounded-2xl border border-slate-200 pointer-events-none" />
                                  </div>
                                  <input
                                    type="text"
                                    value={formData.cardBackgroundColor}
                                    onChange={(e) => setFormData({ ...formData, cardBackgroundColor: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-mono text-xs font-bold uppercase"
                                  />
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('Storage')}
                      className="w-full py-4 bg-slate-50 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-100 transition-colors"
                    >
                      Next: Storage Configuration
                    </button>
                  </motion.div>
                )}

                {activeTab === 'Storage' && (
                  <motion.div
                    key="storage"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="space-y-6">
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
                              className={`relative p-5 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${isActive
                                  ? "border-slate-900 bg-slate-900/5"
                                  : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
                                } ${provider.disabled ? "opacity-30 grayscale cursor-not-allowed" : ""}`}
                            >
                              <div className={`p-3 rounded-2xl ${isActive ? "bg-slate-900 text-white shadow-lg" : "bg-slate-100 text-slate-400"}`}>
                                <Icon className="w-6 h-6" />
                              </div>
                              <span className="font-bold text-sm uppercase tracking-tight text-slate-900">{provider.name}</span>
                              {isActive && (
                                <CheckCircle2 className="absolute top-3 right-3 w-5 h-5 text-slate-900" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-3xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setFolderSectionOpen(prev => !prev)}
                          className="w-full px-6 py-4 flex justify-between items-center text-xs font-black uppercase tracking-widest text-slate-900 bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-3 truncate pr-4">
                            <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
                            <span className="truncate">{formData.storageFolderPath || "Select Destination Folder"}</span>
                          </div>
                          <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${folderSectionOpen ? "rotate-90" : ""}`} />
                        </button>

                        <AnimatePresence>
                          {folderSectionOpen && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="max-h-72 overflow-y-auto divide-y divide-slate-100 bg-white"
                            >
                              {loadingFolders ? (
                                <div className="p-10 text-center">
                                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300" />
                                </div>
                              ) : folders.length === 0 ? (
                                <div className="p-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">No directories found</div>
                              ) : (
                                <div className="py-2">
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
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="p-3 bg-slate-900/5 text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] text-center border-t border-slate-100">
                          Destination: <span className="text-slate-900">{formData.storageFolderPath || "Root"}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('Security')}
                      className="w-full py-4 bg-slate-50 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-100 transition-colors"
                    >
                      Next: Security & Limits
                    </button>
                  </motion.div>
                )}

                {activeTab === 'Security' && (
                  <motion.div
                    key="security"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                            Max File Size (MB)
                          </label>
                          <div className="relative">
                            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <input
                              type="number"
                              value={formData.maxFileSize}
                              onChange={(e) => setFormData({ ...formData, maxFileSize: parseInt(e.target.value) || 100 })}
                              className="w-full pl-10 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-bold text-slate-900"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                            Password Protection
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <input
                              type="password"
                              value={formData.password}
                              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                              placeholder="Optional"
                              className="w-full pl-10 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-bold text-slate-900"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                          Client Requirements
                        </label>
                        <div className="flex gap-3">
                          {[
                            { id: 'name', label: 'Full Name', key: 'requireClientName' },
                            { id: 'email', label: 'Email Address', key: 'requireClientEmail' }
                          ].map(req => (
                            <button
                              key={req.id}
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, [req.key]: !prev[req.key as keyof typeof prev] }))}
                              className={`flex-1 px-4 py-3 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${formData[req.key as keyof typeof formData]
                                  ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-200"
                                  : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                                }`}
                            >
                              {req.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="relative space-y-2" ref={dropdownRef}>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                          Allowed File Categories
                        </label>
                        <button
                          type="button"
                          onClick={() => setDropdownOpen((prev) => !prev)}
                          className="w-full text-left bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 flex justify-between items-center text-sm font-bold text-slate-900 hover:bg-white transition-all shadow-sm"
                        >
                          <span className="truncate">
                            {formData.allowedFileTypes.length === 0
                              ? "Universal Acceptance (All)"
                              : `${formData.allowedFileTypes.length} Category Filters Active`}
                          </span>
                          <ChevronDown className={`w-4 h-4 ml-2 shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                        </button>

                        <AnimatePresence>
                          {dropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute z-50 mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-xl px-2 py-2 space-y-1 max-h-64 overflow-y-auto"
                            >
                              <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer group">
                                <input
                                  type="checkbox"
                                  checked={formData.allowedFileTypes.length === FILE_TYPE_OPTIONS.length}
                                  onChange={(e) =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      allowedFileTypes: e.target.checked ? FILE_TYPE_OPTIONS.map((f) => f.value) : [],
                                    }))
                                  }
                                  className="w-5 h-5 rounded-lg border-slate-300 text-slate-900 focus:ring-slate-900"
                                />
                                <span className="text-xs font-black uppercase tracking-widest">Select All Types</span>
                              </label>

                              <div className="h-px bg-slate-100 mx-2 my-1" />

                              {FILE_TYPE_OPTIONS.map((opt) => {
                                const isSelected = formData.allowedFileTypes.includes(opt.value);
                                return (
                                  <label key={opt.value} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
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
                                      className="w-5 h-5 rounded-lg border-slate-300 text-slate-900 focus:ring-slate-900"
                                    />
                                    <span className={`text-xs font-bold ${isSelected ? "text-slate-900" : "text-slate-500"}`}>
                                      {opt.label}
                                    </span>
                                  </label>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('Messaging')}
                      className="w-full py-4 bg-slate-50 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-100 transition-colors"
                    >
                      Next: Messaging & Tone
                    </button>
                  </motion.div>
                )}

                {activeTab === 'Messaging' && (
                  <motion.div
                    key="messaging"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="space-y-6">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                          Welcome Greeting
                        </label>
                        <textarea
                          value={formData.welcomeMessage}
                          onChange={(e) => setFormData({ ...formData, welcomeMessage: e.target.value })}
                          placeholder="Welcome! Please upload your documents for review."
                          rows={3}
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-bold text-slate-900 placeholder:text-slate-300 resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                            Button Label
                          </label>
                          <input
                            type="text"
                            value={formData.submitButtonText}
                            onChange={(e) => setFormData({ ...formData, submitButtonText: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-bold text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                            Completion Message
                          </label>
                          <input
                            type="text"
                            value={formData.successMessage}
                            onChange={(e) => setFormData({ ...formData, successMessage: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-bold text-slate-900"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900 text-white p-8 rounded-[32px] space-y-4 shadow-xl shadow-slate-900/20">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-white/10 rounded-2xl">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-base">Ready for Launch?</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Global CDN Deployment Ready</p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed font-medium">
                        By deploying this portal, you'll create a dedicated workspace at
                        <span className="text-white font-bold"> /p/{formData.slug || "..."} </span>
                        connected to your <span className="text-white font-bold">{formData.storageProvider === 'google_drive' ? 'Google Drive' : 'Dropbox'}</span>.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Error UI */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="px-6 py-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  {error}
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <Link
                  href="/dashboard"
                  className="px-8 py-4 border border-slate-200 rounded-2xl text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all font-bold text-xs uppercase tracking-widest"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 font-black text-xs uppercase tracking-[0.2em] active:scale-[0.98]"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>Launch Portal <ChevronRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>

        {/* Preview Section - Modern Mockup */}
        <div className="hidden lg:block sticky top-8">
          <div className="relative">
            <div className="absolute -inset-4 bg-slate-100/50 rounded-[48px] -z-10" />

            <div className="flex items-center gap-2 mb-4 px-6">
              <Eye className="w-4 h-4 text-slate-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Live Preview</span>
            </div>

            <div className="bg-white rounded-[40px] shadow-2xl border border-slate-200/50 overflow-hidden max-h-[80vh] flex flex-col">
              {/* Browser Frame */}
              <div className="bg-slate-50 h-10 border-b border-slate-100 flex items-center px-6 gap-1.5 shrink-0 z-20 relative">
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
              <div
                className="flex-1 overflow-y-auto p-12 flex flex-col items-center relative custom-scrollbar"
                style={{
                  backgroundColor: formData.backgroundColor || '#ffffff',
                  color: formData.textColor || '#0f172a'
                }}
              >
                {/* Background Image Layer */}
                {formData.backgroundImageUrl && (
                  <div
                    className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-100"
                    style={{ backgroundImage: `url(${formData.backgroundImageUrl})` }}
                  />
                )}

                {/* Content Layer */}
                <div className="w-full max-w-md flex flex-col relative z-10 space-y-8">
                  {/* Header Preview */}
                  <div className="text-center mb-6">
                    {formData.logoUrl ? (
                      <div className="w-auto h-24 mx-auto mb-6 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={formData.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                      </div>
                    ) : (
                      <motion.div
                        animate={{ backgroundColor: formData.primaryColor }}
                        className="w-24 h-24 rounded-[32px] mx-auto mb-6 flex items-center justify-center text-white text-4xl font-black shadow-xl"
                      >
                        {formData.name ? formData.name.charAt(0).toUpperCase() : <Palette className="w-10 h-10" />}
                      </motion.div>
                    )}

                    {formData.welcomeMessage && (
                      <p className="mb-3 text-xl font-medium opacity-90 leading-relaxed" style={{ color: formData.textColor }}>{formData.welcomeMessage}</p>
                    )}

                    <h2 className="text-3xl font-black tracking-tight leading-tight" style={{ color: formData.textColor }}>
                      {formData.name || "Untitled Portal"}
                    </h2>
                    {!formData.welcomeMessage && (
                      <p className="text-base mt-3 font-medium opacity-60" style={{ color: formData.textColor }}>
                        {formData.description || "Enter portal description above to preview here."}
                      </p>
                    )}
                  </div>

                  {/* Password Warning if set */}
                  {formData.password && (
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-4">
                      <div className="p-2.5 bg-white rounded-xl shadow-sm">
                        <Lock className="w-4 h-4 text-amber-500" />
                      </div>
                      <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">Password Protection Enabled</span>
                    </div>
                  )}

                  {/* Form Fields Preview */}
                  <div className="space-y-4 mb-8">
                    {formData.requireClientName && (
                      <div>
                        <div className="h-4 bg-slate-100 rounded w-1/3 mb-2" />
                        <div className="h-14 bg-slate-50 border border-slate-100 rounded-2xl" />
                      </div>
                    )}
                    {formData.requireClientEmail && (
                      <div>
                        <div className="h-4 bg-slate-100 rounded w-1/4 mb-2" />
                        <div className="h-14 bg-slate-50 border border-slate-100 rounded-2xl" />
                      </div>
                    )}
                    <div>
                      <div className="h-4 bg-slate-100 rounded w-1/5 mb-2" />
                      <div className="h-32 bg-slate-50 border border-slate-100 rounded-2xl" />
                    </div>
                  </div>

                  {/* Upload Preview Zone */}
                  <div className="border-3 border-dashed border-slate-200 rounded-[40px] p-10 flex flex-col items-center justify-center text-center group bg-slate-50/30">
                    <div className="p-5 bg-white rounded-full mb-4 group-hover:scale-110 transition-transform shadow-sm">
                      <Upload className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-base font-bold text-slate-900 tracking-tight">Drag and drop assets here</p>
                    <p className="text-xs text-slate-400 mt-2 font-bold uppercase tracking-wide">Limit: {formData.maxFileSize} MB / File</p>
                  </div>

                  {/* CTA Preview */}
                  <motion.div
                    animate={{ backgroundColor: formData.primaryColor }}
                    className="h-16 rounded-2xl mt-8 flex items-center justify-center text-base font-black text-white uppercase tracking-widest shadow-xl shadow-slate-200"
                  >
                    {formData.submitButtonText || "Initialize Transfer"}
                  </motion.div>
                </div>
              </div>

              <div className="py-8 border-t border-slate-50 text-center">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Hub Integrity Ensured</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
