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
import StorageSelector from "@/components/ui/StorageSelector"
import FolderTree from "@/components/ui/FolderTree"
import Breadcrumb from "@/components/ui/Breadcrumb"
import FileConstraints from "@/components/ui/FileConstraints"
import FormNavigation from "@/components/ui/FormNavigation"

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
      <div className="flex items-center justify-between py-2 hover:bg-muted transition-colors group rounded-lg pr-2">
        <button
          type="button"
          onClick={() => navigateToFolder(folder)}
          className="flex items-center gap-2 text-left flex-1"
        >
          <FolderOpen className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground truncate">{folder.name}</span>
        </button>

        {folder.subfolders?.length > 0 && (
          <button
            type="button"
            onClick={() => toggleFolder(folder.id)}
            className="p-1 hover:bg-muted rounded-md transition-colors"
          >
            <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
          </button>
        )}
      </div>

      {/* Recursively render subfolders */}
      {isExpanded && folder.subfolders?.length > 0 && (
        <div className="pl-4 border-l border-border ml-2">
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

  // Form steps configuration
  const formSteps = [
    { id: 'Identity', label: 'Identity', icon: Type, isRequired: true, isValid: !!formData.name && !!formData.slug },
    { id: 'Branding', label: 'Branding', icon: Palette, isRequired: false, isValid: true },
    { id: 'Storage', label: 'Storage', icon: Cloud, isRequired: true, isValid: !!formData.storageProvider && !!formData.storageFolderId },
    { id: 'Security', label: 'Security', icon: Lock, isRequired: false, isValid: true },
    { id: 'Messaging', label: 'Messaging', icon: Settings2, isRequired: false, isValid: true }
  ]

  const currentStepIndex = formSteps.findIndex(step => step.id === activeTab)
  const canProceedToNext = formSteps[currentStepIndex]?.isValid !== false

  const handleNextStep = () => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < formSteps.length) {
      setActiveTab(formSteps[nextIndex].id)
    }
  }

  const handlePreviousStep = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setActiveTab(formSteps[prevIndex].id)
    }
  }

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
        setFolderPath([rootFolder])
        setFormData(prev => ({
          ...prev,
          storageFolderId: rootFolder.id,
          storageFolderPath: rootFolder.path
        }))
        // 2. Fetch children of this root
        await fetchFolders(provider, rootFolder.id)
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
        className="group inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors font-medium text-sm"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Dashboard
      </Link>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Navigation Sidebar */}
        <aside className="lg:w-64 flex-shrink-0">
          <div className="mb-6 px-2">
            <h1 className="text-3xl font-black text-foreground tracking-tight">New Portal</h1>
            <p className="text-muted-foreground text-sm mt-1">Create a secure space for your clients.</p>
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
                    ? "bg-card shadow-sm border border-border text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`} />
                  <span className="font-medium text-sm">{tab.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="new-portal-active-indicator"
                      className="ml-auto"
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
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
                <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                  <div className="p-6 border-b border-border bg-muted/30">
                    <h2 className="text-2xl font-black text-foreground">
                      {activeTab} Settings
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1 font-medium">
                      Configure the {activeTab.toLowerCase()} parameters for your new portal.
                    </p>
                  </div>

                  <div className="p-8 space-y-8">
                    {activeTab === 'Identity' && (
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-bold text-foreground mb-2">
                            Workspace Name
                          </label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            placeholder="e.g. Project Delivery Materials"
                            className="w-full px-5 py-4 bg-muted border border-border rounded-2xl focus:bg-card focus:ring-2 focus:ring-ring transition-all outline-none font-bold text-foreground placeholder:text-muted-foreground"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-foreground mb-2">
                            Access Address
                          </label>
                          <div className="flex items-stretch shadow-sm rounded-xl">
                            <div className="px-4 flex items-center bg-muted border border-r-0 border-border rounded-l-xl text-muted-foreground text-sm font-medium">
                              /p/
                            </div>
                            <input
                              type="text"
                              value={formData.slug}
                              onChange={(e) =>
                                setFormData({ ...formData, slug: e.target.value.toLowerCase() })
                              }
                              placeholder="custom-address"
                              className="flex-1 px-5 py-4 bg-card border border-border rounded-r-2xl focus:ring-2 focus:ring-ring transition-all outline-none font-bold text-foreground"
                              pattern="[a-z0-9-]+"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-foreground mb-2">
                            Description (Optional)
                          </label>
                          <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Tell your clients what this portal is for..."
                            rows={4}
                            className="w-full px-5 py-4 bg-muted border border-border rounded-2xl focus:bg-card focus:ring-2 focus:ring-ring transition-all outline-none font-medium text-foreground placeholder:text-muted-foreground resize-none"
                          />
                        </div>

                        <div className="pt-4 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setActiveTab('Branding')}
                            className="px-6 py-2.5 bg-foreground text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary transition-colors"
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

                        <div className="bg-muted/30 rounded-xl p-6 border border-border">
                          <h3 className="text-sm font-bold text-foreground mb-6 uppercase tracking-wider">Color Configuration</h3>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <ColorPicker
                              label="Primary Brand Color"
                              value={formData.primaryColor}
                              onChange={(value) => setFormData({ ...formData, primaryColor: value })}
                              presets={["#0f172a", "#1e40af", "#dc2626", "#059669", "#7c3aed", "#ea580c"]}
                            />

                            <ColorPicker
                              label="Text Color"
                              value={formData.textColor}
                              onChange={(value) => setFormData({ ...formData, textColor: value })}
                              presets={["#0f172a", "#374151", "#6b7280", "#ffffff", "#f9fafb", "#1f2937"]}
                            />

                            <ColorPicker
                              label="Background Color"
                              value={formData.backgroundColor || "#ffffff"}
                              onChange={(value) => setFormData({ ...formData, backgroundColor: value })}
                              presets={["#ffffff", "#f9fafb", "#f3f4f6", "#e5e7eb", "#0f172a", "#1e293b"]}
                            />

                            <ColorPicker
                              label="Card Background"
                              value={formData.cardBackgroundColor}
                              onChange={(value) => setFormData({ ...formData, cardBackgroundColor: value })}
                              presets={["#ffffff", "#f9fafb", "#f3f4f6", "#e5e7eb", "#1f2937", "#374151"]}
                            />
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
                        <StorageSelector
                          selectedProvider={formData.storageProvider}
                          onProviderSelect={selectStorageProvider}
                          accounts={accounts}
                          onAccountsRefresh={fetchAccounts}
                          autoSync={true}
                        />

                        {formData.storageProvider && (
                          <div className="bg-muted/30 border border-border rounded-2xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-border bg-muted/50 flex flex-col gap-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Folder Selection</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsCreatingFolder(true)
                                    setNewFolderName(formData.name || "New Portal Folder")
                                  }}
                                  className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-all shadow-sm"
                                >
                                  <FolderOpen className="w-4 h-4 text-amber-500" />
                                  New Folder
                                </button>
                              </div>

                              {/* Breadcrumb Navigation */}
                              {folderPath.length > 0 && (
                                <Breadcrumb
                                  items={folderPath.map(folder => ({
                                    id: folder.id,
                                    name: folder.name,
                                    path: folder.path
                                  }))}
                                  onItemClick={(item, index) => navigateToBreadcrumb(index)}
                                  className="bg-card px-3 py-2 rounded-lg border border-border"
                                />
                              )}
                            </div>

                            {/* Folder Creation Input */}
                            {isCreatingFolder && (
                              <div className="px-6 py-4 border-b border-border bg-amber-50/50">
                                <div className="flex items-center gap-3">
                                  <FolderOpen className="w-5 h-5 text-amber-500 flex-shrink-0" />
                                  <input
                                    type="text"
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    placeholder="Enter folder name..."
                                    className="flex-1 px-3 py-2 bg-card border border-border rounded-lg focus:ring-2 focus:ring-ring outline-none text-sm"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleCreateFolder()
                                      if (e.key === 'Escape') setIsCreatingFolder(false)
                                    }}
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    onClick={handleCreateFolder}
                                    disabled={!newFolderName.trim() || loadingFolders}
                                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
                                  >
                                    {loadingFolders ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setIsCreatingFolder(false)}
                                    className="px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Folder Tree */}
                            <div className="p-6">
                              <FolderTree
                                folders={folders.map(folder => ({
                                  ...folder,
                                  canDelete: folder.name !== "SecureUploadHub",
                                  canRename: folder.name !== "SecureUploadHub"
                                }))}
                                selectedFolderId={formData.storageFolderId}
                                onFolderSelect={navigateToFolder}
                                onFolderCreate={async (parentId, name) => {
                                  await fetch("/api/storage/folders", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      provider: formData.storageProvider,
                                      folderName: name,
                                      parentFolderId: parentId
                                    })
                                  })
                                  await fetchFolders(formData.storageProvider, parentId)
                                }}
                                onFolderRename={async (folderId, newName) => {
                                  // Implement folder rename API call
                                  console.log("Rename folder:", folderId, newName)
                                }}
                                onFolderDelete={async (folderId) => {
                                  // Implement folder delete API call
                                  console.log("Delete folder:", folderId)
                                }}
                                loading={loadingFolders}
                              />
                            </div>
                          </div>
                        )}

                        {/* Client Isolation Mode */}
                        <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-xl">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <Lock className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-blue-900">Client Isolation Mode</h4>
                              <p className="text-sm text-blue-700 mt-1">
                                Automatically create separate folders for each client's uploads
                              </p>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.useClientFolders}
                              onChange={(e) => setFormData({ ...formData, useClientFolders: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>

                        <div className="pt-4 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setActiveTab('Security')}
                            className="px-6 py-2.5 bg-foreground text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary transition-colors"
                          >
                            Next: Security
                          </button>
                        </div>
                      </div>
                    )}

                    {activeTab === 'Security' && (
                      <div className="space-y-8">
                        {/* File Constraints */}
                        <FileConstraints
                          maxFileSize={formData.maxFileSize}
                          allowedFileTypes={formData.allowedFileTypes}
                          onMaxFileSizeChange={(size) => setFormData({ ...formData, maxFileSize: size })}
                          onAllowedFileTypesChange={(types) => setFormData({ ...formData, allowedFileTypes: types })}
                        />

                        {/* Password Protection */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Lock className="w-5 h-5 text-primary" />
                            <h3 className="text-lg font-semibold text-foreground">Password Protection</h3>
                          </div>

                          <div className="p-4 bg-muted/30 border border-border rounded-xl">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!formData.password}
                                onChange={(e) => {
                                  if (!e.target.checked) {
                                    setFormData({ ...formData, password: "" })
                                  }
                                }}
                                className="w-4 h-4 text-primary bg-card border-border rounded focus:ring-ring focus:ring-2"
                              />
                              <div>
                                <span className="font-medium text-foreground">Enable password protection</span>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Require users to enter a password before accessing this portal
                                </p>
                              </div>
                            </label>

                            {(!!formData.password || formData.password === "") && (
                              <div className="mt-4">
                                <input
                                  type="password"
                                  value={formData.password}
                                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                  placeholder="Enter portal password..."
                                  className="w-full px-4 py-3 bg-card border border-border rounded-xl focus:ring-2 focus:ring-ring transition-all outline-none font-medium"
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Client Information Requirements */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-foreground">Client Information</h3>
                          
                          <div className="space-y-3">
                            <label className="flex items-center gap-3 cursor-pointer p-3 bg-muted/30 border border-border rounded-xl hover:bg-muted/50 transition-colors">
                              <input
                                type="checkbox"
                                checked={formData.requireClientName}
                                onChange={(e) => setFormData({ ...formData, requireClientName: e.target.checked })}
                                className="w-4 h-4 text-primary bg-card border-border rounded focus:ring-ring focus:ring-2"
                              />
                              <div>
                                <span className="font-medium text-foreground">Require client name</span>
                                <p className="text-sm text-muted-foreground">Users must provide their name before uploading</p>
                              </div>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer p-3 bg-muted/30 border border-border rounded-xl hover:bg-muted/50 transition-colors">
                              <input
                                type="checkbox"
                                checked={formData.requireClientEmail}
                                onChange={(e) => setFormData({ ...formData, requireClientEmail: e.target.checked })}
                                className="w-4 h-4 text-primary bg-card border-border rounded focus:ring-ring focus:ring-2"
                              />
                              <div>
                                <span className="font-medium text-foreground">Require client email</span>
                                <p className="text-sm text-muted-foreground">Users must provide their email address before uploading</p>
                              </div>
                            </label>
                          </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setActiveTab('Messaging')}
                            className="px-6 py-2.5 bg-foreground text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary transition-colors"
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

            {/* Form Navigation */}
            <div className="mt-8">
              <FormNavigation
                steps={formSteps}
                currentStep={activeTab}
                onStepChange={setActiveTab}
                onNext={handleNextStep}
                onPrevious={handlePreviousStep}
                onSubmit={() => handleSubmit({ preventDefault: () => {} } as any)}
                isSubmitting={loading}
                canProceed={canProceedToNext}
              />
            </div>

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
