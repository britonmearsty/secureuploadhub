"use client"

import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { Cloud, CheckCircle2, XCircle, Loader2, ArrowRight, LogOut } from "lucide-react"
import { motion } from "framer-motion"
import { ToastComponent } from "@/components/ui/Toast"

interface ConnectedAccount {
    provider: "google" | "dropbox"
    providerAccountId: string
    email?: string
    name?: string
    isConnected: boolean
}

export default function ConnectedAccounts() {
    const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
    const [loading, setLoading] = useState(true)
    const [disconnecting, setDisconnecting] = useState<string | null>(null)
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
            const res = await fetch("/api/storage/accounts")
            if (res.ok) {
                const data = await res.json()
                setAccounts(data)
            }
        } catch (error) {
            console.error("Error fetching accounts:", error)
        } finally {
            setLoading(false)
        }
    }

    async function handleDisconnect(provider: string) {
        setDisconnecting(provider)
        try {
            const res = await fetch(`/api/storage/disconnect`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ provider })
            })

            if (res.ok) {
                const data = await res.json()
                setAccounts(accounts.filter(a => a.provider !== provider))
                
                // Show success message
                showToast('success', 'Storage Disconnected', data.message)
            } else {
                const errorData = await res.json()
                showToast('error', 'Disconnection Failed', errorData.error || 'Failed to disconnect storage account')
            }
        } catch (error) {
            console.error("Error disconnecting account:", error)
            showToast('error', 'Connection Error', 'An unexpected error occurred while disconnecting')
        } finally {
            setDisconnecting(null)
        }
    }

    // Only show connected accounts in the connected tab
    const connectedAccounts = accounts.filter(a => a.isConnected)

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
            account: accounts.find((a) => a.provider === "google"),
            color: "blue"
        },
        {
            id: "dropbox",
            name: "Dropbox",
            icon: <DropboxIcon />,
            account: accounts.find((a) => a.provider === "dropbox"),
            color: "blue"
        }
    ]

    return (
        <div className="space-y-4">
            {connectedAccounts.length === 0 && !loading && (
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

            {connectedAccounts.map((account) => {
                const provider = providers.find(p => p.id === account.provider)
                if (!provider) return null

                return (
                    <motion.div
                        key={account.provider}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between p-5 rounded-2xl bg-primary/5 border border-primary/20 transition-all hover:bg-primary/10"
                    >
                        <div className="flex gap-5">
                            <div className="p-3 bg-card rounded-xl shadow-sm border border-border h-fit">
                                {provider.icon}
                            </div>
                            <div>
                                <h4 className="font-semibold text-foreground">{provider.name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                                    <span className="text-sm text-muted-foreground font-medium">{account.email}</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => handleDisconnect(account.provider)}
                            disabled={disconnecting === account.provider}
                            className="px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 bg-card border border-destructive/30 text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Remove this storage connection. Files from this account will become unavailable until reconnected."
                        >
                            {disconnecting === account.provider ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Disconnecting...
                                </>
                            ) : (
                                <>
                                    <LogOut className="w-4 h-4" />
                                    Disconnect
                                </>
                            )}
                        </button>
                    </motion.div>
                )
            })}

            {connectedAccounts.length > 0 && (
                <div className="mt-8 p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Automatic sync is active for {connectedAccounts.length} account{connectedAccounts.length > 1 ? 's' : ''}</p>
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


