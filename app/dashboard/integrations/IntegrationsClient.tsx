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
    const [syncError, setSyncError] = useState<string | null>(null)

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
                    const connected = data.accounts.filter((a: any) => a.isConnected).map((a: any) => a.provider)
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
        setSyncError(null)

        const interval = syncSettings.syncInterval
        if (isNaN(interval) || interval < 300 || interval > 86400) {
            setSyncError("Sync interval must be between 300 (5 mins) and 86400 (24 hours)")
            return
        }

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
                setSyncError("Failed to save sync settings. Please try again.")
            }
        } catch (error) {
            console.error("Error saving sync settings:", error)
            setSyncError("An unexpected error occurred.")
        } finally {
            setSavingSettings(false)
        }
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground tracking-tight">Cloud Storage Integrations</h1>
                <p className="text-muted-foreground mt-1 text-lg">Seamlessly connect your cloud storage providers to automatically sync and backup uploaded files.</p>
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
                                        ? "bg-card shadow-sm border border-border text-foreground"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        }`}
                                >
                                    <Icon className={`w-5 h-5 ${isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`} />
                                    <span className="font-medium text-sm">{tab.name}</span>
                                    {isActive && (
                                        <motion.div layoutId="integrations-active" className="ml-auto">
                                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
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
                            <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                                <div className="p-6 border-b border-border bg-muted/30">
                                    <h2 className="text-xl font-semibold text-foreground">
                                        {tabs.find(t => t.id === activeTab)?.name}
                                    </h2>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {tabs.find(t => t.id === activeTab)?.description}
                                    </p>
                                </div>

                                <div className="p-8">
                                    {activeTab === "available" && (
                                        <div className="space-y-8">
                                            <div className="flex gap-3">
                                                <div className="relative flex-1">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search integrations..."
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        className="w-full pl-10 pr-4 py-2.5 bg-muted border border-border rounded-xl focus:ring-2 focus:ring-ring focus:bg-card transition-all outline-none text-foreground"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => window.location.reload()}
                                                    className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 active:scale-95 transition-all flex items-center gap-2"
                                                    title="Refresh to sync latest connections"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                    </svg>
                                                    Refresh
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* Featured section in available */}
                                                <div className="col-span-1 md:col-span-2">
                                                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Cloud Storage</h3>
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
                                            <div className="p-4 bg-muted rounded-xl border border-border">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center mt-0.5">
                                                        <span className="text-primary-foreground text-xs font-bold">i</span>
                                                    </div>
                                                    <div>
                                                        <h5 className="font-medium text-foreground">Authentication vs Storage</h5>
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            Your login method (authentication) is separate from storage access. Disabling storage won't affect your ability to log in.
                                                            You can safely disconnect storage accounts while keeping your login active.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <ConnectedAccounts />
                                        </div>
                                    )}

                                    {activeTab === "settings" && (
                                        <div className="space-y-8">
                                            <div className="p-6 rounded-2xl bg-muted border border-border">
                                                <h3 className="font-semibold text-foreground mb-6">Automatic Synchronization Settings</h3>
                                                <div className="space-y-5">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="text-sm font-medium text-foreground">Enable auto-sync for new uploads</p>
                                                            <p className="text-xs text-muted-foreground">Automatically upload files to connected cloud storage when received.</p>
                                                        </div>
                                                        <Switch
                                                            checked={syncSettings.autoSync}
                                                            onChange={(value) => setSyncSettings({ ...syncSettings, autoSync: value })}
                                                        />
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="text-sm font-medium text-foreground">Delete local files after successful sync</p>
                                                            <p className="text-xs text-muted-foreground">Automatically remove files from SecureUpload storage after cloud backup.</p>
                                                        </div>
                                                        <Switch
                                                            checked={syncSettings.deleteAfterSync}
                                                            onChange={(value) => setSyncSettings({ ...syncSettings, deleteAfterSync: value })}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-foreground mb-2">Sync interval (seconds)</label>
                                                        <div className="relative">
                                                            <input
                                                                type="number"
                                                                value={syncSettings.syncInterval}
                                                                onChange={(e) => {
                                                                    setSyncSettings({ ...syncSettings, syncInterval: parseInt(e.target.value) })
                                                                    if (syncError) setSyncError(null)
                                                                }}
                                                                className={`w-full px-4 py-2.5 bg-card border rounded-xl focus:ring-2 focus:ring-ring outline-none transition-all text-foreground ${syncError ? "border-destructive bg-destructive/5" : "border-border"
                                                                    }`}
                                                            />
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-1">Set between 5 minutes (300s) and 24 hours (86400s)</p>
                                                        {syncError && (
                                                            <motion.p
                                                                initial={{ opacity: 0, y: -5 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                className="text-xs font-medium text-destructive mt-2 flex items-center gap-1.5"
                                                            >
                                                                <AlertCircle className="w-3.5 h-3.5" />
                                                                {syncError}
                                                            </motion.p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-6 rounded-2xl bg-muted border border-border flex gap-4">
                                                <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0" />
                                                <div>
                                                    <p className="text-sm font-semibold text-foreground">Storage Optimization Tip</p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        Enable auto-sync with automatic deletion to maximize your storage capacity and ensure files are safely backed up to the cloud.
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={saveSyncSettings}
                                                disabled={savingSettings}
                                                className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
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
        <div className="group p-6 rounded-2xl border border-border bg-card hover:border-muted-foreground hover:shadow-sm transition-all flex flex-col">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-muted rounded-xl border border-border group-hover:bg-card transition-colors">
                    {icon}
                </div>
                {status === 'coming-soon' ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground px-2 py-1 rounded">Coming Soon</span>
                ) : isConnected ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-1 rounded">Connected</span>
                ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground px-2 py-1 rounded">Available</span>
                )}
            </div>
            <h4 className="font-bold text-foreground">{name}</h4>
            <p className="text-xs text-muted-foreground mt-1 mb-6 flex-1">{description}</p>
            <button
                onClick={handleConfigure}
                disabled={status === 'coming-soon' || configuringProvider === provider || isConnected}
                className={`w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${status === 'coming-soon' || isConnected
                    ? "bg-muted text-muted-foreground cursor-not-allowed border border-border"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-border'
                }`}
            type="button"
            role="switch"
            aria-checked={checked}
        >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-card transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'
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
