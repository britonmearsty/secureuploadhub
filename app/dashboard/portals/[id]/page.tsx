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
  folder: StorageFolder & { subfolders?: StorageFolder[] } // include subfolders
  navigateToFolder: (folder: StorageFolder) => void
  expandedFolders: Set<string>
  toggleFolder: (id: string) => void
  level?: number // optional, default = 0
}

const FolderNode: React.FC<FolderNodeProps> = ({ folder, navigateToFolder, expandedFolders, toggleFolder, level = 0 }) => {
  const isExpanded = expandedFolders.has(folder.id)
  const { subfolders = [] } = folder  // <-- default to empty array

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

      {isExpanded && subfolders.length > 0 && (
        <div className="pl-4 border-l border-slate-100">
          {subfolders.map((sub) => (
            <FolderNode
              key={sub.id}
              folder={sub}
              navigateToFolder={navigateToFolder}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              level={level + 1}
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

// FILE_TYPE_OPTIONS is already defined in EditPortalPage


  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  // Folder section toggle
  const [folderSectionOpen, setFolderSectionOpen] = useState(false)
  const [colorSectionOpen, setColorSectionOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('Identity')



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
    <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
    {/* Portal Info */}
    <div>
      <Link
        href="/dashboard"
        className="group inline-flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Dashboard
      </Link>

      <div className="flex items-center gap-2 mt-2">
        <div className="p-2 bg-slate-900 rounded-xl shadow-lg shadow-slate-200">
          <Settings2 className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Portal Configuration
        </h1>
      </div>

      <p className="text-slate-400 mt-1 text-xs font-semibold uppercase tracking-widest">
        Registry ID: <span className="text-slate-900 font-mono">{portal.id.slice(0, 8)}</span>
      </p>
    </div>

    {/* Actions */}
    <div className="flex items-center gap-2 mt-2 md:mt-0">
      <Link
        href={`/p/${portal.slug}`}
        target="_blank"
        className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-900 rounded-xl hover:bg-slate-50 transition-all text-xs font-bold uppercase tracking-wide shadow-sm"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        Preview Live
      </Link>

      <button
        onClick={() => setShowDeleteModal(true)}
        className="flex items-center justify-center p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl transition-all"
        title="Decommission Portal"
      >
        <Trash2 className="w-4.5 h-4.5" />
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
            <div className="flex border-b border-slate-200 mb-6">
              {['Identity', 'Branding', 'Storage', 'Security', 'Messaging'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 font-semibold text-sm uppercase tracking-wide transition-all hover:scale-105 ${activeTab === tab ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-400 hover:text-slate-900'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
            {/* Field Set: Identity */}
            <section className="space-y-6">
  <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
    <Type className="w-4 h-4 text-slate-400" />
    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Identity & Branding</h3>
  </div>

  <div className="space-y-6">
    <div>
      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Portal Name</label>
      <input
        type="text"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-bold text-slate-900"
        required
      />
    </div>


                <div>
  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Permanent Handle</label>
  <div className="flex items-center px-4 py-3 bg-slate-100 border border-slate-200 rounded-2xl opacity-60 cursor-not-allowed">
    <span className="text-slate-400 text-xs font-bold uppercase tracking-widest mr-2">Handle:</span>
    <span className="text-slate-900 font-mono text-sm">{portal.slug}</span>
    <Lock className="w-3.5 h-3.5 text-slate-300 ml-auto" />
  </div>
  <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-tight">Handles cannot be modified after registration.</p>
</div>

<div>
  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Accent Color</label>
  <div className="flex items-center gap-3">
    <div className="relative">
      <input
        type="color"
        value={formData.primaryColor}
        onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
        className="w-12 h-12 rounded-2xl cursor-pointer border-4 border-white shadow-xl overflow-hidden shrink-0"
      />
      <div className="absolute inset-0 rounded-2xl border border-slate-200 pointer-events-none" />
    </div>
    <div className="flex-1 relative">
      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
      <input
        type="text"
        value={formData.primaryColor}
        onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-mono text-sm uppercase font-bold"
      />
    </div>
  </div>
</div>

              </div>
            </section>

            {/* Field Set: Visual Customization */}
            <section className="space-y-6">
  <div className="flex items-center gap-2 pb-3 border-b border-slate-50">
    <Palette className="w-4 h-4 text-slate-400" />
    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Branding</h3>
  </div>

  <div className="space-y-4">
    {/* Logo URL */}
    <div>
      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Logo Link</label>
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Choose Default Logo</label>
        <select
          onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-medium mb-3"
        >
          {DEFAULT_LOGOS.map((logo) => (
            <option key={logo.value} value={logo.value}>{logo.label}</option>
          ))}
        </select>
      </div>
      <input
        type="url"
        value={formData.logoUrl}
        onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
        placeholder="https://..."
        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-medium placeholder:text-slate-300 text-sm"
      />
    </div>

   <button
     type="button"
     onClick={() => setColorSectionOpen(!colorSectionOpen)}
     className="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors cursor-pointer"
   >
     Manage Colors
   </button>
   <AnimatePresence>
     {colorSectionOpen && (
       <motion.div
         initial={{ opacity: 0, height: 0 }}
         animate={{ opacity: 1, height: "auto" }}
         exit={{ opacity: 0, height: 0 }}
         className="grid grid-cols-2 gap-3"
       >
         {/* Text Color */}
         <div>
           <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Text Color</label>
           <div className="flex items-center gap-2">
             <div className="relative w-12 h-12">
               <input
                 type="color"
                 value={formData.textColor}
                 onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                 className="w-full h-full rounded-xl cursor-pointer border-2 border-white shadow-sm overflow-hidden"
               />
             </div>
             <input
               type="text"
               value={formData.textColor}
               onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
               className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-mono text-sm uppercase"
             />
           </div>
         </div>

         {/* Background Color */}
         <div>
           <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Page BG</label>
           <div className="flex items-center gap-2">
             <div className="relative w-12 h-12">
               <input
                 type="color"
                 value={formData.backgroundColor || "#ffffff"}
                 onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                 className="w-full h-full rounded-xl cursor-pointer border-2 border-white shadow-sm overflow-hidden"
               />
             </div>
             <input
               type="text"
               value={formData.backgroundColor || ""}
               onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
               placeholder="#HEX"
               className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-mono text-sm uppercase"
             />
           </div>
         </div>

         {/* Card Color */}
         <div>
           <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Card BG</label>
           <div className="flex items-center gap-2">
             <div className="relative w-12 h-12">
               <input
                 type="color"
                 value={formData.cardBackgroundColor}
                 onChange={(e) => setFormData({ ...formData, cardBackgroundColor: e.target.value })}
                 className="w-full h-full rounded-xl cursor-pointer border-2 border-white shadow-sm overflow-hidden"
               />
             </div>
             <input
               type="text"
               value={formData.cardBackgroundColor}
               onChange={(e) => setFormData({ ...formData, cardBackgroundColor: e.target.value })}
               className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-mono text-sm uppercase"
             />
           </div>
         </div>
       </motion.div>
     )}
   </AnimatePresence>
              </div>
            </section>

            {/* Field Set: Messaging & Experience */}
<section className="space-y-6">
  <div className="flex items-center gap-2 pb-3 border-b border-slate-50">
    <Type className="w-4 h-4 text-slate-400" />
    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Message & Tone</h3>
  </div>

  <div className="space-y-4">
    <div>
      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Welcome Note</label>
      <textarea
        value={formData.welcomeMessage}
        onChange={(e) => setFormData({ ...formData, welcomeMessage: e.target.value })}
        placeholder="Welcome to our secure upload portal. Please submit your files below."
        rows={2}
        className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-medium placeholder:text-slate-300 resize-none"
      />
    </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div>
    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Action Button Label</label>
    <input
      type="text"
      value={formData.submitButtonText}
      onChange={(e) => setFormData({ ...formData, submitButtonText: e.target.value })}
      placeholder="Initialize Transfer"
      className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-medium"
    />
  </div>
  <div>
    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Success Note</label>
    <input
      type="text"
      value={formData.successMessage}
      onChange={(e) => setFormData({ ...formData, successMessage: e.target.value })}
      placeholder="Transmission Verified"
      className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-medium"
    />
  </div>
</div>

              </div>
            </section>
{/* Storage Section */}
<section className="space-y-2">
  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-2">
    <Cloud className="w-4 h-4" /> Storage Backbone
  </h3>

  {/* Storage Options */}
  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
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
          className={`relative p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 overflow-hidden ${
            isActive ? "border-slate-900 bg-slate-50/50 shadow-sm" : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
          } ${provider.disabled ? "opacity-40 grayscale cursor-not-allowed" : ""}`}
        >
          <div className={`p-2 rounded-xl ${isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400 transition-colors group-hover:bg-slate-200"}`}>
            <Icon className="w-5 h-5" />
          </div>
          <span className="font-semibold text-xs text-slate-900">{provider.name}</span>
        </button>
      );
    })}
  </div>

  {/* Folder Selection Section */}
  <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
    {/* Toggle */}
    <button
      type="button"
      onClick={() => setFolderSectionOpen(prev => !prev)}
      className="w-full px-2 py-1.5 flex justify-between items-center text-sm font-semibold text-slate-900 uppercase tracking-wide bg-white border-b border-slate-100 rounded-t-2xl hover:bg-slate-50 transition-colors"
    >
      <span>Current Folder: {formData.storageFolderPath || "SecureUploadHub"}</span>
      <ChevronRight className={`w-4 h-4 transition-transform ${folderSectionOpen ? "rotate-90" : ""}`} />
    </button>

    {/* Expandable Tree */}
    <AnimatePresence>
      {folderSectionOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto", transition: { duration: 0.2 } }}
          exit={{ opacity: 0, height: 0, transition: { duration: 0.15 } }}
          className="max-h-44 overflow-y-auto divide-y divide-slate-100/50 px-2"
        >
          {loadingFolders ? (
            <div className="p-2 text-center">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-300" />
            </div>
          ) : folders.length === 0 ? (
            <div className="p-2 text-center text-slate-400 text-sm font-medium">No subdirectories found</div>
          ) : (
            folders.map((folder) => (
              <FolderNode
                key={folder.id}
                folder={folder}
                navigateToFolder={navigateToFolder}
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
                level={0} // pass level for indentation
              />
            ))
          )}
        </motion.div>
      )}
    </AnimatePresence>

    {/* Footer */}
    <div className="p-1 bg-slate-900/5 text-[10px] font-semibold text-slate-500 uppercase tracking-wide text-center">
      Active Destination: <span className="text-slate-900">{formData.storageFolderPath || "SecureUploadHub"}</span>
    </div>
  </div>
</section>


            {/* Field Set: Rules */}
<section className="space-y-6">
  <div className="flex items-center gap-2 pb-3 border-b border-slate-50">
    <Settings2 className="w-4 h-4 text-slate-400" />
    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Security & Scale</h3>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Payload Limit (MB)</label>
      <input
        type="number"
        value={formData.maxFileSize}
        onChange={(e) => setFormData({ ...formData, maxFileSize: parseInt(e.target.value) || 100 })}
        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-bold"
      />
    </div>
    <div>
      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Access Passkey</label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
        <input
          type="password"
          value={formData.newPassword}
          onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
          placeholder={hasPassword ? "Roll to new key..." : "Establish encryption key..."}
          className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none font-bold"
        />
      </div>
    </div>
    </div>

           <div className="space-y-3">
  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Client Information Collection</label>
  <div className="flex gap-3">
    {[
      { id: 'name', label: 'Identity', key: 'requireClientName' },
      { id: 'email', label: 'E-Mail', key: 'requireClientEmail' }
    ].map(req => (
      <button
        key={req.id}
        type="button"
        onClick={() => setFormData(prev => ({ ...prev, [req.key]: !prev[req.key as keyof typeof prev] }))}
        className={`flex-1 px-3 py-2 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${
          formData[req.key as keyof typeof formData]
            ? "border-slate-900 bg-slate-900 text-white shadow-sm"
            : "border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200 hover:bg-white"
        }`}
      >
        {req.label}
      </button>
    ))}
  </div>
</div>

             <div className="relative space-y-2" ref={dropdownRef}>
  <button
    type="button"
    onClick={() => setDropdownOpen((prev) => !prev)}
    className="w-full text-left bg-white border border-slate-100 rounded-xl px-3 py-1.5 flex justify-between items-center text-sm font-semibold hover:border-slate-200 transition-colors"
  >
    {formData.allowedFileTypes.length === 0
      ? "File Categories"
      : `${formData.allowedFileTypes.length} categories enabled`}
    <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
  </button>

  {dropdownOpen && (
    <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-1.5 space-y-1 max-h-52 overflow-y-auto">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={formData.allowedFileTypes.length === FILE_TYPE_OPTIONS.length}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              allowedFileTypes: e.target.checked ? FILE_TYPE_OPTIONS.map((f) => f.value) : [],
            }))
          }
          className="w-4 h-4 rounded border-slate-300"
        />
        <span className="text-sm font-semibold">Enable All Categories</span>
      </label>

      <hr className="border-slate-100 my-1" />

      {FILE_TYPE_OPTIONS.map((opt) => {
        const isSelected = formData.allowedFileTypes.includes(opt.value);
        return (
          <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
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
              className="w-4 h-4 rounded border-slate-300"
            />
            <span className={`text-sm font-medium ${isSelected ? "text-slate-900" : "text-slate-500"}`}>
              {opt.label}
            </span>
          </label>
        );
      })}
    </div>
  )}
</div>

            </section>

            {/* Actions */}
<div className="flex gap-4 pt-4">
  <button
    type="submit"
    disabled={saving}
    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all shadow-sm disabled:opacity-50 font-bold text-xs uppercase tracking-wide active:scale-[0.97]"
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
        className="flex-1 overflow-y-auto p-8 flex flex-col items-center relative"
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
        <div className="w-full max-w-sm flex flex-col relative z-10 space-y-6">
          {/* Header Preview */}
          <div className="text-center mb-6">
            {formData.logoUrl ? (
              <div className="w-auto h-20 mx-auto mb-4 flex items-center justify-center">
                <img src={formData.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
              </div>
            ) : (
              <motion.div
                animate={{ backgroundColor: formData.primaryColor }}
                className="w-20 h-20 rounded-3xl mx-auto mb-4 flex items-center justify-center text-white text-3xl font-black shadow-md"
              >
                {formData.name ? formData.name.charAt(0).toUpperCase() : <Palette className="w-8 h-8" />}
              </motion.div>
            )}

            {formData.welcomeMessage && (
              <p className="mb-2 text-lg font-medium opacity-80" style={{ color: formData.textColor }}>
                {formData.welcomeMessage}
              </p>
            )}

            <h2 className="text-2xl font-black tracking-tight leading-tight" style={{ color: formData.textColor }}>
              {formData.name || "Untitled Portal"}
            </h2>

            {!formData.welcomeMessage && (
              <p className="text-sm mt-2 font-medium opacity-60" style={{ color: formData.textColor }}>
                {formData.description || "Enter portal description above to preview here."}
              </p>
            )}
          </div>

          {/* Password Warning if set */}
          {(hasPassword || formData.newPassword) && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Lock className="w-3 h-3 text-amber-500" />
              </div>
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Security Enabled</span>
            </div>
          )}

          {/* Form Fields Preview */}
          <div className="space-y-4 mb-6">
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
          <div className="border-2 border-dashed border-slate-200 rounded-[32px] p-8 flex flex-col items-center justify-center text-center group bg-slate-50/20">
            <div className="p-4 bg-white rounded-full mb-3 group-hover:scale-110 transition-transform">
              <Upload className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-sm font-bold text-slate-900 tracking-tight">Drop your assets</p>
            <p className="text-xs text-slate-400 mt-1 font-medium">Maximum volume available per file: {formData.maxFileSize} MB</p>
          </div>

          {/* CTA Preview */}
          <motion.div
            animate={{ backgroundColor: formData.primaryColor }}
            className="h-12 rounded-2xl mt-6 flex items-center justify-center text-sm font-black text-white uppercase tracking-widest shadow-lg"
          >
            {formData.submitButtonText || "Initialize Transfer"}
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
