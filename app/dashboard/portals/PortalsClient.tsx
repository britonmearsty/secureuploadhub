"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import {
    FolderOpen,
    Activity,
    Plus,
    Search,
    LayoutGrid,
    List as ListIcon,
    Zap,
} from "lucide-react"
import PortalList from "../components/PortalList"

interface PortalsClientProps {
    initialPortals: any[]
}

export default function PortalsClient({ initialPortals }: PortalsClientProps) {
    const [activeFilter, setActiveFilter] = useState("all")
    const [searchQuery, setSearchQuery] = useState("")
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

    const filters = [
        { id: "all", name: "All Portals", icon: FolderOpen, description: "Manage all your upload portals" },
        { id: "active", name: "Active", icon: Activity, description: "Only currently active portals" },
        { id: "archived", name: "Archived", icon: Zap, description: "Disabled portals" },
    ]

    const filteredPortals = initialPortals.filter((p: any) => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.slug.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = activeFilter === "all" ||
            (activeFilter === "active" && p.isActive) ||
            (activeFilter === "archived" && !p.isActive);
        return matchesSearch && matchesFilter;
    })

    const activePortals = initialPortals.filter(p => p.isActive)
    const archivedPortals = initialPortals.filter(p => !p.isActive)

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Portals</h1>
                    <p className="text-slate-500 mt-1 text-lg">Your branded destinations for secure file collection.</p>
                </div>
                <Link
                    href="/dashboard/portals/new"
                    className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all shadow-sm hover:shadow-md active:scale-95 font-bold text-sm w-fit"
                >
                    <Plus className="w-5 h-5" />
                    Create New Portal
                </Link>
            </div>

            {/* Main Content */}
            <main className="flex-1 min-w-0">
                <div className="mb-6 flex flex-col gap-4">
                    {/* Filters */}
                    <div className="flex flex-wrap gap-2">
                        {filters.map((filter) => {
                            const Icon = filter.icon
                            const isActive = activeFilter === filter.id
                            return (
                                <button
                                    key={filter.id}
                                    onClick={() => setActiveFilter(filter.id)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm ${isActive
                                        ? "bg-slate-900 text-white shadow-md"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {filter.name}
                                </button>
                            )
                        })}
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by name or slug..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900 transition-all outline-none text-sm"
                            />
                        </div>
                        <div className="flex items-center gap-2 p-1 bg-slate-100/50 border border-slate-200 rounded-xl w-fit">
                            <button
                                onClick={() => setViewMode("grid")}
                                className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode("list")}
                                className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                            >
                                <ListIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeFilter + viewMode}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        <PortalList
                            initialPortals={filteredPortals}
                            className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "space-y-4"}
                            emptyStateTab={activeFilter}
                            activePortalsCount={activePortals.length}
                            archivedPortalsCount={archivedPortals.length}
                        />
                    </motion.div>
                </AnimatePresence>
            </main>

        </div>
    )
}
