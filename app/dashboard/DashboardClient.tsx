"use client"

import { motion } from "framer-motion"
import { useState, useEffect } from "react"
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
    const [greeting, setGreeting] = useState("Good afternoon");

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting("Good morning");
        else if (hour < 18) setGreeting("Good afternoon");
        else setGreeting("Good evening");
    }, []);

    return (
        <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
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
                        {greeting}, {user.name?.split(" ")[0]}
                    </h1>
                    <p className="text-slate-500 font-medium text-lg">
                        Manage your secure file collection and track client uploads in real-time.
                    </p>
                </div>

                <nav className="flex items-center gap-3" aria-label="Primary Actions">
                    <Link
                        href="/dashboard/portals/new"
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-slate-200/50 active:scale-95 font-bold text-sm"
                        aria-label="Create a new secure portal"
                    >
                        <Plus className="w-4 h-4" aria-hidden="true" />
                        Create Portal
                    </Link>
                </nav>
            </header>

            {/* Stats Grid */}
            <section aria-label="Dashboard Statistics">
                <StatsOverview initialStats={stats} />
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                {/* Left Column: Active Portals (Main Focus) */}
                <section className="lg:col-span-2 flex flex-col gap-6" aria-labelledby="active-portals-heading">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h2 id="active-portals-heading" className="text-lg font-bold text-slate-900">Active Client Portals</h2>
                        </div>
                        <Link
                            href="/dashboard/portals"
                            className="group flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
                            aria-label="View all portals"
                        >
                            View All Portals
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
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
                            aria-label={`View ${portals.length - 4} more active portals`}
                        >
                            View {portals.length - 4} more portals
                        </Link>
                    )}
                </section>

                {/* Right Column: Quick Actions & Activity */}
                <aside className="lg:col-span-1 flex flex-col gap-8">
                    <nav className="space-y-4" aria-labelledby="quick-actions-heading">
                        <h2 id="quick-actions-heading" className="text-sm font-bold text-slate-900 px-1">Quick Actions</h2>
                        <QuickActions />
                    </nav>

                    <section className="space-y-4" aria-labelledby="recent-activity-heading">
                        <div className="flex items-center justify-between px-1">
                            <h2 id="recent-activity-heading" className="text-sm font-bold text-slate-900">Recent Activity</h2>
                            <Link
                                href="/dashboard/assets"
                                className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors"
                                aria-label="View all file activity"
                            >
                                View All
                            </Link>
                        </div>
                        <RecentUploads uploads={uploads} />
                    </section>
                </aside>
            </div>
        </main>
    )
}
