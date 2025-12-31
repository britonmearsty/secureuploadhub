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

interface Portal {
    id: string
    name: string
    slug: string
    description: string | null
    isActive: boolean
    primaryColor: string
    createdAt: string
    passwordHash?: string | null
    _count: {
        uploads: number
    }
}

interface PortalListProps {
    initialPortals?: Portal[]
    allPortals?: Portal[]
    onPortalsUpdate?: (portals: Portal[]) => void
    className?: string
    emptyStateTab?: string
    activePortalsCount?: number
    archivedPortalsCount?: number
}

export default function PortalList({
    initialPortals,
    allPortals,
    onPortalsUpdate,
    className,
    emptyStateTab = "all",
    activePortalsCount = 0,
    archivedPortalsCount = 0
}: PortalListProps) {
    const [portals, setPortals] = useState<Portal[]>(initialPortals || [])
    const [loading, setLoading] = useState(!initialPortals)
    const [copiedSlug, setCopiedSlug] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [portalToDelete, setPortalToDelete] = useState<Portal | null>(null)
    const [togglingId, setTogglingId] = useState<string | null>(null)

    // Modal State
    const [selectedPortal, setSelectedPortal] = useState<Portal | null>(null)
    const [portalFiles, setPortalFiles] = useState<any[]>([])
    const [isLoadingFiles, setIsLoadingFiles] = useState(false)

    useEffect(() => {
        // Initial fetch if needed (only if no initial data)
        if (!initialPortals) {
            fetchPortals()
        }

        // Poll for updates
        const interval = setInterval(fetchPortals, 5000)
        return () => clearInterval(interval)
    }, [])

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

        // Optimistic Update
        const newStatus = !isActive

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
            if (res.ok) {
                posthog.capture('portal_status_toggled', {
                    portal_id: id,
                    new_status: newStatus ? 'live' : 'hidden',
                });
            } else {
                throw new Error("Failed to toggle")
            }
        } catch (error) {
            console.error("Error toggling portal:", error)
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
                    <div key={i} className="h-64 bg-slate-50 border border-slate-100 rounded-2xl animate-pulse" />
                ))}
            </div>
        )
    }

    if (portals.length === 0) {
        // Empty state for "All Portals"
        if (emptyStateTab === "all" && activePortalsCount === 0 && archivedPortalsCount === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white rounded-2xl border border-slate-200 border-dashed">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                        <Folder className="w-10 h-10 text-slate-200" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Build your first portal</h3>
                    <p className="text-slate-500 max-w-sm mb-8">
                        Start collecting files securely. It takes less than a minute to set up.
                    </p>
                    <Link
                        href="/dashboard/portals/new"
                        className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-sm active:scale-95"
                    >
                        Create Portal
                    </Link>
                </div>
            )
        }

        // Empty state for "Active" tab
        if (emptyStateTab === "active") {
            return (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white rounded-2xl border border-slate-200 border-dashed">
                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                        <Activity className="w-10 h-10 text-emerald-200" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No active portals</h3>
                    <p className="text-slate-500 max-w-sm mb-8">
                        {activePortalsCount === 0 && archivedPortalsCount > 0
                            ? `You have ${archivedPortalsCount} archived portal${archivedPortalsCount !== 1 ? 's' : ''}. Activate one to get started.`
                            : "Create a new portal to start collecting files."
                        }
                    </p>
                    <div className="flex gap-3">
                        <Link
                            href="/dashboard/portals/new"
                            className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-sm active:scale-95"
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
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white rounded-2xl border border-slate-200 border-dashed">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                        <Archive className="w-10 h-10 text-slate-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No archived portals</h3>
                    <p className="text-slate-500 max-w-sm mb-8">
                        Disabled portals will appear here. You can reactivate them anytime.
                    </p>
                </div>
            )
        }

        return (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white rounded-2xl border border-slate-200 border-dashed">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                    <Folder className="w-10 h-10 text-slate-200" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No portals found</h3>
                <p className="text-slate-500 max-w-sm mb-8">
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
                        className={`group bg-white rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col relative ${!isGrid ? 'flex-row items-center p-4' : ''
                            } ${portal.passwordHash
                                ? 'border-indigo-100 bg-indigo-50/10 hover:border-indigo-300 hover:shadow-indigo-100/50'
                                : 'border-slate-200 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/50'
                            }`}
                    >
                        {/* Encrypted Badge */}
                        {portal.passwordHash && (
                            <div className="absolute top-0 right-0 p-3 z-10">
                                <div className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg mr-12 lg:mr-0" title="Password Protected Portal">
                                    <Lock className="w-3.5 h-3.5" />
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
                                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-inner ring-4 ring-slate-50 flex-shrink-0 group-hover/header:scale-110 transition-transform duration-300 relative"
                                    style={{ backgroundColor: portal.primaryColor }}
                                >
                                    {portal.name.charAt(0).toUpperCase()}
                                    {portal.passwordHash && (
                                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-indigo-100">
                                            <div className="bg-indigo-500 rounded-full p-0.5">
                                                <Lock className="w-2 h-2 text-white" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-lg font-bold text-slate-900 group-hover/header:text-slate-600 transition-colors flex items-center gap-2 leading-snug">
                                        {portal.name}
                                        <ArrowUpRight className="w-4 h-4 opacity-0 -translate-y-1 group-hover/header:opacity-100 group-hover/header:translate-y-0 transition-all flex-shrink-0" />
                                    </h4>
                                    <p className="text-sm text-slate-500 font-medium mt-0.5 truncate flex items-center gap-1.5">
                                        /p/{portal.slug}
                                        {portal.passwordHash && (
                                            <span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                                Encrypted
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* Portal Status Toggle */}
                            <button
                                onClick={() => togglePortalStatus(portal.id, portal.isActive)}
                                disabled={togglingId === portal.id}
                                className={`absolute top-6 right-6 p-2 rounded-xl transition-all duration-200 flex-shrink-0 ${togglingId === portal.id ? 'opacity-60 cursor-not-allowed animate-pulse' : ''
                                    } ${portal.isActive
                                        ? 'bg-emerald-50 text-emerald-500 hover:bg-emerald-100 shadow-sm hover:shadow-md'
                                        : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                                    }`}
                                title={portal.isActive ? "Portal is live (Click to pause)" : "Portal is paused (Click to activate)"}
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
                                <p className="text-xs text-slate-400 mb-4 line-clamp-2 min-h-[2.5em]">{portal.description}</p>
                            ) : (
                                <p className="text-xs text-slate-300 mb-4 italic min-h-[2.5em]">No description provided...</p>
                            )}

                            {/* Stats Grid */}
                            <dl className="grid grid-cols-2 gap-3 w-full">
                                <div className="bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors group-hover:bg-white">
                                    <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Uploads</dt>
                                    <dd className="text-lg font-bold text-slate-900 mt-1">{portal._count.uploads}</dd>
                                </div>
                                <div className={`px-4 py-3 rounded-2xl border transition-all ${portal.isActive
                                    ? 'bg-emerald-50/50 border-emerald-100 text-emerald-900'
                                    : 'bg-slate-50 border-slate-100'
                                    }`}>
                                    <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</dt>
                                    <dd className="flex items-center gap-1.5 mt-1">
                                        <div className={`w-2 h-2 rounded-full ${portal.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                        <span className={`text-xs font-bold ${portal.isActive ? 'text-emerald-700' : 'text-slate-500'}`}>
                                            {portal.isActive ? 'Active' : 'Paused'}
                                        </span>
                                    </dd>
                                </div>
                            </dl>
                        </div>

                        {/* Card Actions */}
                        <div className={`p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between gap-2 ${!isGrid ? 'border-t-0 p-0 pr-4 border-l border-slate-100 pl-4' : ''}`}>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => copyPortalLink(portal)}
                                    className={`p-2 rounded-xl border transition-all ${copiedSlug === portal.slug
                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                        : 'text-slate-400 hover:text-slate-900 hover:bg-white border-transparent hover:border-slate-200'
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
                                    className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all"
                                >
                                    <Eye className="w-4 h-4" />
                                </Link>
                                <Link
                                    href={`/dashboard/portals/${portal.id}`}
                                    className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all"
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
                                className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-200 transition-all"
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
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        onClick={() => setShowDeleteModal(false)}
                    />
                    <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden p-8 text-center">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Trash2 className="w-8 h-8 text-red-500" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Portal?</h3>
                        <p className="text-slate-500 text-sm mb-8">
                            Are you sure you want to delete <span className="font-bold text-slate-900">"{portalToDelete.name}"</span>?
                            This will remove all associated settings and link access.
                        </p>
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={confirmDeletePortal}
                                className="w-full py-3 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-all active:scale-95 shadow-lg shadow-red-200"
                            >
                                Delete Forever
                            </button>
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="w-full py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
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
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start shrink-0">
                                <div className="flex items-center gap-4">
                                    <div
                                        className="w-16 h-16 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center text-xl font-bold text-white shadow-inner"
                                        style={{ backgroundColor: selectedPortal.primaryColor }}
                                    >
                                        {selectedPortal.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-slate-900 leading-tight">
                                            {selectedPortal.name}
                                        </h3>
                                        <Link href={`/p/${selectedPortal.slug}`} target="_blank" className="text-slate-500 flex items-center gap-1.5 mt-1 hover:text-slate-900 transition-colors">
                                            /p/{selectedPortal.slug}
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </Link>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedPortal(null)}
                                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-8 overflow-y-auto">
                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Files</p>
                                        <p className="text-xl font-bold text-slate-900">{selectedPortal._count.uploads}</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2.5 h-2.5 rounded-full ${selectedPortal.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                            <p className="text-xl font-bold text-slate-900">{selectedPortal.isActive ? 'Active' : 'Hidden'}</p>
                                        </div>
                                    </div>
                                </div>

                                <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-slate-400" />
                                    Recent Uploads
                                </h4>

                                <div className="space-y-3">
                                    {isLoadingFiles ? (
                                        <div className="py-12 text-center">
                                            <RefreshCw className="w-8 h-8 text-slate-200 animate-spin mx-auto mb-2" />
                                            <p className="text-slate-400 text-sm italic">Retrieving file history...</p>
                                        </div>
                                    ) : portalFiles.length > 0 ? (
                                        portalFiles.map((file) => (
                                            <div key={file.id} className="p-4 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all flex items-center justify-between group">
                                                <div className="min-w-0 pr-4">
                                                    <p className="text-sm font-bold text-slate-900 truncate">{file.fileName}</p>
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        {formatFileSize(file.fileSize)} · {new Date(file.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <a
                                                    href={`/api/uploads/${file.id}/download`}
                                                    className="w-10 h-10 bg-white shadow-sm border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 hover:border-slate-300 transition-all group-hover:scale-105"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </a>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center py-8 text-slate-400 italic text-sm">No documents found.</p>
                                    )}
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                                <button
                                    onClick={() => setSelectedPortal(null)}
                                    className="px-6 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                                >
                                    Close
                                </button>
                                <Link
                                    href={`/dashboard/portals/${selectedPortal.id}`}
                                    className="px-6 py-2.5 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 shadow-sm transition-all flex items-center gap-2"
                                >
                                    settings <ArrowUpRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    )
}
