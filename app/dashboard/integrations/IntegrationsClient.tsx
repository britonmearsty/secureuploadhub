"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Cloud,
    Settings2,
    History,
    ChevronRight,
    CheckCircle2,
    AlertCircle,
    Link,
    Zap,
    LayoutGrid,
    Search,
    ArrowUpRight,
    Loader2
} from "lucide-react"
import ConnectedAccounts from "../settings/components/ConnectedAccounts"

export default function IntegrationsClient() {
    const [activeTab, setActiveTab] = useState("available")
    const [searchQuery, setSearchQuery] = useState("")
    const [syncSettings, setSyncSettings] = useState({
        autoSync: true,
        deleteAfterSync: false,
        syncInterval: 3600
    })
    const [savingSettings, setSavingSettings] = useState(false)
    const [loadingSettings, setLoadingSettings] = useState(true)
    const [connectedAccounts, setConnectedAccounts] = useState<string[]>([])

    const tabs = [
        { id: "available", name: "Available", icon: LayoutGrid, description: "Browse and connect cloud storage providers" },
        { id: "connected", name: "Connected", icon: Link, description: "View and manage connected storage accounts" },
        { id: "settings", name: "Sync Settings", icon: Settings2, description: "Customize automatic file synchronization" },
    ]

    // Load sync settings and connected accounts on mount
    useEffect(() => {
        async function loadSyncSettings() {
            try {
                const res = await fetch("/api/storage/sync-settings")
                if (res.ok) {
                    const data = await res.json()
                    setSyncSettings({
                        autoSync: data.autoSync ?? true,
                        deleteAfterSync: data.deleteAfterSync ?? false,
                        syncInterval: data.syncInterval ?? 3600
                    })
                }
            } catch (error) {
                console.error("Error loading sync settings:", error)
            } finally {
                setLoadingSettings(false)
            }
        }

        async function loadConnectedAccounts() {
            try {
                const res = await fetch("/api/storage/accounts")
                if (res.ok) {
                    const data = await res.json()
                    const connected = data.filter((a: any) => a.isConnected).map((a: any) => a.provider)
                    setConnectedAccounts(connected)
                }
            } catch (error) {
                console.error("Error loading connected accounts:", error)
            }
        }

        loadSyncSettings()
        loadConnectedAccounts()
    }, [])

    async function saveSyncSettings() {
        setSavingSettings(true)
        try {
            const res = await fetch("/api/storage/sync-settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(syncSettings)
            })

            if (res.ok) {
                // Success - could add a toast notification here
                console.log("Sync settings saved")
            } else {
                console.error("Failed to save sync settings")
            }
        } catch (error) {
            console.error("Error saving sync settings:", error)
        } finally {
            setSavingSettings(false)
        }
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Cloud Storage Integrations</h1>
                <p className="text-slate-500 mt-1 text-lg">Seamlessly connect your cloud storage providers to automatically sync and backup uploaded files.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar Nav */}
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
                                        <motion.div layoutId="integrations-active" className="ml-auto">
                                            <ChevronRight className="w-4 h-4 text-slate-400" />
                                        </motion.div>
                                    )}
                                </button>
                            )
                        })}
                    </nav>
                </aside>

                {/* content */}
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
                                    <h2 className="text-xl font-semibold text-slate-900">
                                        {tabs.find(t => t.id === activeTab)?.name}
                                    </h2>
                                    <p className="text-sm text-slate-500 mt-1">
                                        {tabs.find(t => t.id === activeTab)?.description}
                                    </p>
                                </div>

                                <div className="p-8">
                                    {activeTab === "available" && (
                                        <div className="space-y-8">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Search integrations..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all outline-none"
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* Featured section in available */}
                                                <div className="col-span-1 md:col-span-2">
                                                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Cloud Storage</h3>
                                                </div>

                                                <IntegrationCard
                                                    name="Google Drive"
                                                    description="Automatically sync uploaded files to your Google Drive folders."
                                                    icon={<GoogleDriveIcon />}
                                                    category="Storage"
                                                    status="disconnected"
                                                    provider="google"
                                                    isConnected={connectedAccounts.includes("google")}
                                                />
                                                <IntegrationCard
                                                    name="Dropbox"
                                                    description="Connect your Dropbox account to store client uploads securely."
                                                    icon={<DropboxIcon />}
                                                    category="Storage"
                                                    status="disconnected"
                                                    provider="dropbox"
                                                    isConnected={connectedAccounts.includes("dropbox")}
                                                />
                                                <IntegrationCard
                                                    name="Box"
                                                    description="Enterprise-grade content management integration."
                                                    icon={<Cloud className="w-6 h-6 text-blue-500" />}
                                                    category="Storage"
                                                    status="coming-soon"
                                                />
                                                <IntegrationCard
                                                    name="Zapier"
                                                    description="Trigger workflows in 5,000+ apps when a file is uploaded."
                                                    icon={<Zap className="w-6 h-6 text-orange-500" />}
                                                    category="Automation"
                                                    status="coming-soon"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === "connected" && (
                                        <div className="space-y-6">
                                            <ConnectedAccounts />
                                        </div>
                                    )}

                                    {activeTab === "settings" && (
                                        <div className="space-y-8">
                                            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                                                <h3 className="font-semibold text-slate-900 mb-6">Automatic Synchronization Settings</h3>
                                                <div className="space-y-5">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-900">Enable auto-sync for new uploads</p>
                                                            <p className="text-xs text-slate-500">Automatically upload files to connected cloud storage when received.</p>
                                                        </div>
                                                        <Switch
                                                            checked={syncSettings.autoSync}
                                                            onChange={(value) => setSyncSettings({ ...syncSettings, autoSync: value })}
                                                        />
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-900">Delete local files after successful sync</p>
                                                            <p className="text-xs text-slate-500">Automatically remove files from SecureUpload storage after cloud backup.</p>
                                                        </div>
                                                        <Switch
                                                            checked={syncSettings.deleteAfterSync}
                                                            onChange={(value) => setSyncSettings({ ...syncSettings, deleteAfterSync: value })}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-900 mb-2">Sync interval (seconds)</label>
                                                        <input
                                                            type="number"
                                                            min="300"
                                                            max="86400"
                                                            step="300"
                                                            value={syncSettings.syncInterval}
                                                            onChange={(e) => {
                                                                const value = parseInt(e.target.value)
                                                                if (value >= 300 && value <= 86400) {
                                                                    setSyncSettings({ ...syncSettings, syncInterval: value })
                                                                }
                                                            }}
                                                            onBlur={(e) => {
                                                                const value = parseInt(e.target.value)
                                                                if (value < 300) {
                                                                    setSyncSettings({ ...syncSettings, syncInterval: 300 })
                                                                } else if (value > 86400) {
                                                                    setSyncSettings({ ...syncSettings, syncInterval: 86400 })
                                                                }
                                                            }}
                                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none"
                                                        />
                                                        <p className="text-xs text-slate-500 mt-1">Set between 5 minutes (300s) and 24 hours (86400s)</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-6 rounded-2xl bg-amber-50 border border-amber-100 flex gap-4">
                                                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                                                <div>
                                                    <p className="text-sm font-semibold text-amber-900">Storage Optimization Tip</p>
                                                    <p className="text-xs text-amber-700 mt-1">
                                                        Enable auto-sync with automatic deletion to maximize your storage capacity and ensure files are safely backed up to the cloud.
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={saveSyncSettings}
                                                disabled={savingSettings}
                                                className="w-full px-6 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                                            >
                                                {savingSettings ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        Saving...
                                                    </>
                                                ) : (
                                                    "Save Settings"
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    )
}

function IntegrationCard({ name, description, icon, category, status, provider, isConnected }: any) {
    const [configuringProvider, setConfiguringProvider] = useState<string | null>(null)

    const handleConfigure = async () => {
        if (!provider || isConnected) return

        setConfiguringProvider(provider)
        // This will trigger the OAuth flow via signIn
        const { signIn: nextAuthSignIn } = await import("next-auth/react")
        nextAuthSignIn(provider, { callbackUrl: "/dashboard/integrations?tab=connected" })
    }

    return (
        <div className="group p-6 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm transition-all flex flex-col">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 group-hover:bg-white transition-colors">
                    {icon}
                </div>
                {status === 'coming-soon' ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-400 px-2 py-1 rounded">Coming Soon</span>
                ) : isConnected ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-600 px-2 py-1 rounded">Connected</span>
                ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-600 px-2 py-1 rounded">Available</span>
                )}
            </div>
            <h4 className="font-bold text-slate-900">{name}</h4>
            <p className="text-xs text-slate-500 mt-1 mb-6 flex-1">{description}</p>
            <button
                onClick={handleConfigure}
                disabled={status === 'coming-soon' || configuringProvider === provider || isConnected}
                className={`w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${status === 'coming-soon' || isConnected
                        ? "bg-slate-50 text-slate-400 cursor-not-allowed border border-slate-200"
                        : "bg-slate-900 text-white hover:bg-slate-800 shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    }`}
            >
                {configuringProvider === provider ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Connecting...
                    </>
                ) : (
                    <>
                        {status === 'coming-soon' ? 'Coming Soon' : isConnected ? 'Already Connected' : 'Configure Account'}
                        {status !== 'coming-soon' && !isConnected && <ArrowUpRight className="w-4 h-4" />}
                    </>
                )}
            </button>
        </div>
    )
}

function Switch({ checked, onChange }: { checked: boolean; onChange?: (value: boolean) => void }) {
    return (
        <button
            onClick={() => onChange?.(!checked)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-slate-900' : 'bg-slate-200'
                }`}
            type="button"
            role="switch"
            aria-checked={checked}
        >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'
                }`} />
        </button>
    )
}

function GoogleDriveIcon() {
    return (
        <svg className="w-6 h-6" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
    )
}

function DropboxIcon() {
    return (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#0061FF">
            <path d="M6 2L0 6l6 4-6 4 6 4 6-4-6-4 6-4-6-4zm12 0l-6 4 6 4-6 4 6 4 6-4-6-4 6-4-6-4zM6 14l6 4 6-4-6-4-6 4z" />
        </svg>
    )
}
