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
  ChevronDown,
  RefreshCw
} from "lucide-react"
import ColorPicker from "@/components/ui/ColorPicker"
import ImageUpload from "@/components/ui/ImageUpload"
import { validateSlug, sanitizeSlug } from "@/lib/slug-validation"

interface ConnectedAccount {
  provider: "google" | "dropbox"
  providerAccountId: string
  email?: string
  name?: string
  isConnected: boolean
  storageAccountId?: string
  storageStatus?: "ACTIVE" | "INACTIVE" | "DISCONNECTED" | "ERROR"
  hasValidOAuth: boolean
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
      <div className="flex items-center justify-between py-2 hover:bg-muted/50 transition-colors group rounded-lg pr-2">
        <button
          type="button"
          onClick={() => navigateToFolder(folder)}
          className="flex items-center gap-2 text-left flex-1"
        >
          <FolderOpen className="w-4 h-4 text-warning flex-shrink-0" />
          <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground truncate">{folder.name}</span>
        </button>

        {subfolders.length > 0 && (
          <button
            type="button"
            onClick={() => toggleFolder(folder.id)}
            className="p-1 hover:bg-muted rounded-md transition-colors"
          >
            <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
          </button>
        )}
      </div>

      {isExpanded && subfolders.length > 0 && (
        <div className="pl-4 border-l border-border ml-2">
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

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    primaryColor: "#3b82f6",
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

  // Storage health check state
  const [isRunningHealthCheck, setIsRunningHealthCheck] = useState(false)
  const [healthCheckResults, setHealthCheckResults] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('Identity')

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) newSet.delete(id)
      else newSet.add(id)
      return newSet
    })
  }

  async function runStorageHealthCheck() {
    setIsRunningHealthCheck(true)
    setHealthCheckResults(null)

    try {
      const response = await fetch("/api/storage/health-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()
      setHealthCheckResults(data)
      
      if (data.success && data.createdAccounts > 0) {
        // Refresh accounts after health check creates new ones
        await fetchAccounts()
      }
    } catch (error) {
      setHealthCheckResults({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      })
    } finally {
      setIsRunningHealthCheck(false)
    }
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
          // Map OAuth provider names to storage provider names
          const storageProvider = firstAccount.provider === "google" ? "google_drive" : "dropbox"
          selectStorageProvider(storageProvider)
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
        const connectedAccounts = data.accounts.filter((a: ConnectedAccount) => a.isConnected)
        setAccounts(connectedAccounts)
        
        // Log storage account status for debugging
        connectedAccounts.forEach((account: ConnectedAccount) => {
          console.log(`Storage Account: ${account.provider} - Status: ${account.storageStatus} - OAuth: ${account.hasValidOAuth}`)
        })
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
    const slug = sanitizeSlug(name)
    setFormData({ ...formData, name, slug })
    
    // Clear error if name is now valid
    if (name.trim() && error.includes("Portal name is required")) {
      setError("")
    }
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
    } else {
      // Validate slug format and content
      const slugValidation = validateSlug(formData.slug)
      if (!slugValidation.isValid) {
        validationErrors.push({ field: 'slug', tab: 'Identity', message: slugValidation.error || 'Invalid portal handle' })
      }
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
        const errorMessage = data.error || "Failed to create portal"
        setError(errorMessage)
        
        // Handle specific error types and redirect to appropriate sections
        if (data.code === 'INVALID_SLUG' || data.code === 'SLUG_TAKEN' || 
            errorMessage.toLowerCase().includes('slug') ||
            errorMessage.toLowerCase().includes('handle')) {
          setActiveTab('Identity')
        } else if (errorMessage.toLowerCase().includes('storage') || 
            errorMessage.toLowerCase().includes('account') ||
            errorMessage.toLowerCase().includes('connect')) {
          setActiveTab('Storage')
        }
        
        posthog.captureException(new Error(errorMessage));
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
        className="group inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-medium text-sm mb-8"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Dashboard
      </Link>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Navigation Sidebar */}
        <aside className="lg:w-64 flex-shrink-0">
          <div className="mb-6 px-2">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">New Portal</h1>
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
                  <div className="p-6 border-b border-border bg-muted/30 flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">
                        {activeTab}
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Manage settings for this section.
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {loading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
                      {activeTab !== 'Identity' && (
                        <button
                          type="button"
                          onClick={() => {
                            const tabs = ['Identity', 'Branding', 'Storage', 'Security', 'Messaging']
                            const currentIndex = tabs.indexOf(activeTab)
                            if (currentIndex > 0) {
                              setActiveTab(tabs[currentIndex - 1])
                            }
                          }}
                          className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                          title="Return to Previous Section"
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-8 space-y-8">
                    {activeTab === 'Identity' && (
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-semibold text-foreground mb-2">
                            Portal Name
                          </label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            placeholder="e.g. Project Delivery Materials"
                            className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:bg-card focus:ring-2 focus:ring-ring transition-all outline-none font-medium text-foreground"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-foreground mb-2">
                            Permanent Handle
                          </label>
                          <div className="flex items-stretch shadow-sm rounded-xl">
                            <div className="px-4 flex items-center bg-muted border border-r-0 border-border rounded-l-xl text-muted-foreground text-sm font-medium">
                              /p/
                            </div>
                            <input
                              type="text"
                              value={formData.slug}
                              onChange={(e) => {
                                const newSlug = sanitizeSlug(e.target.value)
                                setFormData({ ...formData, slug: newSlug })
                                // Clear error if slug is now valid
                                const validation = validateSlug(newSlug)
                                if (validation.isValid && error.includes("Portal handle")) {
                                  setError("")
                                }
                              }}
                              placeholder="custom-address"
                              className={`flex-1 px-4 py-3 bg-card border border-border rounded-r-xl focus:ring-2 focus:ring-ring transition-all outline-none font-medium text-foreground ${
                                formData.slug && !validateSlug(formData.slug).isValid ? 'border-red-300 focus:ring-red-500' : ''
                              }`}
                              pattern="[a-z0-9-]+"
                              required
                            />
                          </div>
                          {formData.slug && !validateSlug(formData.slug).isValid && (
                            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                              <AlertCircle className="w-4 h-4" />
                              {validateSlug(formData.slug).error}
                            </p>
                          )}
                          {formData.slug && validateSlug(formData.slug).isValid && (
                            <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" />
                              Valid portal handle
                            </p>
                          )}
                        </div>

                        <div className="pt-4 flex justify-between">
                          <div></div>
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => setActiveTab('Messaging')}
                              className="px-4 py-2.5 border border-border text-muted-foreground rounded-xl font-bold text-sm hover:bg-muted transition-colors"
                            >
                              Jump to Finish
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveTab('Branding')}
                              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors"
                            >
                              Next: Branding
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'Branding' && (
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-semibold text-foreground mb-4">
                            Portal Logo
                          </label>
                          <ImageUpload
                            currentImage={formData.logoUrl}
                            onImageChange={(url) => setFormData({ ...formData, logoUrl: url })}
                            type="logo"
                            size="lg"
                            className="mb-2"
                          />
                        </div>

                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold text-foreground">Colors</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ColorPicker
                              label="Primary Color"
                              value={formData.primaryColor}
                              onChange={(value) => setFormData({ ...formData, primaryColor: value })}
                            />

                            <ColorPicker
                              label="Text Color"
                              value={formData.textColor}
                              onChange={(value) => setFormData({ ...formData, textColor: value })}
                            />

                            <ColorPicker
                              label="Background"
                              value={formData.backgroundColor || "#ffffff"}
                              onChange={(value) => setFormData({ ...formData, backgroundColor: value })}
                            />

                            <ColorPicker
                              label="Card Background"
                              value={formData.cardBackgroundColor}
                              onChange={(value) => setFormData({ ...formData, cardBackgroundColor: value })}
                            />
                          </div>
                        </div>

                        <div className="pt-4 flex justify-between">
                          <div></div>
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => setActiveTab('Messaging')}
                              className="px-4 py-2.5 border border-border text-muted-foreground rounded-xl font-bold text-sm hover:bg-muted transition-colors"
                            >
                              Jump to Finish
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveTab('Storage')}
                              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors"
                            >
                              Next: Storage
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'Storage' && (
                      <div className="space-y-8">
                        {/* Storage Account Status Warning */}
                        {accounts.length > 0 && accounts.some(a => a.storageStatus !== 'ACTIVE') && (
                          <div className="bg-warning/10 border border-warning/20 rounded-xl p-4">
                            <div className="flex items-start gap-3">
                              <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                              <div>
                                <h4 className="font-semibold text-foreground mb-1">Storage Account Issues Detected</h4>
                                <p className="text-sm text-muted-foreground mb-3">
                                  Some of your storage accounts have connection issues. This may affect portal functionality.
                                </p>
                                <div className="space-y-2">
                                  {accounts.filter(a => a.storageStatus !== 'ACTIVE').map(account => (
                                    <div key={account.provider} className="flex items-center gap-2 text-sm">
                                      <div className={`w-2 h-2 rounded-full ${
                                        account.storageStatus === 'DISCONNECTED' ? 'bg-red-500' :
                                        account.storageStatus === 'ERROR' ? 'bg-orange-500 animate-pulse' :
                                        'bg-yellow-500'
                                      }`} />
                                      <span className="font-medium">{account.provider === 'google' ? 'Google Drive' : 'Dropbox'}:</span>
                                      <span className="text-muted-foreground">
                                        {account.storageStatus === 'DISCONNECTED' ? 'Disconnected - needs reconnection' :
                                         account.storageStatus === 'ERROR' ? 'Connection error - may resolve automatically' :
                                         'Inactive - not available for new uploads'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                                <div className="mt-3 pt-3 border-t border-warning/20">
                                  <button
                                    type="button"
                                    onClick={runStorageHealthCheck}
                                    disabled={isRunningHealthCheck}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-warning/10 hover:bg-warning/20 border border-warning/30 rounded-lg text-xs font-medium text-warning-foreground transition-colors disabled:opacity-50"
                                  >
                                    <RefreshCw className={`w-3 h-3 ${isRunningHealthCheck ? 'animate-spin' : ''}`} />
                                    {isRunningHealthCheck ? 'Running Health Check...' : 'Run Storage Health Check'}
                                  </button>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Visit <strong>Settings → Connected Accounts</strong> to fix these issues manually.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          {[
                            { id: "google_drive", name: "Google Drive", icon: Cloud, disabled: !accounts.find(a => a.provider === "google" && a.storageStatus === "ACTIVE") },
                            { id: "dropbox", name: "Dropbox", icon: Cloud, disabled: !accounts.find(a => a.provider === "dropbox" && a.storageStatus === "ACTIVE") }
                          ].map((provider) => {
                            const Icon = provider.icon;
                            const isActive = formData.storageProvider === provider.id;
                            const account = accounts.find(a => (a.provider === "google" ? "google_drive" : "dropbox") === provider.id);
                            const hasAccount = !!account;
                            const isAccountActive = account?.storageStatus === "ACTIVE";
                            
                            return (
                              <button
                                key={provider.id}
                                type="button"
                                disabled={provider.disabled}
                                onClick={() => selectStorageProvider(provider.id as any)}
                                className={`relative p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${isActive
                                  ? "border-primary bg-muted"
                                  : "border-border bg-card hover:border-muted-foreground hover:bg-muted"
                                  } ${provider.disabled ? "opacity-40 grayscale cursor-not-allowed" : ""}`}
                              >
                                <div className={`p-3 rounded-xl ${isActive ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground"}`}>
                                  <Icon className="w-6 h-6" />
                                </div>
                                <div className="text-center">
                                  <span className="font-bold text-sm text-foreground block">{provider.name}</span>
                                  {hasAccount && (
                                    <div className="flex items-center justify-center gap-1 mt-1">
                                      <div className={`w-1.5 h-1.5 rounded-full ${
                                        account.storageStatus === 'ACTIVE' ? 'bg-green-500' :
                                        account.storageStatus === 'DISCONNECTED' ? 'bg-red-500' :
                                        account.storageStatus === 'ERROR' ? 'bg-orange-500 animate-pulse' :
                                        'bg-yellow-500'
                                      }`} />
                                      <span className={`text-xs font-medium ${
                                        account.storageStatus === 'ACTIVE' ? 'text-green-600' :
                                        account.storageStatus === 'DISCONNECTED' ? 'text-red-600' :
                                        account.storageStatus === 'ERROR' ? 'text-orange-600' :
                                        'text-yellow-600'
                                      }`}>
                                        {account.storageStatus === 'ACTIVE' ? 'Ready' :
                                         account.storageStatus === 'DISCONNECTED' ? 'Disconnected' :
                                         account.storageStatus === 'ERROR' ? 'Error' :
                                         'Inactive'}
                                      </span>
                                    </div>
                                  )}
                                  {!hasAccount && (
                                    <span className="text-xs text-muted-foreground mt-1 block">Not connected</span>
                                  )}
                                </div>
                                {isActive && (
                                  <CheckCircle2 className="absolute top-3 right-3 w-5 h-5 text-foreground" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Health Check Results */}
                        {healthCheckResults && (
                          <div className={`rounded-xl p-4 border ${
                            healthCheckResults.success 
                              ? 'bg-success/10 border-success/20' 
                              : 'bg-destructive/10 border-destructive/20'
                          }`}>
                            <div className="flex items-start gap-3">
                              {healthCheckResults.success ? (
                                <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                              ) : (
                                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                              )}
                              <div>
                                <h4 className="font-semibold text-foreground mb-1">
                                  {healthCheckResults.success ? 'Health Check Complete' : 'Health Check Failed'}
                                </h4>
                                {healthCheckResults.success ? (
                                  <p className="text-sm text-muted-foreground">
                                    Checked {healthCheckResults.checkedAccounts || 0} accounts, 
                                    created {healthCheckResults.createdAccounts || 0} new accounts.
                                    {healthCheckResults.createdAccounts > 0 && ' Storage accounts have been automatically created.'}
                                  </p>
                                ) : (
                                  <p className="text-sm text-muted-foreground">
                                    {healthCheckResults.error || 'Unknown error occurred during health check.'}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="bg-muted border border-border rounded-2xl overflow-hidden">
                          <div className="px-5 py-4 border-b border-border bg-muted/50 flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Navigation Tree</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsCreatingFolder(true)
                                  setNewFolderName(formData.name || "New Portal Folder")
                                }}
                                className="flex items-center gap-1.5 px-3 py-1 bg-card border border-border rounded-lg text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-all shadow-sm"
                              >
                                <FolderOpen className="w-3 h-3 text-warning" />
                                New Folder
                              </button>
                            </div>

                            {/* Breadcrumbs */}
                            <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
                              <button
                                type="button"
                                onClick={() => selectStorageProvider(formData.storageProvider)}
                                className="p-1.5 hover:bg-card rounded-md transition-colors"
                              >
                                <Cloud className="w-3.5 h-3.5 text-muted-foreground" />
                              </button>
                              {folderPath.map((folder, idx) => (
                                <div key={folder.id} className="flex items-center gap-1 shrink-0">
                                  <ChevronRight className="w-3 h-3 text-muted" />
                                  <button
                                    type="button"
                                    onClick={() => navigateToBreadcrumb(idx)}
                                    className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${idx === folderPath.length - 1
                                      ? "bg-primary text-primary-foreground"
                                      : "text-muted-foreground hover:bg-card hover:text-foreground"
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
                                  className="absolute inset-x-0 top-0 z-10 p-4 bg-card border-b border-border shadow-xl"
                                >
                                  <div className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Creation Module</h4>
                                      <button onClick={() => setIsCreatingFolder(false)} className="text-muted-foreground hover:text-foreground">
                                        <ArrowLeft className="w-3.5 h-3.5 rotate-90" />
                                      </button>
                                    </div>
                                    <div className="flex gap-2">
                                      <input
                                        autoFocus
                                        value={newFolderName}
                                        onChange={(e) => setNewFolderName(e.target.value)}
                                        placeholder="Enter folder identifier..."
                                        className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm font-semibold focus:ring-2 focus:ring-ring outline-none text-foreground"
                                        onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                                      />
                                      <button
                                        type="button"
                                        onClick={handleCreateFolder}
                                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors"
                                      >
                                        Create
                                      </button>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            <div className="max-h-72 overflow-y-auto p-2 bg-card">
                              {loadingFolders ? (
                                <div className="py-12 flex flex-col items-center justify-center gap-3">
                                  <Loader2 className="w-6 h-6 animate-spin text-muted" />
                                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Syncing Directory...</p>
                                </div>
                              ) : folders.length === 0 ? (
                                <div className="py-12 flex flex-col items-center justify-center gap-2">
                                  <div className="p-3 bg-muted rounded-full">
                                    <FolderOpen className="w-5 h-5 text-muted" />
                                  </div>
                                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest italic">Sector is empty</p>
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

                          <div className="px-5 py-3 border-t border-border bg-muted/50">
                            <label className="flex items-center gap-3 cursor-pointer group">
                              <div className="relative flex items-center">
                                <input
                                  type="checkbox"
                                  checked={formData.useClientFolders}
                                  onChange={(e) => setFormData({ ...formData, useClientFolders: e.target.checked })}
                                  className="peer sr-only"
                                />
                                <div className="w-10 h-5 bg-muted-foreground/20 rounded-full peer peer-checked:bg-primary transition-colors" />
                                <div className="absolute left-1 top-1 w-3 h-3 bg-card rounded-full peer-checked:translate-x-5 transition-transform" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">Client Isolation Mode</span>
                                <span className="text-[9px] text-muted-foreground font-medium">Automatic sub-directory generation for each transmission</span>
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
                              className="px-4 py-2.5 border border-border text-muted-foreground rounded-xl font-bold text-sm hover:bg-muted transition-colors"
                            >
                              Jump to Finish
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveTab('Security')}
                              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors"
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
                            <label className="block text-sm font-semibold text-foreground mb-3">Max Payload (MB)</label>
                            
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
                                  onClick={() => {
                                    setFormData({ ...formData, maxFileSize: template.size })
                                    // Clear error when selecting a template
                                    if (error.includes("Maximum file size must be specified")) {
                                      setError("")
                                    }
                                  }}
                                  className={`p-3 rounded-xl border text-center transition-all ${
                                    formData.maxFileSize === template.size
                                      ? "border-primary bg-primary text-primary-foreground shadow-md"
                                      : "border-border bg-card text-muted-foreground hover:border-muted-foreground"
                                  }`}
                                >
                                  <div className="font-bold text-lg">{template.size}MB</div>
                                  <div className="text-[10px] font-bold uppercase tracking-wider opacity-75">{template.label}</div>
                                  <div className="text-[9px] opacity-60 mt-1">{template.description}</div>
                                </button>
                              ))}
                            </div>

                            <div className="relative">
                              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <input
                                type="number"
                                value={formData.maxFileSize}
                                onChange={(e) => {
                                  const newSize = e.target.value === '' ? 0 : parseInt(e.target.value) || 0
                                  setFormData({ ...formData, maxFileSize: newSize })
                                  // Clear error if file size is now valid
                                  if (newSize > 0 && error.includes("Maximum file size must be specified")) {
                                    setError("")
                                  }
                                }}
                                placeholder="Custom size..."
                                className={`w-full pl-10 pr-4 py-3 bg-card border rounded-xl focus:ring-2 focus:ring-ring transition-all outline-none font-semibold text-foreground ${!formData.maxFileSize ? 'border-warning' : 'border-border'}`}
                              />
                            </div>
                            {!formData.maxFileSize && (
                              <p className="text-[10px] text-warning font-bold uppercase tracking-wider mt-1.5 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Please specify a capacity limit
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-foreground mb-2">Access Passkey</label>
                            <div className="relative">
                              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="Set new key..."
                                className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl focus:ring-2 focus:ring-ring transition-all outline-none font-semibold text-foreground"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Client Data Requirements</label>
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
                                  ? "border-primary bg-primary text-primary-foreground shadow-md"
                                  : "border-border bg-card text-muted-foreground hover:border-muted-foreground"
                                  }`}
                              >
                                {req.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-foreground mb-2">
                            Allowed File Types
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-muted p-4 rounded-xl border border-border">
                            {FILE_TYPE_OPTIONS.map((opt) => {
                              const isSelected = formData.allowedFileTypes.includes(opt.value);
                              return (
                                <label key={opt.value} className="flex items-center gap-3 p-2 rounded-lg hover:bg-card cursor-pointer transition-colors">
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
                                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                                  />
                                  <span className={`text-sm font-medium ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
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
                              className="px-4 py-2.5 border border-border text-muted-foreground rounded-xl font-bold text-sm hover:bg-muted transition-colors"
                            >
                              Jump to Finish
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveTab('Messaging')}
                              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors"
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
                          <label className="block text-sm font-semibold text-foreground mb-2">
                            Welcome Message
                          </label>
                          <textarea
                            value={formData.welcomeMessage}
                            onChange={(e) => setFormData({ ...formData, welcomeMessage: e.target.value })}
                            placeholder="Welcome! Please upload your documents for review."
                            rows={3}
                            className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:bg-card focus:ring-2 focus:ring-ring transition-all outline-none font-medium text-foreground placeholder:text-muted-foreground resize-none"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-semibold text-foreground mb-2">
                              Submit Button Label
                            </label>
                            <input
                              type="text"
                              value={formData.submitButtonText}
                              onChange={(e) => setFormData({ ...formData, submitButtonText: e.target.value })}
                              className="w-full px-4 py-3 bg-card border border-border rounded-xl focus:ring-2 focus:ring-ring transition-all outline-none font-semibold text-foreground"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-foreground mb-2">
                              Success Message
                            </label>
                            <input
                              type="text"
                              value={formData.successMessage}
                              onChange={(e) => setFormData({ ...formData, successMessage: e.target.value })}
                              className="w-full px-4 py-3 bg-card border border-border rounded-xl focus:ring-2 focus:ring-ring transition-all outline-none font-semibold text-foreground"
                            />
                          </div>
                        </div>

                        <div className="bg-primary rounded-xl p-6 text-primary-foreground shadow-lg">
                          <div className="flex items-start gap-4">
                            <div className="p-2 bg-primary-foreground/10 rounded-lg">
                              <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="font-bold text-lg">Ready to Create?</h4>
                              <p className="text-primary-foreground/80 text-sm mt-1 leading-relaxed">
                                Your new portal will be accessible at <strong className="text-primary-foreground">/p/{formData.slug || "..."}</strong> and linked to your selected storage.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="pt-6 border-t border-border flex justify-end gap-3">
                          <Link
                            href="/dashboard"
                            className="px-6 py-3 border border-border rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all font-bold text-sm"
                          >
                            Cancel
                          </Link>
                          <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all shadow-md active:scale-95 disabled:opacity-50 font-bold text-sm"
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

            {/* Error Toast */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-3 text-destructive text-sm font-bold"
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