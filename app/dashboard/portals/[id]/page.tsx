"use client"

import { useState, useRef, useEffect } from "react"
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
  ChevronDown,
  Eye,
  Type,
  ExternalLink,
  Copy,
  Info
} from "lucide-react"
import ColorPicker from "@/components/ui/ColorPicker"
import StorageSelector from "@/components/ui/StorageSelector"
import FolderTree from "@/components/ui/FolderTree"
import Breadcrumb from "@/components/ui/Breadcrumb"
import FileConstraints from "@/components/ui/FileConstraints"

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
interface FolderNodeProps {
  folder: StorageFolder & { subfolders?: StorageFolder[] }
  navigateToFolder: (folder: StorageFolder) => void
  expandedFolders: Set<string>
  toggleFolder: (id: string) => void
}

const FolderNode: React.FC<FolderNodeProps> = ({ folder, navigateToFolder, expandedFolders, toggleFolder }) => {
  const isExpanded = expandedFolders.has(folder.id)
  const { subfolders = [] } = folder

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

        {subfolders.length > 0 && (
          <button
            type="button"
            onClick={() => toggleFolder(folder.id)}
            className="p-1 hover:bg-slate-200 rounded-md transition-colors"
          >
            <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
          </button>
        )}
      </div>

      {isExpanded && subfolders.length > 0 && (
        <div className="pl-4 border-l border-slate-100 ml-2">
          {subfolders.map((sub) => (
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

export default function EditPortalPage() {
  const router = useRouter()
  const params = useParams()
  const portalId = params.id as string

  // State for dropdown visibility
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Folder section toggle
  const [folderSectionOpen, setFolderSectionOpen] = useState(false)
  const [colorSectionOpen, setColorSectionOpen] = useState(true) // Default open
  const [activeTab, setActiveTab] = useState('Portal Details')

  const [portal, setPortal] = useState<Portal | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // Connected accounts
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([])

  // Folder selection
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [folderPath, setFolderPath] = useState<StorageFolder[]>([])
  const [loadingFolders, setLoadingFolders] = useState(false)
  const [folders, setFolders] = useState<StorageFolder[]>([])

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
    maxFileSize: 200 as number | string,
    storageProvider: "google_drive" as "google_drive" | "dropbox",
    storageFolderId: "",
    storageFolderPath: "",
    useClientFolders: false,
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

  const DEFAULT_LOGOS = [
    { label: "No Logo", value: "" },
    { label: "Secure Hub Logo", value: "https://via.placeholder.com/150x50/3b82f6/ffffff?text=Secure+Hub" },
    { label: "Upload Icon", value: "https://via.placeholder.com/150x50/10b981/ffffff?text=Upload" },
    { label: "Generic Logo", value: "https://via.placeholder.com/150x50/6b7280/ffffff?text=Logo" },
  ]
  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) newSet.delete(id)
      else newSet.add(id)
      return newSet
    })
  }


  useEffect(() => {
    fetchPortal()
    fetchAccounts()
  }, [portalId])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


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
          useClientFolders: data.useClientFolders || false,
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
      const rootRes = await fetch(`/api/storage/folders?provider=${provider}&rootOnly=true`)
      if (rootRes.ok) {
        const rootFolder = await rootRes.json()
        setFolderPath([rootFolder])
        setFormData(prev => ({
          ...prev,
          storageFolderId: rootFolder.id,
          storageFolderPath: rootFolder.path
        }))
        await fetchFolders(provider, rootFolder.id)
      }
    } catch (error) {
      console.error("Error initializing storage:", error)
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
        await fetchFolders(formData.storageProvider, parentId)
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
    setFormData(prev => ({
      ...prev,
      storageFolderId: folder.id,
      storageFolderPath: newPath.map(f => f.name).join('/'),
    }))
    fetchFolders(formData.storageProvider, folder.id)
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
          maxFileSize: Number(formData.maxFileSize) * 1024 * 1024,
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
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Top Bar Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <Link
          href="/dashboard"
          className="group inline-flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors font-medium text-sm"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href={`/p/${portal.slug}`}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all text-xs font-bold uppercase tracking-wide shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Live Preview
          </Link>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center justify-center p-2.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl transition-all"
            title="Delete Portal"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Navigation Sidebar */}
        <aside className="lg:w-64 flex-shrink-0">
          <div className="mb-6 px-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Configuration</h1>
            <p className="text-slate-500 text-sm mt-1 font-mono">{portal.slug}</p>
          </div>
          <nav className="space-y-1">
            {[
              { id: 'Portal Details', icon: Type, label: 'Details' },
              { id: 'Branding', icon: Palette, label: 'Branding' },
              { id: 'Storage & Files', icon: Cloud, label: 'Storage' },
              { id: 'Access & Security', icon: Lock, label: 'Security' },
              { id: 'Messages', icon: Settings2, label: 'Messages' }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                    ? "bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                    }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600"}`} />
                  <span className="font-medium text-sm">{tab.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="edit-portal-active-indicator"
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
                      <h2 className="text-xl font-semibold text-slate-900">
                        {activeTab}
                      </h2>
                      <p className="text-sm text-slate-500 mt-1">
                        Manage settings for this section.
                      </p>
                    </div>
                    {saving && <Loader2 className="w-5 h-5 animate-spin text-slate-400" />}
                  </div>

                  <div className="p-8 space-y-8">
                    {/* Tab Content */}
                    {activeTab === 'Portal Details' && (
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Portal Name</label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 transition-all outline-none font-medium text-slate-900 dark:text-slate-100"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Permanent Handle</label>
                          <div className="flex items-center px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl opacity-75 cursor-not-allowed">
                            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider mr-2">/p/</span>
                            <span className="text-slate-900 dark:text-slate-100 font-mono text-sm font-bold">{portal.slug}</span>
                            <Lock className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                          </div>
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
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Logo Link</label>
                          <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                            {DEFAULT_LOGOS.map((logo) => (
                              logo.value && (
                                <button
                                  key={logo.value}
                                  type="button"
                                  onClick={() => setFormData({ ...formData, logoUrl: logo.value })}
                                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-xs font-medium whitespace-nowrap transition-colors text-slate-900 dark:text-slate-100"
                                >
                                  {logo.label}
                                </button>
                              )
                            ))}
                          </div>
                          <input
                            type="url"
                            value={formData.logoUrl}
                            onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                            placeholder="https://..."
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-medium text-slate-900 placeholder:text-slate-400"
                          />
                        </div>

                        <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Color Palette</h3>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 transition-all outline-none font-mono text-sm uppercase"
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
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 transition-all outline-none font-mono text-sm uppercase"
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
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 transition-all outline-none font-mono text-sm uppercase"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase">Primary Accent</label>
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
                          </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setActiveTab('Storage & Files')}
                            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
                          >
                            Next: Storage
                          </button>
                        </div>
                      </div>
                    )}

                    {activeTab === 'Storage & Files' && (
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
                          <div className="px-5 py-4 border-b border-slate-200 bg-slate-100/50 flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Navigation Tree</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsCreatingFolder(true)
                                  setNewFolderName(formData.name || "New Portal Folder")
                                }}
                                className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm"
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
                                className="p-1.5 hover:bg-white rounded-md transition-colors"
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
                                      : "text-slate-500 hover:bg-white hover:text-slate-900"
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
                                  className="absolute inset-x-0 top-0 z-10 p-4 bg-white border-b border-slate-100 shadow-xl"
                                >
                                  <div className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Creation Module</h4>
                                      <button onClick={() => setIsCreatingFolder(false)} className="text-slate-400 hover:text-slate-600">
                                        <ArrowLeft className="w-3.5 h-3.5 rotate-90" />
                                      </button>
                                    </div>
                                    <div className="flex gap-2">
                                      <input
                                        autoFocus
                                        value={newFolderName}
                                        onChange={(e) => setNewFolderName(e.target.value)}
                                        placeholder="Enter folder identifier..."
                                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-slate-900 outline-none"
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

                            <div className="max-h-72 overflow-y-auto p-2 bg-white">
                              {loadingFolders ? (
                                <div className="py-12 flex flex-col items-center justify-center gap-3">
                                  <Loader2 className="w-6 h-6 animate-spin text-slate-200" />
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Syncing Directory...</p>
                                </div>
                              ) : folders.length === 0 ? (
                                <div className="py-12 flex flex-col items-center justify-center gap-2">
                                  <div className="p-3 bg-slate-50 rounded-full">
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

                          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                            <label className="flex items-center gap-3 cursor-pointer group">
                              <div className="relative flex items-center">
                                <input
                                  type="checkbox"
                                  checked={formData.useClientFolders}
                                  onChange={(e) => setFormData({ ...formData, useClientFolders: e.target.checked })}
                                  className="peer sr-only"
                                />
                                <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:bg-slate-900 transition-colors" />
                                <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full peer-checked:translate-x-5 transition-transform" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider group-hover:text-slate-900 transition-colors">Client Isolation Mode</span>
                                <span className="text-[9px] text-slate-400 font-medium">Automatic sub-directory generation for each transmission</span>
                              </div>
                            </label>
                          </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setActiveTab('Access & Security')}
                            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
                          >
                            Next: Security
                          </button>
                        </div>
                      </div>
                    )}

                    {activeTab === 'Access & Security' && (
                      <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Max Payload (MB)</label>
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
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Access Passkey</label>
                            <div className="relative">
                              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <input
                                type="password"
                                value={formData.newPassword}
                                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                placeholder={hasPassword ? "Change existing key..." : "Set new key..."}
                                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 transition-all outline-none font-semibold text-slate-900"
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
                                setError("Please provide a valid payload limit before proceeding.");
                                return;
                              }
                              setActiveTab('Messages');
                            }}
                            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
                          >
                            Next: Messages
                          </button>
                        </div>
                      </div>
                    )}

                    {activeTab === 'Messages' && (
                      <div className="space-y-8">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Welcome Note</label>
                          <textarea
                            value={formData.welcomeMessage}
                            onChange={(e) => setFormData({ ...formData, welcomeMessage: e.target.value })}
                            placeholder="Welcome! Please submit your assets for processing."
                            rows={3}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-medium text-slate-900 placeholder:text-slate-400 resize-none"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Button Label</label>
                            <input
                              type="text"
                              value={formData.submitButtonText}
                              onChange={(e) => setFormData({ ...formData, submitButtonText: e.target.value })}
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 transition-all outline-none font-semibold text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Success Note</label>
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
                              <Info className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="font-bold text-lg">Live Synchronization</h4>
                              <p className="text-slate-300 text-sm mt-1 leading-relaxed">
                                Changes saved here are immediately reflected on your live portal at <strong className="text-white">/p/{portal.slug}</strong>.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                          <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-md active:scale-95 disabled:opacity-50 font-bold text-sm"
                          >
                            {saving ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Save className="w-4 h-4" />
                                Save Changes
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Feedback Toasts */}
            <div className="fixed bottom-8 right-8 flex flex-col gap-2 z-50">
              <AnimatePresence>
                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-700 text-sm font-bold shadow-xl"
                  >
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    {success}
                  </motion.div>
                )}

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold shadow-xl"
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </form>
        </main>
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
