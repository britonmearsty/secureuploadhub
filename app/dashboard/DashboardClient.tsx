"use client"

import { motion } from "framer-motion"
import StatsOverview from "./components/StatsOverview"
import QuickActions from "./components/QuickActions"
import PortalList from "./components/PortalList"
import RecentUploads from "./components/RecentUploads"
import PostHogIdentify from "./components/PostHogIdentify"
import {
    LayoutDashboard,
    ArrowUpRight,
    Plus,
    FolderOpen,
    ArrowRight,
    Sparkles
} from "lucide-react"
import Link from "next/link"

interface DashboardClientProps {
    user: any
    stats: any
    portals: any[]
    uploads: any[]
}

export default function DashboardClient({ user, stats, portals, uploads }: DashboardClientProps) {
    return (
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            {/* PostHog User Identification */}
            <PostHogIdentify
                userId={user.id!}
                email={user.email}
                name={user.name}
            />

            {/* Header Section */}
            <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-slate-900 rounded-lg">
                            <LayoutDashboard className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Overview</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        Hello, {user.name?.split(" ")[0]}
                        <motion.span
                            animate={{ rotate: [0, 20, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
                            className="origin-bottom-right"
                        >
                            👋
                        </motion.span>
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg font-medium">
                        Your secure upload ecosystem is running smoothly.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard/portals/new"
                        className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-900 rounded-2xl hover:bg-slate-50 transition-all shadow-sm hover:shadow-md active:scale-95 font-bold text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        New Portal
                    </Link>
                    <Link
                        href="/dashboard/billing"
                        className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95 font-bold text-sm"
                    >
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        Upgrade Plan
                    </Link>
                </div>
            </header>

            {/* Stats Grid */}
            <StatsOverview initialStats={stats} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
                {/* Left Column: Actions & Portals */}
                <div className="lg:col-span-2 space-y-12">
                    <QuickActions />

                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FolderOpen className="w-5 h-5 text-slate-400" />
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Active Portals</h3>
                            </div>
                            <Link
                                href="/dashboard/portals"
                                className="group flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors"
                            >
                                Manage All Portals
                                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                        </div>
                        <PortalList
                            initialPortals={portals.slice(0, 2)}
                            className="grid grid-cols-1 md:grid-cols-2 gap-6"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {portals.length > 2 && (
                                <Link
                                    href="/dashboard/portals"
                                    className="flex items-center justify-center py-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all text-sm font-bold"
                                >
                                    View {portals.length - 2} more portals
                                </Link>
                            )}
                            <Link
                                href="/dashboard/assets"
                                className={`flex items-center justify-center py-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all text-sm font-bold ${portals.length <= 2 ? 'md:col-span-2' : ''}`}
                            >
                                View All Activity
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Right Column: Activity Feed */}
                <div className="lg:col-span-1 lg:mt-8">
                    <RecentUploads uploads={uploads} />
                </div>
            </div>
        </div>
    )
}
