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
import ColorPicker from "@/components/ui/ColorPicker"

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
  const { subfolders = [] } = folder

  return (
    <div className="pl-4">
      <div className="flex items-center justify-between py-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group rounded-lg pr-2">
        <button
          type="button"
          onClick={() => navigateToFolder(folder)}
          className="flex items-center gap-2 text-left flex-1"
        >
          <FolderOpen className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 truncate">{folder.name}</span>
        </button>

        {subfolders.length > 0 && (
          <button
            type="button"
            onClick={() => toggleFolder(folder.id)}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md transition-colors"
          >
            <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
          </button>
        )}
      </div>

      {isExpanded && subfolders.length > 0 && (
        <div className="pl-4 border-l border-slate-100 dark:border-slate-700 ml-2">
          {subfolders.map((sub: any) => (
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
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [folderPath, setFolderPath] = useState<StorageFolder[]>([])
  const [loadingFolders, setLoadingFolders] = useState(false)
  const [folders, setFolders] = useState<StorageFolder[]>([])

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
    maxFileSize: 200,
    storageProvider: "google_drive" as "google_drive" | "dropbox",
    storageFolderId: "",
    storageFolderPath: "",
    useClientFolders: false,
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

  // Auto-initialize storage when accounts are loaded
  useEffect(() => {
    if (!loadingAccounts && accounts.length > 0) {
      // Always auto-select storage if not already set or if no folders are loaded
      if (!formData.storageProvider || (!loadingFolders && folders.length === 0 && folderPath.length === 0)) {
        const firstAccount = accounts[0]
        if (firstAccount) {
          selectStorageProvider(firstAccount.provider as "google_drive" | "dropbox")
        }
      }
    }
  }, [loadingAccounts, accounts, formData.storageProvider, folders.length, folderPath.length])

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
    setFormData(prev => ({
      ...prev,
      storageProvider: provider,
      storageFolderId: "",
      storageFolderPath: "",
    }))
    setFolders([])
    setFolderPath([])
    setLoadingFolders(true)

    try {
      // 1. Get/Create the SecureUploadHub root
      const rootRes = await fetch(`/api/storage/folders?provider=${provider}&rootOnly=true`)
      if (rootRes.ok) {
        const rootFolder = await rootRes.json()
        // Check if rootFolder exists and has an id
        if (rootFolder && rootFolder.id) {
          setFolderPath([rootFolder])
          setFormData(prev => ({
            ...prev,
            storageFolderId: rootFolder.id,
            storageFolderPath: rootFolder.path
          }))
          // 2. Fetch children of this root
          await fetchFolders(provider, rootFolder.id)
        } else {
          console.error("Root folder not found or invalid:", rootFolder)
        }
      } else {
        console.error("Failed to fetch root folder:", await rootRes.text())
      }
    } catch (error) {
      console.error("Error initializing storage:", error)
    } finally {
      setLoadingFolders(false)
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

  async function handleCreateFolder() {
    if (!newFolderName.trim() || !formData.storageProvider) return

    setLoadingFolders(true)
    try {
      const parentId = folderPath.length > 0 ? folderPath[folderPath.length - 1].id : undefined
      const res = await fetch("/api/storage/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: formData.storageProvider,
          folderName: newFolderName,
          parentFolderId: parentId
        })
      })

      if (res.ok) {
        const newFolder = await res.json()
        setNewFolderName("")
        setIsCreatingFolder(false)
        // Refresh current folder view
        await fetchFolders(formData.storageProvider, parentId)
        // Auto-select the new folder
        navigateToFolder(newFolder)
      }
    } catch (error) {
      console.error("Error creating folder:", error)
    } finally {
      setLoadingFolders(false)
    }
  }

  function navigateToBreadcrumb(index: number) {
    const newPath = folderPath.slice(0, index + 1)
    const currentFolder = newPath[newPath.length - 1]
    setFolderPath(newPath)
    setFormData(prev => ({
      ...prev,
      storageFolderId: currentFolder.id,
      storageFolderPath: currentFolder.path
    }))
    fetchFolders(formData.storageProvider, currentFolder.id)
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
    
    // Validate required fields and navigate to first unfilled section
    const validationErrors = []
    
    if (!formData.name.trim()) {
      validationErrors.push({ field: 'name', tab: 'Identity', message: 'Portal name is required' })
    }
    
    if (!formData.slug.trim()) {
      validationErrors.push({ field: 'slug', tab: 'Identity', message: 'Portal handle is required' })
    }
    
    if (!formData.storageProvider || !formData.storageFolderId) {
      validationErrors.push({ field: 'storage', tab: 'Storage', message: 'Storage provider and folder must be selected' })
    }
    
    if (!formData.maxFileSize || Number(formData.maxFileSize) <= 0) {
      validationErrors.push({ field: 'maxFileSize', tab: 'Security', message: 'Maximum file size must be specified' })
    }
    
    // If there are validation errors, navigate to the first problematic section
    if (validationErrors.length > 0) {
      const firstError = validationErrors[0]
      setActiveTab(firstError.tab)
      setError(firstError.message)
      return
    }
    
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
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link
        href="/dashboard"
        className="group inline-flex items-center gap-2 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors font-medium text-sm mb-8"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Dashboard
      </Link>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Navigation Sidebar */}
        <aside className="lg:w-64 flex-shrink-0">
          <div className="mb-6 px-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">New Portal</h1>
            <p className="text-slate-500 text-sm mt-1">Create a secure space for your clients.</p>
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
                    ? "bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                    }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-slate-900 dark:text-slate-100" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"}`} />
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
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                        {activeTab}
                      </h2>
                      <p className="text-sm text-slate-500 mt-1">
                        Manage settings for this section.
                      </p>
                    </div>
                    {loading && <Loader2 className="w-5 h-5 animate-spin text-slate-400" />}
                  </div>

                  <div className="p-8 space-y-8">
                    {activeTab === 'Identity' && (
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Portal Name
                          </label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            placeholder="e.g. Project Delivery Materials"
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 transition-all outline-none font-medium text-slate-900 dark:text-slate-100"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Permanent Handle
                          </label>
                          <div className="flex items-stretch shadow-sm rounded-xl">
                            <div className="px-4 flex items-center bg-slate-50 border border-r-0 border-slate-200 rounded-l-xl text-slate-500 text-sm font-medium">
                              /p/
                            </div>
                            <input
                              type="text"
                              value={formData.slug}
                              onChange={(e) =>
                                setFormData({ ...formData, slug: e.target.value.toLowerCase() })
                              }
                              placeholder="custom-address"
                              className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-r-xl focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 transition-all outline-none font-medium text-slate-900 dark:text-slate-100"
                              pattern="[a-z0-9-]+"
                              required
                            />
                          </div>
                        </div>

                        <div className="pt-4 flex justify-between">
                          <div></div>
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => setActiveTab('Messaging')}
                              className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                              Jump to Finish
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveTab('Branding')}
                              className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
                            >
                              Next: Branding
                            </button>
                          </div>
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
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 transition-all outline-none font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                          />
                        </div>

                        <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4">Color Palette</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase">Primary Color</label>
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
                                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 transition-all outline-none font-mono text-sm uppercase text-slate-900 dark:text-slate-100"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase">Text Color</label>
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
                                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 transition-all outline-none font-mono text-sm uppercase text-slate-900 dark:text-slate-100"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase">Background</label>
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
                                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 transition-all outline-none font-mono text-sm uppercase text-slate-900 dark:text-slate-100"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase">Card Background</label>
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
                                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 transition-all outline-none font-mono text-sm uppercase text-slate-900 dark:text-slate-100"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 flex justify-between">
                          <div></div>
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => setActiveTab('Messaging')}
                              className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                              Jump to Finish
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveTab('Storage')}
                              className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
                            >
                              Next: Storage
                            </button>
                          </div>
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
                                  ? "border-slate-900 bg-slate-50 dark:bg-slate-800 dark:border-slate-700"
                                  : "border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
                                  } ${provider.disabled ? "opacity-40 grayscale cursor-not-allowed" : ""}`}
                              >
                                <div className={`p-3 rounded-xl ${isActive ? "bg-slate-900 text-white shadow-md" : "bg-slate-100 dark:bg-slate-700 text-slate-400"}`}>
                                  <Icon className="w-6 h-6" />
                                </div>
                                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{provider.name}</span>
                                {isActive && (
                                  <CheckCircle2 className="absolute top-3 right-3 w-5 h-5 text-slate-900 dark:text-slate-100" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-800/50 flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Navigation Tree</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsCreatingFolder(true)
                                  setNewFolderName(formData.name || "New Portal Folder")
                                }}
                                className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-sm"
                              >
                                <FolderOpen className="w-3 h-3 text-amber-500" />
                                New Folder
                              </button>
                            </div>

                            {/* Breadcrumbs */}
                            <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
                              <button
                                type="button"
                                onClick={() => selectStorageProvider(formData.storageProvider)}
                                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors"
                              >
                                <Cloud className="w-3.5 h-3.5 text-slate-400" />
                              </button>
                              {folderPath.map((folder, idx) => (
                                <div key={folder.id} className="flex items-center gap-1 shrink-0">
                                  <ChevronRight className="w-3 h-3 text-slate-300" />
                                  <button
                                    type="button"
                                    onClick={() => navigateToBreadcrumb(idx)}
                                    className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${idx === folderPath.length - 1
                                      ? "bg-slate-900 text-white"
                                      : "text-slate-500 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100"
                                      }`}
                                  >
                                    {folder.name}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="relative">
                            <AnimatePresence>
                              {isCreatingFolder && (
                                <motion.div
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  className="absolute inset-x-0 top-0 z-10 p-4 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 shadow-xl"
                                >
                                  <div className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Creation Module</h4>
                                      <button onClick={() => setIsCreatingFolder(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                        <ArrowLeft className="w-3.5 h-3.5 rotate-90" />
                                      </button>
                                    </div>
                                    <div className="flex gap-2">
                                      <input
                                        autoFocus
                                        value={newFolderName}
                                        onChange={(e) => setNewFolderName(e.target.value)}
                                        placeholder="Enter folder identifier..."
                                        className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 outline-none text-slate-900 dark:text-slate-100"
                                        onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                                      />
                                      <button
                                        type="button"
                                        onClick={handleCreateFolder}
                                        className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors"
                                      >
                                        Create
                                      </button>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            <div className="max-h-72 overflow-y-auto p-2 bg-white dark:bg-slate-800">
                              {loadingFolders ? (
                                <div className="py-12 flex flex-col items-center justify-center gap-3">
                                  <Loader2 className="w-6 h-6 animate-spin text-slate-200" />
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Syncing Directory...</p>
                                </div>
                              ) : folders.length === 0 ? (
                                <div className="py-12 flex flex-col items-center justify-center gap-2">
                                  <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-full">
                                    <FolderOpen className="w-5 h-5 text-slate-200" />
                                  </div>
                                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">Sector is empty</p>
                                </div>
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

                          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                            <label className="flex items-center gap-3 cursor-pointer group">
                              <div className="relative flex items-center">
                                <input
                                  type="checkbox"
                                  checked={formData.useClientFolders}
                                  onChange={(e) => setFormData({ ...formData, useClientFolders: e.target.checked })}
                                  className="peer sr-only"
                                />
                                <div className="w-10 h-5 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:bg-slate-900 dark:peer-checked:bg-slate-400 transition-colors" />
                                <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full peer-checked:translate-x-5 transition-transform" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">Client Isolation Mode</span>
                                <span className="text-[9px] text-slate-400 font-medium">Automatic sub-directory generation for each transmission</span>
                              </div>
                            </label>
                          </div>
                        </div>

                        <div className="pt-4 flex justify-between">
                          <div></div>
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => setActiveTab('Messaging')}
                              className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                              Jump to Finish
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveTab('Security')}
                              className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
                            >
                              Next: Security
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'Security' && (
                      <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Max Payload (MB)</label>
                            
                            {/* File Size Templates */}
                            <div className="grid grid-cols-3 gap-2 mb-4">
                              {[
                                { size: 10, label: "Small", description: "Documents & images" },
                                { size: 50, label: "Medium", description: "Presentations & videos" },
                                { size: 200, label: "Large", description: "High-res media & archives" }
                              ].map((template) => (
                                <button
                                  key={template.size}
                                  type="button"
                                  onClick={() => setFormData({ ...formData, maxFileSize: template.size })}
                                  className={`p-3 rounded-xl border text-center transition-all ${
                                    formData.maxFileSize === template.size
                                      ? "border-slate-900 bg-slate-900 text-white shadow-md"
                                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                                  }`}
                                >
                                  <div className="font-bold text-lg">{template.size}MB</div>
                                  <div className="text-[10px] font-bold uppercase tracking-wider opacity-75">{template.label}</div>
                                  <div className="text-[9px] opacity-60 mt-1">{template.description}</div>
                                </button>
                              ))}
                            </div>

                            <div className="relative">
                              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <input
                                type="number"
                                value={formData.maxFileSize}
                                onChange={(e) => setFormData({ ...formData, maxFileSize: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 })}
                                placeholder="Custom size..."
                                className={`w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border rounded-xl focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 transition-all outline-none font-semibold text-slate-900 dark:text-slate-100 ${!formData.maxFileSize ? 'border-amber-300 dark:border-amber-600' : 'border-slate-200 dark:border-slate-700'}`}
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
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Access Passkey</label>
                            <div className="relative">
                              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="Set new key..."
                                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 transition-all outline-none font-semibold text-slate-900 dark:text-slate-100"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Client Data Requirements</label>
                          <div className="flex gap-4">
                            {[
                              { id: 'name', label: 'Identity (Name)', key: 'requireClientName' },
                              { id: 'email', label: 'Contact (Email)', key: 'requireClientEmail' }
                            ].map(req => (
                              <button
                                key={req.id}
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, [req.key]: !prev[req.key as keyof typeof prev] }))}
                                className={`flex-1 px-4 py-3 rounded-xl border font-bold text-sm transition-all ${formData[req.key as keyof typeof formData]
                                  ? "border-slate-900 bg-slate-900 text-white shadow-md"
                                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
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
                                <label key={opt.value} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 cursor-pointer transition-colors">
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

                        <div className="pt-4 flex justify-between">
                          <div></div>
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => setActiveTab('Messaging')}
                              className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                              Jump to Finish
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveTab('Messaging')}
                              className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
                            >
                              Next: Messaging
                            </button>
                          </div>
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
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 transition-all outline-none font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none"
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
                              className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 transition-all outline-none font-semibold text-slate-900 dark:text-slate-100"
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
                              className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 transition-all outline-none font-semibold text-slate-900 dark:text-slate-100"
                            />
                          </div>
                        </div>

                        <div className="bg-slate-900 rounded-xl p-6 text-white shadow-lg">
                          <div className="flex items-start gap-4">
                            <div className="p-2 bg-white/10 dark:bg-white/10 rounded-lg">
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

                        <div className="pt-6 border-t border-slate-100 dark:border-slate-700 flex justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => setActiveTab('Security')}
                            className="px-6 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-bold text-sm"
                          >
                            ← Previous
                          </button>
                          <div className="flex gap-3">
                            <Link
                              href="/dashboard"
                              className="px-6 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-bold text-sm"
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
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Error Toast */}
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
