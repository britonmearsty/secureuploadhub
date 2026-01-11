"use client"

import { useState, useEffect } from "react"
import { Cloud, CheckCircle2, Loader2, LogOut } from "lucide-react"
import { motion } from "framer-motion"
import { ToastComponent } from "@/components/ui/Toast"
import { signIn } from "next-auth/react"

interface ConnectedAccount {
    provider: "google" | "dropbox"
    providerAccountId: string
    email?: string
    name?: string
    isConnected: boolean
    storageAccountId?: string
    storageStatus?: string
    isAuthAccount: boolean // Indicates if this is used for login
    hasValidOAuth: boolean // Separate OAuth status from storage status
}

export default function ConnectedAccounts() {
    const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
    const [loading, setLoading] = useState(true)
    const [deactivating, setDeactivating] = useState<string | null>(null)
    const [fixing, setFixing] = useState(false)
    const [syncing, setSyncing] = useState(false)
    const [toast, setToast] = useState<{
        isOpen: boolean;
        type: 'error' | 'success' | 'warning' | 'info';
        title: string;
        message: string;
    }>({
        isOpen: false,
        type: 'success',
        title: '',
        message: ''
    })

    const showToast = (type: 'error' | 'success' | 'warning' | 'info', title: string, message: string) => {
        setToast({
            isOpen: true,
            type,
            title,
            message
        })
    }

    useEffect(() => {
        fetchAccounts()
    }, [])

    async function fetchAccounts() {
        try {
            console.log('🔍 FRONTEND: Fetching storage accounts...')
            
            const res = await fetch("/api/storage/accounts", {
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            })
            console.log('🔍 FRONTEND: API response status:', res.status, res.ok)
            
            if (res.ok) {
                const data = await res.json()
                console.log("🔍 FRONTEND: Storage accounts API response:", data)
                console.log("🔍 FRONTEND: Accounts array:", data.accounts)
                console.log("🔍 FRONTEND: Account details:", data.accounts?.map((a: any) => ({
                    provider: a.provider,
                    isConnected: a.isConnected,
                    hasValidOAuth: a.hasValidOAuth,
                    storageStatus: a.storageStatus,
                    email: a.email
                })))
                
                setAccounts(data.accounts || [])
            } else {
                console.error('🔍 FRONTEND: API error:', res.status, res.statusText)
                const errorData = await res.json().catch(() => ({}))
                console.error('🔍 FRONTEND: Error data:', errorData)
            }
        } catch (error) {
            console.error("🔍 FRONTEND: Error fetching accounts:", error)
        } finally {
            setLoading(false)
        }
    }

    async function handleSyncStatus() {
        setSyncing(true)
        try {
            const res = await fetch('/api/storage/sync-oauth-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })

            if (res.ok) {
                const data = await res.json()
                let message = data.message
                if (data.summary?.deactivatedPortals > 0) {
                    message += ` ${data.summary.deactivatedPortals} portal(s) were automatically deactivated.`
                }
                if (data.summary?.reactivatedPortals > 0) {
                    message += ` ${data.summary.reactivatedPortals} portal(s) were automatically reactivated.`
                }
                
                // Refresh accounts BEFORE showing toast
                await fetchAccounts()
                
                showToast('success', 'Status Synced', message)
            } else {
                const errorData = await res.json()
                showToast('error', 'Sync Failed', errorData.error || 'Failed to sync OAuth status')
            }
        } catch (error) {
            showToast('error', 'Connection Error', 'An unexpected error occurred')
        } finally {
            setSyncing(false)
        }
    }
    
    async function handleFixStorage() {
        setFixing(true)
        try {
            const res = await fetch('/api/storage/fix-accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })

            if (res.ok) {
                const data = await res.json()
                let message = `${data.message}. ${data.summary.created} created, ${data.summary.reactivated} reactivated.`
                if (data.summary?.reactivatedPortals > 0) {
                    message += ` ${data.summary.reactivatedPortals} portal(s) were automatically reactivated.`
                }
                
                // Refresh accounts BEFORE showing toast
                await fetchAccounts()
                
                showToast('success', 'Storage Fixed', message)
            } else {
                const errorData = await res.json()
                showToast('error', 'Fix Failed', errorData.error || 'Failed to fix storage accounts')
            }
        } catch (error) {
            showToast('error', 'Connection Error', 'An unexpected error occurred')
        } finally {
            setFixing(false)
        }
    }
    
    async function handleReactivate(provider: string) {
        try {
            const res = await fetch('/api/storage/reactivate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider })
            })

            if (res.ok) {
                const data = await res.json()
                let message = data.message
                if (data.reactivatedPortals > 0) {
                    message += ` ${data.reactivatedPortals} portal(s) were automatically reactivated.`
                }
                
                // Refresh accounts BEFORE showing toast
                await fetchAccounts()
                
                showToast('success', 'Storage Reactivated', message)
            } else {
                const errorData = await res.json()
                if (errorData.needsOAuth) {
                    showToast('info', 'OAuth Required', errorData.error)
                } else {
                    showToast('error', 'Reactivation Failed', errorData.error)
                }
            }
        } catch (error) {
            showToast('error', 'Connection Error', 'An unexpected error occurred')
        }
    }
    async function handleDeactivate(provider: string) {
        console.log('🔍 FRONTEND: Starting deactivate for provider:', provider)
        setDeactivating(provider)
        try {
            console.log('🔍 FRONTEND: Calling deactivate API...')
            const res = await fetch(`/api/storage/deactivate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ provider })
            })

            console.log('🔍 FRONTEND: API response status:', res.status)
            console.log('🔍 FRONTEND: API response ok:', res.ok)

            if (res.ok) {
                const data = await res.json()
                console.log('🔍 FRONTEND: API response data:', data)
                let message = data.message
                if (data.deactivatedPortals > 0) {
                    message += ` ${data.deactivatedPortals} portal(s) were automatically deactivated.`
                }
                
                // Refresh accounts to show updated status BEFORE showing toast
                console.log('🔍 FRONTEND: Refreshing accounts after deactivation...')
                console.log('🔍 FRONTEND: Current accounts before refresh:', accounts.map(a => ({
                    provider: a.provider,
                    storageStatus: a.storageStatus,
                    isConnected: a.isConnected
                })))
                
                await fetchAccounts()
                
                // Small delay to ensure React state has updated
                await new Promise(resolve => setTimeout(resolve, 100))
                
                console.log('🔍 FRONTEND: Accounts after refresh:', accounts.map(a => ({
                    provider: a.provider,
                    storageStatus: a.storageStatus,
                    isConnected: a.isConnected
                })))
                
                showToast('success', 'Storage Deactivated', message)
            } else {
                const errorData = await res.json()
                console.log('🔍 FRONTEND: Error response data:', errorData)
                if (errorData.cannotDeactivate) {
                    showToast('warning', 'Cannot Deactivate', errorData.error)
                } else {
                    showToast('error', 'Deactivation Failed', errorData.error || 'Failed to deactivate storage account')
                }
            }
        } catch (error) {
            console.error("🔍 FRONTEND: Error deactivating account:", error)
            showToast('error', 'Connection Error', 'An unexpected error occurred while deactivating')
        } finally {
            setDeactivating(null)
        }
    }

    async function handleRefreshToken(provider: string) {
        console.log('🔄 FRONTEND: Starting token refresh for provider:', provider)
        try {
            const res = await fetch(`/api/storage/refresh-token`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ provider })
            })

            if (res.ok) {
                const data = await res.json()
                
                // Refresh accounts to show updated status BEFORE showing toast
                await fetchAccounts()
                
                showToast('success', 'Token Refreshed', data.message)
            } else {
                const errorData = await res.json()
                if (errorData.error.includes('reconnect')) {
                    showToast('warning', 'Reconnection Required', errorData.error)
                } else {
                    showToast('error', 'Refresh Failed', errorData.error || 'Failed to refresh token')
                }
            }
        } catch (error) {
            console.error("🔄 FRONTEND: Error refreshing token:", error)
            showToast('error', 'Connection Error', 'An unexpected error occurred while refreshing token')
        }
    }

    // Show ALL accounts, not just connected ones - users need to see disconnected/inactive accounts too
    // FIXED: Prioritize ACTIVE accounts over ERROR/INACTIVE when there are duplicates
    const allAccounts = accounts.reduce((acc: ConnectedAccount[], current) => {
        const existingIndex = acc.findIndex(a => a.provider === current.provider)
        
        if (existingIndex === -1) {
            // No existing account for this provider, add it
            acc.push(current)
        } else {
            // Account exists for this provider, keep the one with higher priority
            const existing = acc[existingIndex]
            
            // Priority order: ACTIVE > everything else (treat INACTIVE/DISCONNECTED/ERROR as same priority)
            const getPriority = (status: string) => {
                return status === 'ACTIVE' ? 2 : 1
            }
            
            const currentPriority = getPriority(current.storageStatus || '')
            const existingPriority = getPriority(existing.storageStatus || '')
            
            if (currentPriority > existingPriority) {
                // Replace with higher priority account
                acc[existingIndex] = current
            }
            // If existing has higher or equal priority, keep it
        }
        
        return acc
    }, [])
    
    console.log("🔍 DEBUG: All accounts:", accounts)
    console.log("🔍 DEBUG: Filtered accounts (removing duplicates):", allAccounts)
    console.log("🔍 DEBUG: Account details:", accounts.map(a => ({
        provider: a.provider,
        isConnected: a.isConnected,
        hasValidOAuth: a.hasValidOAuth,
        storageStatus: a.storageStatus,
        storageAccountId: a.storageAccountId
    })))

    if (loading) {
        return (
            <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                    <div key={i} className="h-24 bg-muted border border-border rounded-2xl animate-pulse" />
                ))}
            </div>
        )
    }

    const providers = [
        {
            id: "google",
            name: "Google Drive",
            icon: <GoogleDriveIcon />,
            account: allAccounts.find((a) => a.provider === "google"),
            color: "blue"
        },
        {
            id: "dropbox",
            name: "Dropbox",
            icon: <DropboxIcon />,
            account: allAccounts.find((a) => a.provider === "dropbox"),
            color: "blue"
        }
    ]

    // Show all providers - even those without accounts (for connecting)
    const displayProviders = providers

    return (
        <div className="space-y-4">
            {/* Debug/Refresh Section */}
            <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                    {accounts.length > 0 && (
                        <span>Found {accounts.length} storage account{accounts.length !== 1 ? 's' : ''}</span>
                    )}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleSyncStatus}
                        disabled={syncing}
                        className="px-3 py-1.5 text-xs bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        title="Sync storage account status with OAuth status"
                    >
                        {syncing ? (
                            <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Syncing...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-3 h-3" />
                                Sync Status
                            </>
                        )}
                    </button>
                    <button
                        onClick={handleFixStorage}
                        disabled={fixing}
                        className="px-3 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        title="Fix and reactivate storage accounts"
                    >
                        {fixing ? (
                            <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Fixing...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-3 h-3" />
                                Fix Storage
                            </>
                        )}
                    </button>
                    <button
                        onClick={() => {
                            setLoading(true)
                            fetchAccounts()
                        }}
                        className="px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {allAccounts.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="p-4 bg-muted rounded-full mb-4">
                        <Cloud className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h4 className="text-foreground font-semibold">No active connections</h4>
                    <p className="text-muted-foreground text-sm mt-1 max-w-xs">
                        Connect your storage providers in the Available tab to automatically sync your files.
                    </p>
                </div>
            )}

            {displayProviders.map((provider) => {
                const account = provider.account
                
                // If no account exists, show a "Connect" option
                if (!account) {
                    return (
                        <motion.div
                            key={provider.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center justify-between p-5 rounded-2xl bg-muted/50 border border-border transition-all hover:bg-muted/70"
                        >
                            <div className="flex gap-5">
                                <div className="p-3 bg-card rounded-xl shadow-sm border border-border h-fit opacity-60">
                                    {provider.icon}
                                </div>
                                <div>
                                    <h4 className="font-semibold text-foreground">{provider.name}</h4>
                                    <p className="text-sm text-muted-foreground">Not connected</p>
                                    <p className="text-xs text-muted-foreground mt-1">Connect to enable file storage and sync</p>
                                </div>
                            </div>
                            <button
                                onClick={async () => {
                                    try {
                                        // Use NextAuth signIn function for new connections
                                        await signIn(provider.id, { 
                                            callbackUrl: window.location.href,
                                            redirect: true 
                                        })
                                    } catch (error) {
                                        console.error('OAuth connection failed:', error)
                                        showToast('error', 'Connection Failed', 'Failed to connect OAuth account')
                                    }
                                }}
                                className="px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 bg-primary hover:bg-primary/90 text-primary-foreground"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                Connect {provider.name}
                            </button>
                        </motion.div>
                    )
                }

                return (
                    <motion.div
                        key={provider.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between p-5 rounded-2xl bg-primary/5 border border-primary/20 transition-all hover:bg-primary/10"
                    >
                        <div className="flex gap-5">
                            <div className="p-3 bg-card rounded-xl shadow-sm border border-border h-fit">
                                {provider.icon}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-foreground">{provider.name}</h4>
                                    {account.isAuthAccount && (
                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                                            Login Method
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                                    <span className="text-sm text-muted-foreground font-medium">{account.email}</span>
                                </div>
                                <div className="flex items-center gap-4 mt-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${account.hasValidOAuth ? 'bg-green-500' : 'bg-red-500'}`} />
                                        <span className="text-xs text-muted-foreground">
                                            Drive Access: {account.hasValidOAuth ? 'Active' : 'Expired'}
                                        </span>
                                    </div>
                                    {account.storageStatus && (
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${
                                                account.storageStatus === 'ACTIVE' ? 'bg-green-500' : 'bg-yellow-500'
                                            }`} />
                                            <span className="text-xs text-muted-foreground">
                                                Storage: {account.storageStatus === 'ACTIVE' ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {account.storageStatus === 'INACTIVE' || account.storageStatus === 'DISCONNECTED' || account.storageStatus === 'ERROR' ? (
                                <button
                                    onClick={() => handleReactivate(account.provider)}
                                    className="px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 bg-green-500 hover:bg-green-600 text-white"
                                    title="Reactivate storage access for this account"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    Reactivate Storage
                                </button>
                            ) : !account.hasValidOAuth ? (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleRefreshToken(account.provider)}
                                        className="px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 bg-blue-500 hover:bg-blue-600 text-white"
                                        title="Refresh expired access token"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        Refresh Token
                                    </button>
                                    <button
                                        onClick={async () => {
                                            try {
                                                // Use NextAuth signIn function for reconnection
                                                await signIn(account.provider, { 
                                                    callbackUrl: window.location.href,
                                                    redirect: true 
                                                })
                                            } catch (error) {
                                                console.error('OAuth reconnection failed:', error)
                                                showToast('error', 'Connection Failed', 'Failed to reconnect OAuth account')
                                            }
                                        }}
                                        className="px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 bg-purple-500 hover:bg-purple-600 text-white"
                                        title="Reconnect your OAuth account completely"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        Reconnect OAuth
                                    </button>
                                </div>
                            ) : account.storageStatus === 'ACTIVE' ? (
                                <button
                                    onClick={() => handleDeactivate(account.provider)}
                                    disabled={deactivating === account.provider}
                                    className="px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 bg-card border border-destructive/30 text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Deactivate storage access (login method will be preserved)"
                                >
                                    {deactivating === account.provider ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Deactivating...
                                        </>
                                    ) : (
                                        <>
                                            <LogOut className="w-4 h-4" />
                                            Deactivate Storage
                                        </>
                                    )}
                                </button>
                            ) : (
                                <div className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground bg-muted border border-border">
                                    Storage Inactive
                                </div>
                            )}
                        </div>
                    </motion.div>
                )
            })}

            {allAccounts.length > 0 && (
                <div className="mt-8 p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-sm font-medium text-foreground">
                        {allAccounts.filter(a => a.isConnected).length > 0 
                            ? `Automatic sync is active for ${allAccounts.filter(a => a.isConnected).length} account${allAccounts.filter(a => a.isConnected).length > 1 ? 's' : ''}`
                            : `Found ${allAccounts.length} storage account${allAccounts.length > 1 ? 's' : ''} - reconnect to enable sync`
                        }
                    </p>
                </div>
            )}

            {/* Toast Notification */}
            <ToastComponent
                isOpen={toast.isOpen}
                onClose={() => setToast({ ...toast, isOpen: false })}
                type={toast.type}
                title={toast.title}
                message={toast.message}
            />
        </div>
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


