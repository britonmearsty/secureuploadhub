"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import {
    FolderOpen,
    Activity,
    Settings2,
    Plus,
    Search,
    ChevronRight,
    Filter,
    Grid,
    List as ListIcon,
    LayoutGrid,
    Zap
} from "lucide-react"
import PortalList from "../components/PortalList"

interface PortalsClientProps {
    initialPortals: any[]
}

export default function PortalsClient({ initialPortals }: PortalsClientProps) {
    const [activeTab, setActiveTab] = useState("all")
    const [searchQuery, setSearchQuery] = useState("")
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

    const tabs = [
        { id: "all", name: "All Portals", icon: FolderOpen, description: "Manage all your upload portals" },
        { id: "active", name: "Active", icon: Activity, description: "Only currently active portals" },
        { id: "archived", name: "Archived", icon: Zap, description: "Disabled portals" },
    ]

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

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Navigation Sidebar */}
                <aside className="lg:w-64 flex-shrink-0">
                    <nav className="space-y-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon
                            const isActive = activeTab === tab.id
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                        ? "bg-white shadow-sm border border-slate-200 text-slate-900"
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                        }`}
                                >
                                    <Icon className={`w-5 h-5 ${isActive ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600"}`} />
                                    <span className="font-medium text-sm">{tab.name}</span>
                                    {isActive && (
                                        <motion.div layoutId="portals-active-indicator" className="ml-auto">
                                            <ChevronRight className="w-4 h-4 text-slate-400" />
                                        </motion.div>
                                    )}
                                </button>
                            )
                        })}
                    </nav>

                    <div className="mt-8 p-6 rounded-2xl bg-slate-900 text-white relative overflow-hidden">
                        <div className="relative z-10">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Pro Tip</h4>
                            <p className="text-sm text-slate-300 leading-relaxed">
                                Use custom logos and colors to make your client experience feel premium.
                            </p>
                            <button className="mt-4 text-xs font-bold flex items-center gap-1.5 text-white hover:text-slate-300 transition-colors">
                                Branding Guide <ChevronRight className="w-3 h-3" />
                            </button>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-800 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50" />
                    </div>
                </aside>

                {/* Content Area */}
                <main className="flex-1 min-w-0">
                    <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
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

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab + viewMode}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <PortalList
                                initialPortals={initialPortals.filter((p: any) => {
                                    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        p.slug.toLowerCase().includes(searchQuery.toLowerCase());
                                    const matchesTab = activeTab === "all" ||
                                        (activeTab === "active" && p.isActive) ||
                                        (activeTab === "archived" && !p.isActive);
                                    return matchesSearch && matchesTab;
                                })}
                                className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "space-y-4"}
                            />
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    )
}
