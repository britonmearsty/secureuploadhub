"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import posthog from "posthog-js"
import { Plus, ExternalLink, Settings, Trash2, Copy, Check, ToggleLeft, ToggleRight } from "lucide-react"

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

export default function PortalList() {
  const [portals, setPortals] = useState<Portal[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchPortals()
    const interval = setInterval(fetchPortals, 5000)
    return () => clearInterval(interval)
  }, [])

  async function fetchPortals() {
    try {
      const res = await fetch("/api/portals")
      if (res.ok) {
        const data = await res.json()
        setPortals(data)
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

        // Track portal status toggle
        posthog.capture('portal_status_toggled', {
          portal_id: id,
          portal_name: portal?.name,
          portal_slug: portal?.slug,
          previous_status: isActive ? 'active' : 'inactive',
          new_status: !isActive ? 'active' : 'inactive',
        });
      }
    } catch (error) {
      console.error("Error toggling portal:", error)
      posthog.captureException(error as Error);
    }
  }

  async function deletePortal(id: string) {
    if (!confirm("Are you sure you want to delete this portal? All upload history will be lost.")) {
      return
    }

    const portal = portals.find(p => p.id === id);

    setDeletingId(id)
    try {
      const res = await fetch(`/api/portals/${id}`, { method: "DELETE" })
      if (res.ok) {
        setPortals(portals.filter(p => p.id !== id))

        // Track portal deletion - potential churn indicator
        posthog.capture('portal_deleted', {
          portal_id: id,
          portal_name: portal?.name,
          portal_slug: portal?.slug,
          total_uploads: portal?._count?.uploads || 0,
        });
      }
    } catch (error) {
      console.error("Error deleting portal:", error)
      posthog.captureException(error as Error);
    } finally {
      setDeletingId(null)
    }
  }

  function copyPortalLink(slug: string) {
    const url = `${window.location.origin}/p/${slug}`
    navigator.clipboard.writeText(url)
    setCopiedSlug(slug)
    setTimeout(() => setCopiedSlug(null), 2000)

    const portal = portals.find(p => p.slug === slug);

    // Track portal link copy - indicates intent to share
    posthog.capture('portal_link_copied', {
      portal_id: portal?.id,
      portal_name: portal?.name,
      portal_slug: slug,
      portal_url: url,
    });
  }

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-20 bg-gray-100 rounded"></div>
          <div className="h-20 bg-gray-100 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-semibold text-gray-900 text-lg">Your Upload Portals</h3>
        <Link
          href="/dashboard/portals/new"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Create Portal
        </Link>
      </div>

      {portals.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-gray-400" />
          </div>
          <h4 className="font-medium text-gray-900 mb-2">No portals yet</h4>
          <p className="text-gray-600 text-sm mb-4">
            Create your first upload portal to start collecting files from clients
          </p>
          <Link
            href="/dashboard/portals/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Create Your First Portal
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {portals.map((portal) => (
            <div key={portal.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: portal.primaryColor }}
                  >
                    {portal.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{portal.name}</h4>
                    <p className="text-sm text-gray-500">
                      /p/{portal.slug} · {portal._count.uploads} uploads
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    portal.isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}>
                    {portal.isActive ? "Active" : "Inactive"}
                  </span>

                  <button
                    onClick={() => copyPortalLink(portal.slug)}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Copy link"
                  >
                    {copiedSlug === portal.slug ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>

                  <Link
                    href={`/p/${portal.slug}`}
                    target="_blank"
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Open portal"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>

                  <button
                    onClick={() => togglePortalStatus(portal.id, portal.isActive)}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title={portal.isActive ? "Deactivate" : "Activate"}
                  >
                    {portal.isActive ? (
                      <ToggleRight className="w-5 h-5 text-green-500" />
                    ) : (
                      <ToggleLeft className="w-5 h-5" />
                    )}
                  </button>

                  <Link
                    href={`/dashboard/portals/${portal.id}`}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </Link>

                  <button
                    onClick={() => deletePortal(portal.id)}
                    disabled={deletingId === portal.id}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

