"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Save, Cloud, FolderOpen, ChevronRight, Trash2 } from "lucide-react"

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
    primaryColor: "#4F46E5",
    requireClientName: true,
    requireClientEmail: false,
    maxFileSize: 500,
    storageProvider: "local" as "local" | "google_drive" | "dropbox",
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
          primaryColor: data.primaryColor,
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

        // If cloud storage, fetch folders
        if (data.storageProvider !== "local") {
          await fetchFolders(data.storageProvider)
        }
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

      setSuccess("Portal updated successfully!")
      setTimeout(() => setSuccess(""), 3000)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this portal? All upload history will be lost.")) {
      return
    }

    try {
      const res = await fetch(`/api/portals/${portalId}`, { method: "DELETE" })
      if (res.ok) {
        router.push("/dashboard")
      } else {
        setError("Failed to delete portal")
      }
    } catch {
      setError("Something went wrong")
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!portal) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">Portal not found</p>
        <Link href="/dashboard" className="text-indigo-600 hover:underline mt-2 inline-block">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Portal</h1>
              <p className="text-gray-600 text-sm mt-1">
                {portal._count.uploads} uploads received
              </p>
            </div>
            <button
              onClick={handleDelete}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete portal"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Portal Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Portal Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            {/* URL Slug (readonly) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL Slug
              </label>
              <div className="flex items-center">
                <span className="px-4 py-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-gray-500 text-sm">
                  {typeof window !== "undefined" ? window.location.origin : ""}/p/
                </span>
                <input
                  type="text"
                  value={formData.slug}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-r-lg bg-gray-50 text-gray-500"
                  disabled
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">URL slug cannot be changed after creation</p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Brand Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Brand Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="w-12 h-10 rounded cursor-pointer border border-gray-300"
                />
                <input
                  type="text"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg w-32"
                />
              </div>
            </div>

            {/* Max File Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max File Size (MB)
              </label>
              <input
                type="number"
                min="1"
                max="10240"
                value={formData.maxFileSize}
                onChange={(e) => setFormData({ ...formData, maxFileSize: parseInt(e.target.value) || 100 })}
                className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Storage Destination */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                <Cloud className="w-4 h-4 inline mr-2" />
                Storage Destination
              </label>

              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => selectStorageProvider("local")}
                  className={`p-3 border rounded-lg text-center transition-colors ${
                    formData.storageProvider === "local"
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <FolderOpen className="w-5 h-5 mx-auto mb-1 text-gray-600" />
                  <span className="text-sm font-medium">Local</span>
                </button>

                <button
                  type="button"
                  onClick={() => selectStorageProvider("google_drive")}
                  disabled={!accounts.find(a => a.provider === "google")}
                  className={`p-3 border rounded-lg text-center transition-colors ${
                    formData.storageProvider === "google_drive"
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-300 hover:border-gray-400"
                  } ${!accounts.find(a => a.provider === "google") ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <svg className="w-5 h-5 mx-auto mb-1" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span className="text-sm font-medium">Google Drive</span>
                </button>

                <button
                  type="button"
                  onClick={() => selectStorageProvider("dropbox")}
                  disabled={!accounts.find(a => a.provider === "dropbox")}
                  className={`p-3 border rounded-lg text-center transition-colors ${
                    formData.storageProvider === "dropbox"
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-300 hover:border-gray-400"
                  } ${!accounts.find(a => a.provider === "dropbox") ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <svg className="w-5 h-5 mx-auto mb-1" viewBox="0 0 24 24" fill="#0061FF">
                    <path d="M6 2L0 6l6 4-6 4 6 4 6-4-6-4 6-4-6-4zm12 0l-6 4 6 4-6 4 6 4 6-4-6-4 6-4-6-4zM6 14l6 4 6-4-6-4-6 4z" />
                  </svg>
                  <span className="text-sm font-medium">Dropbox</span>
                </button>
              </div>

              {/* Folder Browser */}
              {formData.storageProvider !== "local" && (
                <div className="border border-gray-300 rounded-lg">
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-300 flex items-center gap-1 text-sm">
                    <button type="button" onClick={navigateToRoot} className="text-indigo-600 hover:underline">
                      Root
                    </button>
                    {folderPath.map((folder, index) => (
                      <span key={folder.id} className="flex items-center gap-1">
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                        <button type="button" onClick={() => navigateBack(index)} className="text-indigo-600 hover:underline">
                          {folder.name}
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="max-h-48 overflow-y-auto">
                    {loadingFolders ? (
                      <div className="p-4 text-center text-gray-500">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                      </div>
                    ) : folders.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">No folders found</div>
                    ) : (
                      folders.map((folder) => (
                        <button
                          key={folder.id}
                          type="button"
                          onClick={() => navigateToFolder(folder)}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                        >
                          <FolderOpen className="w-4 h-4 text-amber-500" />
                          {folder.name}
                        </button>
                      ))
                    )}
                  </div>

                  <div className="px-3 py-2 bg-gray-50 border-t border-gray-300 text-sm text-gray-600">
                    Saving to: <span className="font-medium">{formData.storageFolderPath || "Root folder"}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Client Requirements */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">Client Requirements</label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.requireClientName}
                  onChange={(e) => setFormData({ ...formData, requireClientName: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span className="text-gray-700">Require client name</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.requireClientEmail}
                  onChange={(e) => setFormData({ ...formData, requireClientEmail: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span className="text-gray-700">Require client email</span>
              </label>
            </div>

            {/* Password Protection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password Protection
              </label>
              {hasPassword && (
                <p className="text-sm text-green-600 mb-2">✓ This portal is currently password protected</p>
              )}
              <input
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                placeholder={hasPassword ? "Enter new password to change" : "Enter password to enable protection"}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="text-sm text-gray-500 mt-1">
                {hasPassword
                  ? "Leave empty to keep current password, or enter a new one to change it"
                  : "Clients will need to enter this password before they can upload files"
                }
              </p>
            </div>

            {/* Allowed File Types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Allowed File Types
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Leave empty to allow all file types. Select specific types to restrict uploads.
              </p>
              <div className="space-y-2">
                {FILE_TYPE_OPTIONS.map((option) => (
                  <label key={option.value} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowedFileTypes.includes(option.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            allowedFileTypes: [...formData.allowedFileTypes, option.value],
                          })
                        } else {
                          setFormData({
                            ...formData,
                            allowedFileTypes: formData.allowedFileTypes.filter(type => type !== option.value),
                          })
                        }
                      }}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
              <Link
                href={`/p/${portal.slug}`}
                target="_blank"
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                View Portal
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
