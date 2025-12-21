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
  MoreVertical
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
}

export default function PortalList({ initialPortals, onPortalsUpdate, className }: PortalListProps) {
  const [portals, setPortals] = useState<Portal[]>(initialPortals || [])
  const [loading, setLoading] = useState(!initialPortals)
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [portalToDelete, setPortalToDelete] = useState<Portal | null>(null)

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
          new_status: !isActive ? 'active' : 'inactive',
        });
      }
    } catch (error) {
      console.error("Error toggling portal:", error)
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
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white rounded-3xl border border-slate-200 border-dashed">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
          <Folder className="w-10 h-10 text-slate-200" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Build your first portal</h3>
        <p className="text-slate-500 max-w-sm mb-8">
          Start collecting files from clients with a branded portal. It takes less than a minute.
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

  const isGrid = className?.includes("grid") || !className;

  return (
    <>
      <div className={className || "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"}>
        {portals.map((portal) => (
          <div
            key={portal.id}
            className={`group bg-white rounded-3xl border border-slate-200 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 overflow-hidden flex flex-col ${!isGrid ? 'flex-row items-center p-4' : ''}`}
          >
            {/* Card Header/Top Section */}
            <div className={`p-6 flex-1 ${!isGrid ? 'py-0 flex-row gap-4 flex items-center' : ''}`}>
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-inner ring-4 ring-slate-50"
                  style={{ backgroundColor: portal.primaryColor }}
                >
                  {portal.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => togglePortalStatus(portal.id, portal.isActive)}
                    className={`p-1.5 rounded-lg transition-colors ${portal.isActive ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-300 hover:bg-slate-100'}`}
                    title={portal.isActive ? "Active - Click to disable" : "Disabled - Click to enable"}
                  >
                    {portal.isActive ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                  </button>
                  <button className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div>
                <Link href={`/dashboard/portals/${portal.id}`} className="block group/title">
                  <h4 className="text-lg font-bold text-slate-900 group-hover/title:text-slate-600 transition-colors flex items-center gap-2">
                    {portal.name}
                    <ArrowUpRight className="w-4 h-4 opacity-0 -translate-y-1 group-hover/title:opacity-100 group-hover/title:translate-y-0 transition-all" />
                  </h4>
                </Link>
                <p className="text-sm text-slate-500 font-medium mt-1">/p/{portal.slug}</p>

                {portal.description && (
                  <p className="text-xs text-slate-400 mt-3 line-clamp-1">{portal.description}</p>
                )}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Uploads</p>
                  <p className="text-lg font-bold text-slate-900">{portal._count.uploads}</p>
                </div>
                <div className="bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${portal.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                    <span className={`text-xs font-bold ${portal.isActive ? 'text-emerald-700' : 'text-slate-500'}`}>
                      {portal.isActive ? 'Live' : 'Hidden'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card Actions Bottom */}
            <div className={`p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between gap-2 ${!isGrid ? 'border-t-0 p-0 pr-4' : ''}`}>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => copyPortalLink(portal.slug)}
                  className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all shadow-none hover:shadow-sm"
                  title="Copy Link"
                >
                  {copiedSlug === portal.slug ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <Link
                  href={`/p/${portal.slug}`}
                  target="_blank"
                  className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all shadow-none hover:shadow-sm"
                  title="Preview Portal"
                >
                  <Eye className="w-4 h-4" />
                </Link>
                <Link
                  href={`/dashboard/portals/${portal.id}`}
                  className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all shadow-none hover:shadow-sm"
                  title="Settings"
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
                className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                title="Delete"
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
    </>
  )
}


