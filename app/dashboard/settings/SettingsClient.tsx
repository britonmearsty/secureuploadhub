"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { User as UserIcon, Bell, Monitor, ChevronRight } from "lucide-react"
import ProfileSettings from "./components/ProfileSettings"
import NotificationSettings from "./components/NotificationSettings"
import ThemeSettings from "./components/ThemeSettings"

interface User {
    id: string
    name: string | null
    email: string | null
    image: string | null
    notificationEmail: boolean
    marketingEmail: boolean
    theme: string
}

interface SettingsClientProps {
    user: User
}

export default function SettingsClient({ user }: SettingsClientProps) {
    const [activeTab, setActiveTab] = useState("profile")

    const tabs = [
        { id: "profile", name: "Profile", icon: UserIcon, description: "Manage your personal information" },
        { id: "notifications", name: "Notifications", icon: Bell, description: "Manage how we contact you" },
        { id: "appearance", name: "Appearance", icon: Monitor, description: "Customize the interface" },
    ]

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Settings</h1>
                <p className="text-slate-500 mt-1 text-lg">Manage your account preferences and application settings.</p>
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
                                        <motion.div
                                            layoutId="settings-active-indicator"
                                            className="ml-auto"
                                            initial={{ opacity: 0, x: -5 }}
                                            animate={{ opacity: 1, x: 0 }}
                                        >
                                            <ChevronRight className="w-4 h-4 text-slate-400" />
                                        </motion.div>
                                    )}
                                </button>
                            )
                        })}
                    </nav>
                </aside>

                {/* Content Area */}
                <main className="flex-1">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-6 border-b border-slate-100 bg-slate-50/30">
                                    <h2 className="text-xl font-semibold text-slate-900 capitalize">
                                        {tabs.find(t => t.id === activeTab)?.name} Settings
                                    </h2>
                                    <p className="text-sm text-slate-500 mt-1">
                                        {tabs.find(t => t.id === activeTab)?.description}
                                    </p>
                                </div>

                                <div className="p-8">
                                    {/* We need to pass the user prop correctly to the components */}
                                    {activeTab === "profile" && <ProfileSettings user={user} />}
                                    {activeTab === "notifications" && (
                                        <NotificationSettings
                                            notificationEmail={user.notificationEmail}
                                            marketingEmail={user.marketingEmail}
                                        />
                                    )}
                                    {activeTab === "appearance" && <ThemeSettings theme={user.theme} />}
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    )
}
