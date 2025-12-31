"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import posthog from "posthog-js"
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
    Zap
} from "lucide-react"

interface Portal {
    id: string
    name: string
    slug: string
    description: string | null
    isActive: boolean
    primaryColor: string
    createdAt: string
    _count: {
        uploads: number
    }
}

interface PortalListProps {
    initialPortals?: Portal[]
    onPortalsUpdate?: (portals: Portal[]) => void
    className?: string
    emptyStateTab?: string
    activePortalsCount?: number
    archivedPortalsCount?: number
}

export default function PortalList({
    initialPortals,
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

    useEffect(() => {
        if (!initialPortals) {
            fetchPortals()
            const interval = setInterval(fetchPortals, 5000)
            return () => clearInterval(interval)
        }
    }, [initialPortals])

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
                setPortals(data.portals)
                onPortalsUpdate?.(data.portals)
            }
        } catch (error) {
            console.error("Error fetching portals:", error)
        } finally {
            setLoading(false)
        }
    }

    async function togglePortalStatus(id: string, isActive: boolean) {
        const portal = portals.find(p => p.id === id);
        setTogglingId(id)
        try {
            const res = await fetch(`/api/portals/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !isActive })
            })
            if (res.ok) {
                setPortals(portals.map(p => p.id === id ? { ...p, isActive: !isActive } : p))
                posthog.capture('portal_status_toggled', {
                    portal_id: id,
                    portal_name: portal?.name,
                    portal_slug: portal?.slug,
                    new_status: !isActive ? 'live' : 'hidden',
                });
            }
        } catch (error) {
            console.error("Error toggling portal:", error)
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
                setPortals(portals.filter(p => p.id !== id))
                posthog.capture('portal_deleted', { portal_id: id });
            }
        } catch (error) {
            console.error("Error deleting portal:", error)
        } finally {
            setDeletingId(null)
        }
    }

    function copyPortalLink(slug: string) {
        const url = `${window.location.origin}/p/${slug}`
        navigator.clipboard.writeText(url)
        setCopiedSlug(slug)
        setTimeout(() => setCopiedSlug(null), 2000)
        posthog.capture('portal_link_copied', { portal_slug: slug });
    }

    if (loading) {
        return (
            <div className={className || "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"}>
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-64 bg-slate-50 border border-slate-100 rounded-3xl animate-pulse" />
                ))}
            </div>
        )
    }

    if (portals.length === 0) {
        // Empty state for "All Portals" - no portals exist yet
        if (emptyStateTab === "all" && activePortalsCount === 0 && archivedPortalsCount === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mb-6 text-slate-400 dark:text-slate-500">
                        <Folder className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Build your first portal</h3>
                    <p className="text-slate-600 dark:text-slate-400 max-w-sm mb-8">
                        Start collecting files from clients with a branded portal. It takes less than a minute.
                    </p>
                    <Link
                        href="/dashboard/portals/new"
                        className="px-8 py-3 bg-slate-900 dark:bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-800 dark:hover:bg-slate-600 transition-all shadow-sm active:scale-95"
                    >
                        Create Portal
                    </Link>
                </div>
            )
        }

        // Empty state for "Active" tab - no active portals
        if (emptyStateTab === "active") {
            return (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-6 text-emerald-500">
                        <Activity className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">No active portals</h3>
                    <p className="text-slate-600 dark:text-slate-400 max-w-sm mb-8">
                        {activePortalsCount === 0 && archivedPortalsCount > 0
                            ? `You have ${archivedPortalsCount} archived portal${archivedPortalsCount !== 1 ? 's' : ''}. Activate one to get started.`
                            : "Create a new portal to start collecting files from your clients."
                        }
                    </p>
                    <div className="flex gap-3">
                        <Link
                            href="/dashboard/portals/new"
                            className="px-8 py-3 bg-slate-900 dark:bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-800 dark:hover:bg-slate-600 transition-all shadow-sm active:scale-95"
                        >
                            Create New Portal
                        </Link>
                        {activePortalsCount === 0 && archivedPortalsCount > 0 && (
                            <Link
                                href="/dashboard/portals"
                                className="px-8 py-3 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                            >
                                View Archived
                            </Link>
                        )}
                    </div>
                </div>
            )
        }

        // Empty state for "Archived" tab - no archived portals
        if (emptyStateTab === "archived") {
            return (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mb-6 text-slate-400 dark:text-slate-500">
                        <Archive className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">No archived portals</h3>
                    <p className="text-slate-600 dark:text-slate-400 max-w-sm mb-8">
                        {activePortalsCount > 0
                            ? `You have ${activePortalsCount} active portal${activePortalsCount !== 1 ? 's' : ''}. Archive unused ones here.`
                            : "Disabled portals will appear here. You can reactivate them anytime."
                        }
                    </p>
                    <Link
                        href="/dashboard/portals"
                        className="px-8 py-3 bg-slate-900 dark:bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-800 dark:hover:bg-slate-600 transition-all shadow-sm active:scale-95"
                    >
                        Back to All Portals
                    </Link>
                </div>
            )
        }

        // Default fallback empty state
        return (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mb-6 text-slate-400 dark:text-slate-500">
                    <Folder className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">No portals found</h3>
                <p className="text-slate-600 dark:text-slate-400 max-w-sm mb-8">
                    No portals match your search criteria.
                </p>
                <Link
                    href="/dashboard/portals/new"
                    className="px-8 py-3 bg-slate-900 dark:bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-800 dark:hover:bg-slate-600 transition-all shadow-sm active:scale-95"
                >
                    Create Portal
                </Link>
            </div>
        )
    }

    const isGrid = className?.includes("grid") || !className;

    return (
        <>
            <div className={className || "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"}>
                {portals.map((portal) => (
                    <div
                        key={portal.id}
                        className={`group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col relative ${!isGrid ? 'flex-row items-center p-4' : ''}`}
                    >
                        {/* Card Header/Top Section */}
                        <div className={`p-6 flex-1 ${!isGrid ? 'py-0 flex-row gap-4 flex items-center' : ''} w-full`}>
                            {/* Portal Logo + Name - Clickable Header */}
                            <Link
                                href={`/dashboard/portals/${portal.id}`}
                                className="flex items-start gap-3 group/header mb-4 w-full hover:opacity-75 transition-opacity"
                            >
                                <div
                                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-inner ring-4 ring-slate-100 dark:ring-slate-700 flex-shrink-0 group-hover/header:scale-110 transition-transform duration-300"
                                    style={{ backgroundColor: portal.primaryColor }}
                                >
                                    {portal.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover/header:text-slate-600 dark:group-hover/header:text-slate-400 transition-colors flex items-center gap-2 leading-snug">
                                        {portal.name}
                                        <ArrowUpRight className="w-4 h-4 opacity-0 -translate-y-1 group-hover/header:opacity-100 group-hover/header:translate-y-0 transition-all flex-shrink-0" />
                                    </h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">/p/{portal.slug}</p>
                                </div>
                            </Link>

                            {/* Portal Status Toggle - Absolute positioned on card */}
                            <button
                                onClick={() => togglePortalStatus(portal.id, portal.isActive)}
                                disabled={togglingId === portal.id}
                                className={`absolute top-6 right-6 p-2 rounded-xl transition-all duration-200 flex-shrink-0 ${togglingId === portal.id ? 'opacity-60 cursor-not-allowed' : ''
                                    } ${portal.isActive
                                        ? 'bg-emerald-50 text-emerald-500 hover:bg-emerald-100 shadow-sm hover:shadow-md'
                                        : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                    }`}
                                title={portal.isActive ? "Portal is live - Click to hide" : "Portal is hidden - Click to make live"}
                            >
                                {portal.isActive ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                            </button>

                            {/* Description */}
                            {portal.description && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">{portal.description}</p>
                            )}

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-3 w-full">
                                <div className="bg-slate-50 dark:bg-slate-700 px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-600 hover:border-slate-200 dark:hover:border-slate-500 transition-colors">
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Uploads</p>
                                    <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">{portal._count.uploads}</p>
                                </div>
                                <div className={`px-4 py-3 rounded-2xl border transition-all ${portal.isActive
                                        ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700'
                                        : 'bg-slate-50 dark:bg-slate-700 border-slate-100 dark:border-slate-600'
                                    }`}>
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status</p>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <div className={`w-2 h-2 rounded-full ${portal.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400 dark:bg-slate-500'}`} />
                                        <span className={`text-xs font-bold ${portal.isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                            {portal.isActive ? 'Live' : 'Hidden'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Card Actions Bottom */}
                        <div className={`p-4 bg-slate-50/50 dark:bg-slate-700/50 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2 ${!isGrid ? 'border-t-0 p-0 pr-4 border-l border-slate-100 dark:border-slate-700 pl-4' : ''}`}>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => copyPortalLink(portal.slug)}
                                    className={`p-2 rounded-xl border transition-all ${copiedSlug === portal.slug
                                        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700'
                                        : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-700 border-transparent hover:border-slate-200 dark:hover:border-slate-600'
                                        }`}
                                    title="Copy portal link to clipboard"
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
                                    className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-700 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-all"
                                    title="Open portal preview in new tab"
                                >
                                    <Eye className="w-4 h-4" />
                                </Link>
                                <Link
                                    href={`/dashboard/portals/${portal.id}`}
                                    className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-700 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-all"
                                    title="Go to settings"
                                >
                                    <Settings className="w-4 h-4" />
                                </Link>
                            </div>

                            <button
                                onClick={() => {
                                    setPortalToDelete(portal)
                                    setShowDeleteModal(true)
                                }}
                                disabled={deletingId === portal.id}
                                className="p-2 text-slate-300 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl border border-transparent hover:border-red-200 dark:hover:border-red-700 transition-all"
                                title="Delete this portal"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Delete Modal */}
            {showDeleteModal && portalToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        onClick={() => setShowDeleteModal(false)}
                    />
                    <div className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden p-8 text-center">
                        <div className="w-16 h-16 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                            <Trash2 className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Delete Portal?</h3>
                        <p className="text-slate-600 dark:text-slate-400 text-sm mb-8">
                            Are you sure you want to delete <span className="font-bold text-slate-900 dark:text-slate-100">"{portalToDelete.name}"</span>?
                            This will remove all associated settings and link access.
                        </p>
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={confirmDeletePortal}
                                className="w-full py-3 bg-red-500 dark:bg-red-600 text-white rounded-xl font-medium hover:bg-red-600 dark:hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-200/50"
                            >
                                Delete Forever
                            </button>
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="w-full py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}


