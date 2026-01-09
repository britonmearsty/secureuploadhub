"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import posthog from "posthog-js"
import { motion, AnimatePresence } from "framer-motion"
import {
    Plus,
    ExternalLink,
    Settings,
    Trash2,
    Copy,
    Check,
    ToggleLeft,
    ToggleRight,
    Folder,
    ArrowUpRight,
    Clock,
    Layout,
    Eye,
    MoreVertical,
    Archive,
    Activity,
    Pencil,
    X,
    FileText,
    Download,
    RefreshCw,
    Lock
} from "lucide-react"
import { FileList } from "@/components/assets"
import { ToastComponent } from "@/components/ui/Toast"
import { getStorageErrorMessage } from "@/lib/storage/error-messages"

interface Portal {
    id: string
    name: string
    slug: string
    description: string | null
    isActive: boolean
    primaryColor: string
    createdAt: string
    passwordHash?: string | null
    storageAccountId?: string | null
    storageAccount?: {
        id: string
        status: string
        provider: string
        displayName: string
        email?: string
    } | null
    _count: {
        uploads: number
    }
}

interface PortalListProps {
    initialPortals?: Portal[]
    allPortals?: Portal[]
    onPortalsUpdate?: (portals: Portal[]) => void
    showToast?: (type: 'error' | 'success' | 'warning' | 'info', title: string, message: string) => void
    className?: string
    emptyStateTab?: string
    activePortalsCount?: number
    archivedPortalsCount?: number
    disablePolling?: boolean
}

export default function PortalList({
    initialPortals,
    allPortals,
    onPortalsUpdate,
    showToast,
    className,
    emptyStateTab = "all",
    activePortalsCount = 0,
    archivedPortalsCount = 0,
    disablePolling = false
}: PortalListProps) {
    const [portals, setPortals] = useState<Portal[]>(initialPortals || [])
    const [loading, setLoading] = useState(!initialPortals)
    const [copiedSlug, setCopiedSlug] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [portalToDelete, setPortalToDelete] = useState<Portal | null>(null)
    const [togglingId, setTogglingId] = useState<string | null>(null)

    const [selectedPortal, setSelectedPortal] = useState<Portal | null>(null)
    const [portalFiles, setPortalFiles] = useState<any[]>([])
    const [isLoadingFiles, setIsLoadingFiles] = useState(false)

    // Toast notification state
    const [toast, setToast] = useState<{
        isOpen: boolean;
        type: 'error' | 'success' | 'warning' | 'info';
        title: string;
        message: string;
    }>({
        isOpen: false,
        type: 'error',
        title: '',
        message: ''
    })

    const showToastInternal = (type: 'error' | 'success' | 'warning' | 'info', title: string, message: string) => {
        if (showToast) {
            showToast(type, title, message)
        } else {
            setToast({
                isOpen: true,
                type,
                title,
                message
            })
        }
    }

    const handleFilesUpdate = (updatedFiles: any[]) => {
        setPortalFiles(updatedFiles)
    }

    const handleDeleteRequest = (file: any) => {
        // Check storage account status before showing delete modal
        if (file.storageAccount) {
            const status = file.storageAccount.status
            if (status !== 'ACTIVE') {
                const errorInfo = getStorageErrorMessage(
                    status,
                    file.storageAccount.provider,
                    'file_access'
                )
                showToastInternal('error', errorInfo.title, errorInfo.message)
                return
            }
        }
        
        // Proceed with deletion
        deleteFile(file)
    }

    const deleteFile = async (file: any) => {
        try {
            const res = await fetch(`/api/uploads/${file.id}`, {
                method: 'DELETE',
            })
            if (res.ok) {
                setPortalFiles(prev => prev.filter(f => f.id !== file.id))
                showToastInternal('success', 'File Deleted', 'File has been successfully deleted.')
            } else {
                const errorData = await res.json()
                showToastInternal('error', 'Delete Error', errorData.error || 'Failed to delete file')
            }
        } catch (error) {
            showToastInternal('error', 'Delete Error', 'Error deleting file')
        }
    }

    useEffect(() => {
        if (disablePolling) return;

        // Initial fetch if needed (only if no initial data)
        if (!initialPortals) {
            fetchPortals()
        }

        // Poll for updates
        const interval = setInterval(fetchPortals, 5000)
        return () => clearInterval(interval)
    }, [disablePolling, initialPortals])

    useEffect(() => {
        if (initialPortals) {
            setPortals(initialPortals)
            setLoading(false)
        }
    }, [initialPortals])

    async function fetchPortals() {
        try {
            const res = await fetch("/api/dashboard")
            if (res.ok) {
                const data = await res.json()
                // If we have parent handler, let it handle the update to source of truth
                if (onPortalsUpdate) {
                    onPortalsUpdate(data.portals)
                } else {
                    setPortals(data.portals)
                }
            }
        } catch (error) {
            console.error("Error fetching portals:", error)
        } finally {
            setLoading(false)
        }
    }

    async function togglePortalStatus(id: string, isActive: boolean) {
        setTogglingId(id)

        // Find the portal to check its storage account status
        const portal = portals.find(p => p.id === id)
        if (!portal) {
            setTogglingId(null)
            return
        }

        const newStatus = !isActive

        // STORAGE VALIDATION: Check if trying to activate portal with inactive/disconnected storage
        if (newStatus && portal.storageAccount) {
            if (portal.storageAccount.status !== 'ACTIVE') {
                setTogglingId(null)
                const errorInfo = getStorageErrorMessage(
                    portal.storageAccount.status,
                    portal.storageAccount.provider,
                    'portal_activation'
                )
                showToastInternal('error', errorInfo.title, errorInfo.message)
                return
            }
        }

        // Optimistic Update
        // Update parent state if available for categorization consistency
        if (allPortals && onPortalsUpdate) {
            const updatedAll = allPortals.map(p => p.id === id ? { ...p, isActive: newStatus } : p)
            onPortalsUpdate(updatedAll)
        } else {
            // Fallback to local update
            setPortals(portals.map(p => p.id === id ? { ...p, isActive: newStatus } : p))
        }

        try {
            const res = await fetch(`/api/portals/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: newStatus })
            })
            
            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || "Failed to toggle portal status")
            }
            
            posthog.capture('portal_status_toggled', {
                portal_id: id,
                new_status: newStatus ? 'live' : 'hidden',
            });
        } catch (error) {
            console.error("Error toggling portal:", error)
            
            // Handle specific storage-related errors from the API
            if (error instanceof Error) {
                const errorMessage = error.message
                
                // Try to extract storage status from error message and provide appropriate feedback
                if (errorMessage.includes('storage account is disconnected')) {
                    const errorInfo = getStorageErrorMessage('DISCONNECTED', 'google_drive', 'portal_activation')
                    showToastInternal('error', errorInfo.title, errorInfo.message)
                } else if (errorMessage.includes('storage account is deactivated')) {
                    const errorInfo = getStorageErrorMessage('INACTIVE', 'google_drive', 'portal_activation')
                    showToastInternal('error', errorInfo.title, errorInfo.message)
                } else if (errorMessage.includes('connection issues')) {
                    const errorInfo = getStorageErrorMessage('ERROR', 'google_drive', 'portal_activation')
                    showToastInternal('error', errorInfo.title, errorInfo.message)
                } else {
                    showToastInternal('error', 'Portal Toggle Failed', errorMessage)
                }
            } else {
                showToastInternal('error', 'Portal Toggle Failed', 'Failed to toggle portal status')
            }
            
            // Revert on error
            if (allPortals && onPortalsUpdate) {
                const revertedAll = allPortals.map(p => p.id === id ? { ...p, isActive: isActive } : p)
                onPortalsUpdate(revertedAll)
            } else {
                setPortals(portals.map(p => p.id === id ? { ...p, isActive: isActive } : p))
            }
        } finally {
            setTogglingId(null)
        }
    }

    async function confirmDeletePortal() {
        if (!portalToDelete) return
        const id = portalToDelete.id
        setDeletingId(id)
        setShowDeleteModal(false)
        try {
            const res = await fetch(`/api/portals/${id}`, { method: "DELETE" })
            if (res.ok) {
                if (allPortals && onPortalsUpdate) {
                    onPortalsUpdate(allPortals.filter(p => p.id !== id))
                } else {
                    setPortals(portals.filter(p => p.id !== id))
                }
                posthog.capture('portal_deleted', { portal_id: id });
            }
        } catch (error) {
            console.error("Error deleting portal:", error)
        } finally {
            setDeletingId(null)
        }
    }

    function copyPortalLink(portal: Portal) {
        const url = `${window.location.origin}/p/${portal.slug}`
        const isEncrypted = !!portal.passwordHash

        const details = `Portal Name: ${portal.name}
Portal Link: ${url}
${isEncrypted ? 'Security: Password Protected 🔒' : 'Security: Public Access 🌍'}
Status: ${portal.isActive ? 'Active ✅' : 'Inactive ⏸️'}`

        navigator.clipboard.writeText(details)
        setCopiedSlug(portal.slug)
        setTimeout(() => setCopiedSlug(null), 2000)
        posthog.capture('portal_link_copied', { portal_slug: portal.slug });
    }

    async function handlePortalClick(portal: Portal) {
        setSelectedPortal(portal)
        setIsLoadingFiles(true)
        setPortalFiles([])
        try {
            const res = await fetch(`/api/uploads?portalId=${portal.id}`)
            if (res.ok) {
                const data = await res.json()
                setPortalFiles(data)
            }
        } catch (error) {
            console.error("Error fetching portal files:", error)
        } finally {
            setIsLoadingFiles(false)
        }
    }

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    if (loading) {
        return (
            <div className={className || "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"}>
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-64 bg-muted border border-border rounded-2xl animate-pulse" />
                ))}
            </div>
        )
    }

    if (portals.length === 0) {
        // Empty state for "All Portals"
        if (emptyStateTab === "all" && activePortalsCount === 0 && archivedPortalsCount === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-card rounded-2xl border border-border border-dashed">
                    <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
                        <Folder className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">Build your first portal</h3>
                    <p className="text-muted-foreground max-w-sm mb-8">
                        Start collecting files securely. It takes less than a minute to set up.
                    </p>
                    <Link
                        href="/dashboard/portals/new"
                        className="px-8 py-3 bg-primary text-primary-foreground rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-sm active:scale-95"
                    >
                        Create Portal
                    </Link>
                </div>
            )
        }

        // Empty state for "Active" tab
        if (emptyStateTab === "active") {
            return (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-card rounded-2xl border border-border border-dashed">
                    <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mb-6">
                        <Activity className="w-10 h-10 text-success/60" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">No active portals</h3>
                    <p className="text-muted-foreground max-w-sm mb-8">
                        {activePortalsCount === 0 && archivedPortalsCount > 0
                            ? `You have ${archivedPortalsCount} archived portal${archivedPortalsCount !== 1 ? 's' : ''}. Activate one to get started.`
                            : "Create a new portal to start collecting files."
                        }
                    </p>
                    <div className="flex gap-3">
                        <Link
                            href="/dashboard/portals/new"
                            className="px-8 py-3 bg-primary text-primary-foreground rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-sm active:scale-95"
                        >
                            Create New Portal
                        </Link>
                    </div>
                </div>
            )
        }

        // Empty state for "Archived" tab
        if (emptyStateTab === "archived") {
            return (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-card rounded-2xl border border-border border-dashed">
                    <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
                        <Archive className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">No archived portals</h3>
                    <p className="text-muted-foreground max-w-sm mb-8">
                        Disabled portals will appear here. You can reactivate them anytime.
                    </p>
                </div>
            )
        }

        return (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-card rounded-2xl border border-border border-dashed">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
                    <Folder className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">No portals found</h3>
                <p className="text-muted-foreground max-w-sm mb-8">
                    No portals match your search criteria.
                </p>
            </div>
        )
    }

    const isGrid = className?.includes("grid") || !className;

    return (
        <>
            <ul className={className || "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"} role="list">
                {portals.map((portal) => (
                    <li
                        key={portal.id}
                        className={`group bg-card rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col relative ${!isGrid ? 'flex-row items-center p-4' : ''
                            } ${portal.passwordHash
                                ? 'border-primary/20 bg-primary/5 hover:border-primary/40 hover:shadow-primary/10'
                                : 'border-border hover:border-muted-foreground hover:shadow-xl hover:shadow-muted/20'
                            }`}
                    >
                        {/* Encrypted Badge */}
                        {portal.passwordHash && (
                            <div className="absolute top-7 right-20 z-50 pointer-events-none">
                                <div className="bg-primary/10 text-primary p-1.5 rounded-lg shadow-sm border border-primary/20" title="Password Protected Portal">
                                    <Lock className="w-3 h-3" />
                                </div>
                            </div>
                        )}

                        <div className={`p-6 flex-1 ${!isGrid ? 'py-0 flex-row gap-4 flex items-center' : ''} w-full`}>
                            {/* Portal Logo + Name */}
                            <div
                                onClick={() => handlePortalClick(portal)}
                                className="flex items-start gap-3 group/header mb-4 w-full cursor-pointer hover:opacity-75 transition-opacity"
                                role="button"
                                tabIndex={0}
                            >
                                <div
                                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-inner ring-4 ring-card flex-shrink-0 group-hover/header:scale-110 transition-transform duration-300 relative"
                                    style={{ backgroundColor: portal.primaryColor }}
                                >
                                    {portal.name.charAt(0).toUpperCase()}
                                    {portal.passwordHash && (
                                        <div className="absolute -bottom-1 -right-1 bg-card rounded-full p-0.5 shadow-sm border border-primary/20">
                                            <div className="bg-primary rounded-full p-0.5">
                                                <Lock className="w-2 h-2 text-primary-foreground" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-lg font-bold text-foreground group-hover/header:text-muted-foreground transition-colors flex items-center gap-2 leading-snug">
                                        {portal.name}
                                        <ArrowUpRight className="w-4 h-4 opacity-0 -translate-y-1 group-hover/header:opacity-100 group-hover/header:translate-y-0 transition-all flex-shrink-0" />
                                    </h4>
                                    <p className="text-sm text-muted-foreground font-medium mt-0.5 truncate flex items-center gap-1.5">
                                        /p/{portal.slug}
                                        {portal.passwordHash && (
                                            <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                                Encrypted
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* Portal Status Toggle */}
                            <button
                                onClick={() => togglePortalStatus(portal.id, portal.isActive)}
                                disabled={togglingId === portal.id || (portal.storageAccount?.status === 'INACTIVE' || portal.storageAccount?.status === 'DISCONNECTED' || portal.storageAccount?.status === 'ERROR')}
                                className={`absolute top-6 right-6 z-20 p-2 rounded-xl transition-all duration-200 flex-shrink-0 ${
                                    togglingId === portal.id ? 'opacity-60 cursor-not-allowed animate-pulse' : ''
                                } ${
                                    portal.storageAccount?.status === 'INACTIVE' || portal.storageAccount?.status === 'ERROR'
                                        ? 'opacity-50 cursor-not-allowed bg-muted text-muted-foreground'
                                        : portal.isActive
                                            ? 'bg-success/10 dark:bg-success/20 text-success hover:bg-success/20 dark:hover:bg-success/30 shadow-sm hover:shadow-md'
                                            : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                                }`}
                                title={
                                    portal.storageAccount?.status === 'INACTIVE'
                                        ? `Cannot activate - ${portal.storageAccount.provider === 'google_drive' ? 'Google Drive' : 'Dropbox'} storage is deactivated`
                                        : portal.storageAccount?.status === 'ERROR'
                                            ? `Cannot activate - ${portal.storageAccount.provider === 'google_drive' ? 'Google Drive' : 'Dropbox'} storage has connection issues`
                                            : portal.isActive 
                                                ? "Portal is live (Click to pause)" 
                                                : "Portal is paused (Click to activate)"
                                }
                            >
                                {togglingId === portal.id ? (
                                    <RefreshCw className="w-6 h-6 animate-spin" />
                                ) : portal.isActive ? (
                                    <ToggleRight className="w-6 h-6" />
                                ) : (
                                    <ToggleLeft className="w-6 h-6" />
                                )}
                            </button>

                            {/* Description - Hidden if grid is small or description is empty */}
                            {portal.description ? (
                                <p className="text-xs text-muted-foreground mb-4 line-clamp-2 min-h-[2.5em]">{portal.description}</p>
                            ) : (
                                <p className="text-xs text-muted-foreground/60 mb-4 italic min-h-[2.5em]">No description provided...</p>
                            )}

                            {/* Stats Grid */}
                            <dl className="grid grid-cols-2 gap-3 w-full">
                                <div className="bg-muted px-4 py-3 rounded-2xl border border-border hover:border-muted-foreground transition-colors group-hover:bg-card">
                                    <dt className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Uploads</dt>
                                    <dd className="text-lg font-bold text-foreground mt-1">{portal._count.uploads}</dd>
                                </div>
                                
                                {/* Storage Account Status */}
                                <div className="bg-muted px-4 py-3 rounded-2xl border border-border hover:border-muted-foreground transition-colors group-hover:bg-card">
                                    <dt className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Storage</dt>
                                    <dd className="flex items-center gap-1.5 mt-1">
                                        {portal.storageAccount ? (
                                            <>
                                                {portal.storageAccount.status === 'ACTIVE' ? (
                                                    <>
                                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                                        <span className="text-xs font-medium text-green-600">Connected</span>
                                                    </>
                                                ) : portal.storageAccount.status === 'INACTIVE' ? (
                                                    <>
                                                        <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                                                        <span className="text-xs font-medium text-yellow-600">Deactivated</span>
                                                    </>
                                                ) : portal.storageAccount.status === 'ERROR' ? (
                                                    <>
                                                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                                                        <span className="text-xs font-medium text-orange-600">Error</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="w-2 h-2 bg-gray-500 rounded-full" />
                                                        <span className="text-xs font-medium text-gray-600">Unknown</span>
                                                    </>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-2 h-2 bg-gray-400 rounded-full" />
                                                <span className="text-xs font-medium text-gray-500">Legacy</span>
                                            </>
                                        )}
                                    </dd>
                                </div>
                            </dl>

                            {/* Storage Disconnected Warning */}
                            {portal.storageAccount?.status === 'INACTIVE' && (
                                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                                    <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                                        <div className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                                            <div className="w-2 h-2 bg-white rounded-full" />
                                        </div>
                                        <span className="text-xs font-medium">Storage Deactivated</span>
                                    </div>
                                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                                        Reactivate {portal.storageAccount.provider === 'google_drive' ? 'Google Drive' : 'Dropbox'} to enable uploads
                                    </p>
                                </div>
                            )}

                            {portal.storageAccount?.status === 'ERROR' && (
                                <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl">
                                    <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                                        <div className="w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                        </div>
                                        <span className="text-xs font-medium">Storage Error</span>
                                    </div>
                                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                        Check {portal.storageAccount.provider === 'google_drive' ? 'Google Drive' : 'Dropbox'} connection in settings
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Card Actions */}
                        <div className={`p-4 bg-muted/50 border-t border-border flex items-center justify-between gap-2 ${!isGrid ? 'border-t-0 p-0 pr-4 border-l border-border pl-4' : ''}`}>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => copyPortalLink(portal)}
                                    className={`p-2 rounded-xl border transition-all ${copiedSlug === portal.slug
                                        ? 'bg-success/10 text-success border-success/20'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-card border-transparent hover:border-border'
                                        }`}
                                    title="Copy portal details"
                                >
                                    {copiedSlug === portal.slug ? (
                                        <Check className="w-4 h-4" />
                                    ) : (
                                        <Copy className="w-4 h-4" />
                                    )}
                                </button>
                                <Link
                                    href={`/p/${portal.slug}`}
                                    target="_blank"
                                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-card rounded-xl border border-transparent hover:border-border transition-all"
                                >
                                    <Eye className="w-4 h-4" />
                                </Link>
                                <Link
                                    href={`/dashboard/portals/${portal.id}`}
                                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-card rounded-xl border border-transparent hover:border-border transition-all"
                                >
                                    <Pencil className="w-4 h-4" />
                                </Link>
                            </div>

                            <button
                                onClick={() => {
                                    setPortalToDelete(portal)
                                    setShowDeleteModal(true)
                                }}
                                disabled={deletingId === portal.id}
                                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl border border-transparent hover:border-destructive/20 transition-all"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </li>
                ))}
            </ul>

            {/* Delete Modal */}
            {showDeleteModal && portalToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                        onClick={() => setShowDeleteModal(false)}
                    />
                    <div className="relative w-full max-w-sm bg-card rounded-3xl shadow-2xl overflow-hidden p-8 text-center border border-border">
                        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Trash2 className="w-8 h-8 text-destructive" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground mb-2">Delete Portal?</h3>
                        <p className="text-muted-foreground text-sm mb-8">
                            Are you sure you want to delete <span className="font-bold text-foreground">"{portalToDelete.name}"</span>?
                            This will remove all associated settings and link access.
                        </p>
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={confirmDeletePortal}
                                className="w-full py-3 bg-destructive text-destructive-foreground rounded-2xl font-bold hover:bg-destructive/90 transition-all active:scale-95 shadow-lg shadow-destructive/20"
                            >
                                Delete Forever
                            </button>
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="w-full py-3 bg-muted text-muted-foreground rounded-2xl font-bold hover:bg-muted/80 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Portal Details Modal */}
            <AnimatePresence>
                {selectedPortal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedPortal(null)}
                            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-2xl bg-card rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-border"
                        >
                            <div className="p-8 border-b border-border bg-muted/50 flex justify-between items-start shrink-0">
                                <div className="flex items-center gap-4">
                                    <div
                                        className="w-16 h-16 rounded-2xl shadow-sm border border-border flex items-center justify-center text-xl font-bold text-white shadow-inner"
                                        style={{ backgroundColor: selectedPortal.primaryColor }}
                                    >
                                        {selectedPortal.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-foreground leading-tight">
                                            {selectedPortal.name}
                                        </h3>
                                        <Link href={`/p/${selectedPortal.slug}`} target="_blank" className="text-muted-foreground flex items-center gap-1.5 mt-1 hover:text-foreground transition-colors">
                                            /p/{selectedPortal.slug}
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </Link>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedPortal(null)}
                                    className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground hover:text-foreground"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-8 overflow-y-auto">
                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="bg-muted p-4 rounded-2xl border border-border">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Files</p>
                                        <p className="text-xl font-bold text-foreground">{selectedPortal._count.uploads}</p>
                                    </div>
                                    <div className="bg-muted p-4 rounded-2xl border border-border">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Status</p>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2.5 h-2.5 rounded-full ${selectedPortal.isActive ? 'bg-success animate-pulse' : 'bg-muted-foreground'}`} />
                                            <p className="text-xl font-bold text-foreground">{selectedPortal.isActive ? 'Active' : 'Hidden'}</p>
                                        </div>
                                    </div>
                                </div>

                                <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-muted-foreground" />
                                    Recent Uploads
                                </h4>

                                <div className="space-y-3">
                                    {isLoadingFiles ? (
                                        <div className="py-12 text-center">
                                            <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin mx-auto mb-2" />
                                            <p className="text-muted-foreground text-sm italic">Retrieving file history...</p>
                                        </div>
                                    ) : (
                                        <FileList
                                            files={portalFiles}
                                            onDelete={handleDeleteRequest}
                                            onFilesUpdate={handleFilesUpdate}
                                            showToast={showToastInternal}
                                            showActions={true}
                                            showPortal={false}
                                            showSearch={true}
                                            showViewToggle={true}
                                            showAutoSync={true}
                                            compact={true}
                                            emptyMessage="No documents found"
                                            emptyDescription="No files have been uploaded to this portal yet."
                                            viewMode="list"
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="p-6 bg-muted border-t border-border flex justify-end gap-3 shrink-0">
                                <button
                                    onClick={() => setSelectedPortal(null)}
                                    className="px-6 py-2.5 bg-card border border-border rounded-2xl text-sm font-bold text-muted-foreground hover:bg-muted transition-all"
                                >
                                    Close
                                </button>
                                <Link
                                    href={`/dashboard/portals/${selectedPortal.id}`}
                                    className="px-6 py-2.5 bg-primary text-primary-foreground rounded-2xl text-sm font-bold hover:bg-primary/90 shadow-sm transition-all flex items-center gap-2"
                                >
                                    settings <ArrowUpRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Toast Notification - Only show if no external showToast handler */}
            {!showToast && (
                <ToastComponent
                    isOpen={toast.isOpen}
                    onClose={() => setToast({ ...toast, isOpen: false })}
                    type={toast.type}
                    title={toast.title}
                    message={toast.message}
                />
            )}
        </>
    )
}
