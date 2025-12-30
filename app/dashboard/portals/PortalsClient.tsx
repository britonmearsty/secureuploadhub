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
    Zap,
    Lightbulb,
    X,
    Palette,
    Zap as ZapIcon,
    Share2,
    BarChart3,
    Lock,
    Clock as ClockIcon,
    FileText,
    Mail,
} from "lucide-react"
import PortalList from "../components/PortalList"

interface PortalsClientProps {
    initialPortals: any[]
}

export default function PortalsClient({ initialPortals }: PortalsClientProps) {
    const [activeTab, setActiveTab] = useState("all")
    const [searchQuery, setSearchQuery] = useState("")
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
    const [showProTipsModal, setShowProTipsModal] = useState(false)

    const tabs = [
        { id: "all", name: "All Portals", icon: FolderOpen, description: "Manage all your upload portals" },
        { id: "active", name: "Active", icon: Activity, description: "Only currently active portals" },
        { id: "archived", name: "Archived", icon: Zap, description: "Disabled portals" },
    ]

    const filteredPortals = initialPortals.filter((p: any) => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.slug.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTab = activeTab === "all" ||
            (activeTab === "active" && p.isActive) ||
            (activeTab === "archived" && !p.isActive);
        return matchesSearch && matchesTab;
    })

    const activePortals = initialPortals.filter(p => p.isActive)
    const archivedPortals = initialPortals.filter(p => !p.isActive)

    const proTips = [
        {
            icon: Palette,
            title: "Custom Branding",
            description: "Use your brand colors, logos, and custom domain to create a seamless experience for clients.",
            details: [
                "Set primary color matching your brand palette",
                "Upload your logo for portal header",
                "Configure custom domain for white-label experience",
                "Customize success messages and instructions"
            ]
        },
        {
            icon: ZapIcon,
            title: "Enable Key Features",
            description: "Unlock powerful features to enhance your workflow and client satisfaction.",
            details: [
                "Enable email notifications for new uploads",
                "Set up automatic file expiration policies",
                "Enable download limits to protect shared files",
                "Configure virus scanning for uploaded files",
                "Enable password protection for extra security"
            ]
        },
        {
            icon: Share2,
            title: "Smart Sharing",
            description: "Distribute your portal links effectively to maximize engagement.",
            details: [
                "Generate unique sharing links with tracking",
                "Create QR codes for easy sharing in print materials",
                "Use short, memorable URLs for word-of-mouth",
                "Track who accesses your portal and when",
                "Set up automatic reminders for pending uploads"
            ]
        },
        {
            icon: BarChart3,
            title: "Monitor Activity",
            description: "Track portal performance and client engagement with detailed analytics.",
            details: [
                "View upload frequency and peak times",
                "Monitor file types and sizes being submitted",
                "Track client engagement and completion rates",
                "Identify inactive portals to archive them",
                "Export reports for documentation"
            ]
        },
        {
            icon: Lock,
            title: "Security Best Practices",
            description: "Keep client data safe with advanced security configurations.",
            details: [
                "Enable end-to-end encryption for uploads",
                "Set up two-factor authentication for access",
                "Configure IP allowlists for corporate networks",
                "Enable audit logging for compliance requirements",
                "Review and update security settings regularly"
            ]
        },
        {
            icon: Mail,
            title: "Email Optimization",
            description: "Craft engaging email communications to increase upload completion.",
            details: [
                "Personalize portal invitations with client names",
                "Create clear, concise upload instructions",
                "Set appropriate reminders for pending uploads",
                "Use branded email templates for consistency",
                "A/B test subject lines for better open rates"
            ]
        }
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

                    <button
                        onClick={() => setShowProTipsModal(true)}
                        className="mt-8 w-full p-6 rounded-2xl bg-slate-900 text-white relative overflow-hidden hover:bg-slate-800 transition-colors group"
                    >
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2">
                                <Lightbulb className="w-4 h-4 text-amber-400" />
                                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Pro Tips</h4>
                            </div>
                            <p className="text-sm text-slate-300 leading-relaxed text-left">
                                Learn how to maximize your portals with advanced features and best practices.
                            </p>
                            <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 group-hover:text-amber-300 transition-colors">
                                Explore Tips <ChevronRight className="w-3 h-3" />
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-800 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50" />
                    </button>
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
                                initialPortals={filteredPortals}
                                className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "space-y-4"}
                                emptyStateTab={activeTab}
                                activePortalsCount={activePortals.length}
                                archivedPortalsCount={archivedPortals.length}
                            />
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>

            {/* Pro Tips Modal */}
            <AnimatePresence>
                {showProTipsModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowProTipsModal(false)}
                            className="fixed inset-0 z-[150] bg-slate-900/50 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed inset-0 z-[160] flex items-center justify-center p-4 pointer-events-none"
                        >
                            <div className="w-full max-w-3xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto">
                                {/* Modal Header */}
                                <div className="px-8 py-6 border-b border-slate-200 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                                            <Lightbulb className="w-6 h-6 text-amber-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-slate-900">Pro Tips & Best Practices</h2>
                                            <p className="text-sm text-slate-500 mt-0.5">Maximize the power of your portals</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowProTipsModal(false)}
                                        className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                                    >
                                        <X className="w-5 h-5 text-slate-400" />
                                    </button>
                                </div>

                                {/* Modal Content */}
                                <div className="overflow-y-auto flex-1">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8">
                                        {proTips.map((tip, index) => {
                                            const Icon = tip.icon
                                            return (
                                                <motion.div
                                                    key={index}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    className="bg-slate-50 rounded-2xl p-6 border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all"
                                                >
                                                    <div className="flex items-start gap-4">
                                                        <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center flex-shrink-0">
                                                            <Icon className="w-6 h-6 text-white" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-bold text-slate-900 text-lg leading-snug">{tip.title}</h3>
                                                            <p className="text-sm text-slate-600 mt-1 leading-relaxed">{tip.description}</p>
                                                        </div>
                                                    </div>

                                                    <motion.div
                                                        initial={false}
                                                        className="mt-4 pt-4 border-t border-slate-200"
                                                    >
                                                        <ul className="space-y-2">
                                                            {tip.details.map((detail, i) => (
                                                                <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-900 mt-1.5 flex-shrink-0" />
                                                                    <span>{detail}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </motion.div>
                                                </motion.div>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Modal Footer */}
                                <div className="px-8 py-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                                    <p className="text-sm text-slate-500">
                                        💡 Check back regularly for new tips and feature updates
                                    </p>
                                    <button
                                        onClick={() => setShowProTipsModal(false)}
                                        className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all active:scale-95"
                                    >
                                        Got it
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}
