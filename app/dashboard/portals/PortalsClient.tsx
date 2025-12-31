"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import {
    FolderOpen,
    Activity,
    Plus,
    Search,
    ChevronRight,
    LayoutGrid,
    List as ListIcon,
    Zap,
    Lightbulb,
    Lock,
    Palette,
    Share2,
    Zap as ZapIcon,
    Mail,
    ArrowRight
} from "lucide-react"
import PortalList from "../components/PortalList"

interface PortalsClientProps {
    initialPortals: any[]
}

export default function PortalsClient({ initialPortals }: PortalsClientProps) {
    const [portals, setPortals] = useState(initialPortals)
    const [activeTab, setActiveTab] = useState("all")
    const [searchQuery, setSearchQuery] = useState("")
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
    const [activeTipIndex, setActiveTipIndex] = useState(0)

    // Handle portals updates from children
    const handlePortalsUpdate = (updatedPortals: any[]) => {
        setPortals(updatedPortals)
    }

    const tabs = [
        { id: "all", name: "All Portals", icon: FolderOpen, description: "Manage all your upload portals" },
        { id: "active", name: "Active", icon: Activity, description: "Only currently active portals" },
        { id: "archived", name: "Archived", icon: Zap, description: "Disabled portals" },
    ]

    const filteredPortals = portals.filter((p: any) => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.slug.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTab = activeTab === "all" ||
            (activeTab === "active" && p.isActive) ||
            (activeTab === "archived" && !p.isActive);
        return matchesSearch && matchesTab;
    })

    const activePortals = portals.filter(p => p.isActive)
    const archivedPortals = portals.filter(p => !p.isActive)

    const proTips = [
        {
            icon: Palette,
            title: "Custom Branding",
            description: "Customize your portal with brand colors and logos for a professional look.",
        },
        {
            icon: ZapIcon,
            title: "Smart Notifications",
            description: "Enable email alerts to get notified instantly when clients upload files.",
        },
        {
            icon: Share2,
            title: "Easy Sharing",
            description: "Use unique short links or QR codes to share your portals anywhere.",
        },
        {
            icon: Lock,
            title: "Enhanced Security",
            description: "Protect your portals with passwords to ensure only authorized access.",
        }
    ]

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveTipIndex((prev) => (prev + 1) % proTips.length)
        }, 8000)
        return () => clearInterval(interval)
    }, [])

    const CurrentTipIcon = proTips[activeTipIndex].icon

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Secure Portals</h1>
                    <p className="text-slate-500 mt-1 text-lg">Manage and monitor your secure file collection endpoints.</p>
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
                <aside className="lg:w-64 flex-shrink-0 space-y-8">
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

                    {/* Dynamic Pro Tips Banner */}
                    <div className="w-full p-6 rounded-2xl bg-slate-900 text-white relative overflow-hidden group">
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-1.5 bg-white/10 rounded-lg">
                                    <Lightbulb className="w-4 h-4 text-amber-400" />
                                </div>
                                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Pro Tip</h4>
                            </div>

                            <div className="h-24">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activeTipIndex}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <div className="flex items-center gap-2 mb-2 text-amber-400 font-bold text-sm">
                                            <CurrentTipIcon className="w-4 h-4" />
                                            {proTips[activeTipIndex].title}
                                        </div>
                                        <p className="text-sm text-slate-300 leading-relaxed">
                                            {proTips[activeTipIndex].description}
                                        </p>
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            <div className="flex gap-1 mt-2">
                                {proTips.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setActiveTipIndex(i)}
                                        className={`h-1 rounded-full transition-all duration-300 ${i === activeTipIndex ? "w-6 bg-amber-400" : "w-1.5 bg-slate-700 hover:bg-slate-600"
                                            }`}
                                        aria-label={`Show tip ${i + 1}`}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
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
                                aria-label="Grid view"
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode("list")}
                                className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                                aria-label="List view"
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
                                initialPortals={filteredPortals}
                                allPortals={portals}
                                onPortalsUpdate={handlePortalsUpdate}
                                className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "space-y-4"}
                                emptyStateTab={activeTab}
                                activePortalsCount={activePortals.length}
                                archivedPortalsCount={archivedPortals.length}
                            />
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    )
}
