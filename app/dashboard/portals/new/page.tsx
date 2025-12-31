"use client"

import { useState, useRef , useEffect } from "react"
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

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    primaryColor: "#0f172a", // Default to slate-900
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
          className="space-y-6"
        >
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-slate-900 rounded-xl">
                <Layout className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Portal Builder</span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">
  Create a New Workspace
</h1>
<p className="text-slate-500 mt-1 text-base">
  Set up a polished, secure space for sharing client documents.
</p>
</div>

<form onSubmit={handleSubmit} className="space-y-4">
  {/* Identity Group */}
  <section className="space-y-3">
    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
      <Type className="w-4 h-4" /> Identity & Presentation
    </h3>


             <div className="grid gap-3">
  <div>
    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
      Workspace Name
    </label>
    <input
      type="text"
      value={formData.name}
      onChange={(e) => handleNameChange(e.target.value)}
      placeholder="e.g. Project Delivery Materials"
      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900 transition-all outline-none font-medium placeholder:text-slate-300"
      required
    />
  </div>

  <div>
    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
      Access Address
    </label>
    <div className="flex items-stretch">
      <div className="px-4 flex items-center bg-slate-50 border border-r-0 border-slate-200 rounded-l-2xl text-slate-400 text-sm font-medium">
        /p/
      </div>
      <input
        type="text"
        value={formData.slug}
        onChange={(e) =>
          setFormData({ ...formData, slug: e.target.value.toLowerCase() })
        }
        placeholder="custom-address"
        className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-r-2xl focus:ring-2 focus:ring-slate-900 transition-all outline-none font-medium"
        pattern="[a-z0-9-]+"
        required
      />
    </div>
  </div>

  <div className="space-y-2 pt-2 border-t border-slate-100">
  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Brand Identity</h4>

  {/* Logo URL */}
  <div>
    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
      Logo Link
    </label>
    <input
      type="url"
      value={formData.logoUrl}
      onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
      placeholder="https://..."
      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 transition-all outline-none font-medium placeholder:text-slate-300 text-sm"
    />
  </div>

  <button
    type="button"
    onClick={() => setColorSectionOpen(!colorSectionOpen)}
    className="text-xs font-semibold text-slate-600 uppercase tracking-wide hover:text-slate-900 transition-colors cursor-pointer"
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
      {/* Primary Brand Color */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
          Primary Color
        </label>
        <div className="flex items-center gap-2">
          <div className="relative group w-10 h-10">
            <input
              type="color"
              value={formData.primaryColor}
              onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
              className="w-full h-full rounded-xl cursor-pointer border-2 border-white shadow-md overflow-hidden"
            />
          </div>
          <input
            type="text"
            value={formData.primaryColor}
            onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
            className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs uppercase"
          />
        </div>
      </div>
{/* Text Color */}
<div>
  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
    Text Color
  </label>
  <div className="flex items-center gap-2">
    <div className="relative group w-10 h-10">
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
      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs uppercase"
    />
  </div>
</div>
{/* Background Color */}
<div>
  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
    Background Color
  </label>
  <div className="flex items-center gap-2">
    <div className="relative group w-10 h-10">
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
      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs uppercase"
    />
  </div>
</div>

  {/* Card Background Color */}
<div>
  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
    Card Background Color
  </label>
  <div className="flex items-center gap-2">
    <div className="relative group w-10 h-10">
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
      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs uppercase"
    />
  </div>
</div>
 </motion.div>
    )}
   </AnimatePresence>
   </div>
   </div>
  </section>
                     

{/* Storage Section */}
<section className="space-y-3">
  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-2">
    <Cloud className="w-4 h-4" /> Storage Backbone
  </h3>

  {/* Storage Options */}
  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
    {[
      { id: "google_drive", name: "Google Drive", icon: Cloud, color: "emerald", disabled: !accounts.find(a => a.provider === "google") },
      { id: "dropbox", name: "Dropbox", icon: Cloud, color: "blue", disabled: !accounts.find(a => a.provider === "dropbox") }
    ].map((provider) => {
      const Icon = provider.icon;
      const isActive = formData.storageProvider === provider.id;
      return (
        <button
          key={provider.id}
          type="button"
          disabled={provider.disabled}
          onClick={() => selectStorageProvider(provider.id as any)}
          className={`relative p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1.5 overflow-hidden ${isActive
            ? "border-slate-900 bg-slate-50/50"
            : "border-slate-100 bg-white hover:border-slate-200"
          } ${provider.disabled ? "opacity-40 grayscale cursor-not-allowed" : ""}`}
        >
          <div className={`p-2 rounded-xl ${isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400 transition-colors group-hover:bg-slate-200"}`}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="font-semibold text-xs text-slate-900">{provider.name}</span>
          {isActive && (
            <motion.div layoutId="provider-check" className="absolute top-2 right-2">
              <CheckCircle2 className="w-4 h-4 text-slate-900" />
            </motion.div>
          )}
        </button>
      );
    })}
  </div>
            
{/* Folder Selection Section */}
<div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
  {/* Current Folder / Toggle */}
  <button
    type="button"
    onClick={() => setFolderSectionOpen(prev => !prev)}
    className="w-full px-3 py-2 flex justify-between items-center text-sm font-semibold text-slate-900 uppercase tracking-wide bg-white border-b border-slate-100 rounded-t-2xl hover:bg-slate-50 transition-colors"
  >
    <span>Current Folder: {formData.storageFolderPath || "Home Directory"}</span>
    <ChevronRight className={`w-4 h-4 transition-transform ${folderSectionOpen ? "rotate-90" : ""}`} />
  </button>

  {/* Expandable Tree */}
  <AnimatePresence>
    {folderSectionOpen && (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className="max-h-52 overflow-y-auto divide-y divide-slate-100"
      >
        {loadingFolders ? (
          <div className="p-4 text-center">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-300" />
          </div>
        ) : folders.length === 0 ? (
          <div className="p-4 text-center text-slate-400 text-sm font-medium">No subdirectories found</div>
        ) : (
          folders.map((folder) => (
            <FolderNode
              key={folder.id}
              folder={folder}
              navigateToFolder={navigateToFolder}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
            />
          ))
        )}
      </motion.div>
    )}
  </AnimatePresence>

  {/* Footer */}
  <div className="p-1.5 bg-slate-900/5 text-[10px] font-semibold text-slate-500 uppercase tracking-wide text-center">
    Selected: <span className="text-slate-900">{formData.storageFolderPath || "Home Directory"}</span>
  </div>
</div>
</section>
            
{/* Security & Parameters Section */}
<section className="space-y-4">
  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-2">
    <Settings2 className="w-4 h-4" /> Parameters & Security
  </h3>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
        Maximum File Size (MB)
      </label>
      <input
        type="number"
        value={formData.maxFileSize}
        onChange={(e) => setFormData({ ...formData, maxFileSize: parseInt(e.target.value) || 100 })}
        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 transition-all outline-none font-medium"
      />
    </div>

    <div>
      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
        Passkey Access
      </label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
        <input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          placeholder="Secure with password..."
          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 transition-all outline-none font-medium"
        />
      </div>
    </div>
  </div>

<div className="space-y-3">
  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
    Mandatory Metadata
  </label>
  <div className="flex gap-2">
    {[
      { id: 'name', label: 'Client Name', key: 'requireClientName' },
      { id: 'email', label: 'Client Email', key: 'requireClientEmail' }
    ].map(req => (
      <button
        key={req.id}
        type="button"
        onClick={() => setFormData(prev => ({ ...prev, [req.key]: !prev[req.key as keyof typeof prev] }))}
        className={`flex-1 px-3 py-2 rounded-xl border-2 font-semibold text-xs uppercase tracking-wide transition-all ${
          formData[req.key as keyof typeof formData]
            ? "border-slate-900 bg-slate-900 text-white"
            : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
        }`}
      >
        {req.label}
      </button>
    ))}
  </div>
</div>

<div className="relative space-y-2" ref={dropdownRef}>
  {/* Trigger Button */}
  <button
    type="button"
    onClick={() => setDropdownOpen((prev) => !prev)}
    className="w-full text-left bg-white border border-slate-100 rounded-xl px-3 py-2 flex justify-between items-center text-sm font-semibold hover:border-slate-200 transition-colors"
  >
    {formData.allowedFileTypes.length === 0
      ? "Allowed File Types"
      : `${formData.allowedFileTypes.length} file categories enabled`}
    <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
  </button>

  {/* Dropdown List */}
  {dropdownOpen && (
    <div className="absolute z-50 mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 space-y-1.5 max-h-52 overflow-y-auto">
      {/* Select All Option */}
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
        <span className="text-sm font-semibold">Select All File Types</span>
      </label>

      <hr className="border-slate-100 my-1.5" />

      {/* Individual File Type Options */}
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
{/* Info Message */}
<div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
  {formData.allowedFileTypes.length === 0
    ? "All file types permitted"
    : `${formData.allowedFileTypes.length} file categories enabled`}
</div>
</div>
</section>

{/* Messaging & Tone Section */}
<section className="space-y-4">
  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-2">
    <Settings2 className="w-4 h-4" /> Message & Tone
  </h3>

  <div className="space-y-3">
    <div>
      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
        Welcome Message
      </label>
      <textarea
        value={formData.welcomeMessage}
        onChange={(e) => setFormData({ ...formData, welcomeMessage: e.target.value })}
        placeholder="Welcome to our secure upload portal. Please submit your files below."
        rows={2}
        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 transition-all outline-none font-medium placeholder:text-slate-300 resize-none"
      />
    </div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div>
    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
      Submit Button Label
    </label>
    <input
      type="text"
      value={formData.submitButtonText}
      onChange={(e) => setFormData({ ...formData, submitButtonText: e.target.value })}
      placeholder="Initialize Transfer"
      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 transition-all outline-none font-medium"
    />
  </div>
  <div>
    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
      Success Message
    </label>
    <input
      type="text"
      value={formData.successMessage}
      onChange={(e) => setFormData({ ...formData, successMessage: e.target.value })}
      placeholder="Transmission Verified"
      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 transition-all outline-none font-medium"
    />
  </div>
</div>
  </div>
</section>
{/* Error UI */}
{error && (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="px-3 py-2 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-sm font-semibold"
  >
    <AlertCircle className="w-4 h-4 flex-shrink-0" />
    {error}
  </motion.div>
)}

{/* Action Buttons */}
<div className="flex gap-3 pt-3">
  <Link
    href="/dashboard"
    className="px-6 py-2 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all font-semibold text-sm uppercase tracking-wide"
  >
    Cancel
  </Link>
  <button
    type="submit"
    disabled={loading}
    className="flex-1 flex items-center justify-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-md disabled:opacity-50 font-semibold text-sm uppercase tracking-wide active:scale-[0.98]"
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
                        {/* eslint-disable-next-line @next/next/no-img-element */}
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
                      <p className="mb-2 text-lg font-medium opacity-80" style={{ color: formData.textColor }}>{formData.welcomeMessage}</p>
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
                  {formData.password && (
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
    </div>
  )
}
