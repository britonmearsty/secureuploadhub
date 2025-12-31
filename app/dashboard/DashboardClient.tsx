"use client"

import { motion } from "framer-motion"
import StatsOverview from "./components/StatsOverview"
import QuickActions from "./components/QuickActions"
import PortalList from "./components/PortalList"
import RecentUploads from "./components/RecentUploads"
import PostHogIdentify from "./components/PostHogIdentify"
import {
    ArrowUpRight,
    Plus,
    ArrowRight
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
            <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
                        Good afternoon, {user.name?.split(" ")[0]}
                    </h1>
                    <p className="text-slate-500 font-medium">
                        Here's what's happening with your portals today.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard/portals/new"
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-slate-200/50 active:scale-95 font-bold text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        New Portal
                    </Link>
                </div>
            </header>

            {/* Stats Grid */}
            <StatsOverview initialStats={stats} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                {/* Left Column: Active Portals (Main Focus) */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-900">Active Portals</h3>
                        </div>
                        <Link
                            href="/dashboard/portals"
                            className="group flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors bg-white px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300"
                        >
                            Manage All
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </div>

                    <PortalList
                        initialPortals={portals.slice(0, 4)}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    />

                    {portals.length > 4 && (
                        <Link
                            href="/dashboard/portals"
                            className="flex items-center justify-center py-4 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all text-sm font-bold"
                        >
                            View {portals.length - 4} more portals
                        </Link>
                    )}
                </div>

                {/* Right Column: Quick Actions & Activity */}
                <div className="lg:col-span-1 flex flex-col gap-8">
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-900 px-1">Quick Access</h3>
                        <QuickActions />
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-sm font-bold text-slate-900">Recent Activity</h3>
                            <Link href="/dashboard/assets" className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors">
                                View All
                            </Link>
                        </div>
                        <RecentUploads uploads={uploads} />
                    </div>
                </div>
            </div>
        </div>
    )
}
