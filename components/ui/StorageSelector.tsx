"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Cloud, CheckCircle2, AlertCircle, ExternalLink, Loader2, RefreshCw } from "lucide-react"

interface ConnectedAccount {
  provider: "google" | "dropbox"
  providerAccountId: string
  email?: string
  name?: string
  isConnected: boolean
}

interface StorageSelectorProps {
  selectedProvider?: string
  onProviderSelect: (provider: "google_drive" | "dropbox") => void
  accounts: ConnectedAccount[]
  onAccountsRefresh?: () => void
  autoSync?: boolean
  className?: string
}

const STORAGE_PROVIDERS = [
  {
    id: "google_drive" as const,
    name: "Google Drive",
    description: "Store files in your Google Drive",
    icon: "🗂️",
    color: "from-blue-500 to-blue-600",
    accountProvider: "google" as const
  },
  {
    id: "dropbox" as const,
    name: "Dropbox",
    description: "Store files in your Dropbox",
    icon: "📦",
    color: "from-indigo-500 to-indigo-600",
    accountProvider: "dropbox" as const
  }
]

export default function StorageSelector({
  selectedProvider,
  onProviderSelect,
  accounts,
  onAccountsRefresh,
  autoSync = true,
  className = ""
}: StorageSelectorProps) {
  const [syncing, setSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

  // Auto-sync when provider is selected
  useEffect(() => {
    if (autoSync && selectedProvider && !syncing) {
      handleSync()
    }
  }, [selectedProvider, autoSync])

  const handleProviderSelect = async (providerId: "google_drive" | "dropbox") => {
    onProviderSelect(providerId)
    
    if (autoSync) {
      await handleSync()
    }
  }

  const handleSync = async () => {
    if (!selectedProvider || syncing) return

    setSyncing(true)
    try {
      // Simulate sync delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (onAccountsRefresh) {
        await onAccountsRefresh()
      }
      
      setLastSyncTime(new Date())
    } catch (error) {
      console.error('Sync failed:', error)
    } finally {
      setSyncing(false)
    }
  }

  const getAccountForProvider = (provider: "google" | "dropbox") => {
    return accounts.find(account => account.provider === provider && account.isConnected)
  }

  const getProviderStatus = (provider: typeof STORAGE_PROVIDERS[0]) => {
    const account = getAccountForProvider(provider.accountProvider)
    
    if (!account) {
      return { status: "disconnected", message: "Not connected" }
    }
    
    if (selectedProvider === provider.id) {
      if (syncing) {
        return { status: "syncing", message: "Syncing..." }
      }
      return { status: "selected", message: "Selected & synced" }
    }
    
    return { status: "connected", message: "Connected" }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Storage Provider</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Choose where uploaded files will be stored
          </p>
        </div>
        
        {selectedProvider && (
          <div className="flex items-center gap-2">
            {lastSyncTime && (
              <span className="text-xs text-muted-foreground">
                Last sync: {lastSyncTime.toLocaleTimeString()}
              </span>
            )}
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="Refresh connection"
            >
              <RefreshCw className={`w-4 h-4 text-muted-foreground ${syncing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {STORAGE_PROVIDERS.map((provider) => {
          const account = getAccountForProvider(provider.accountProvider)
          const status = getProviderStatus(provider)
          const isSelected = selectedProvider === provider.id
          const isDisabled = !account

          return (
            <motion.button
              key={provider.id}
              type="button"
              onClick={() => !isDisabled && handleProviderSelect(provider.id)}
              disabled={isDisabled}
              className={`relative p-6 rounded-2xl border-2 transition-all text-left ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-lg"
                  : isDisabled
                  ? "border-border bg-muted/30 opacity-60 cursor-not-allowed"
                  : "border-border hover:border-muted-foreground hover:bg-muted/50"
              }`}
              whileHover={!isDisabled ? { scale: 1.02 } : {}}
              whileTap={!isDisabled ? { scale: 0.98 } : {}}
            >
              {/* Provider Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${provider.color} flex items-center justify-center text-2xl shadow-md`}>
                    {provider.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{provider.name}</h4>
                    <p className="text-sm text-muted-foreground">{provider.description}</p>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-2">
                  {status.status === "syncing" ? (
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  ) : status.status === "selected" ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : status.status === "connected" ? (
                    <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Account Info */}
              {account ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    <span className="text-sm font-medium text-foreground">
                      {account.email || account.name || "Connected"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{status.message}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full" />
                    <span className="text-sm text-muted-foreground">Not connected</span>
                  </div>
                  <a
                    href="/dashboard/settings/integrations"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Connect account
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* Selection Indicator */}
              {isSelected && (
                <motion.div
                  className="absolute inset-0 rounded-2xl border-2 border-primary pointer-events-none"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                />
              )}

              {/* Sync Progress */}
              {isSelected && syncing && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted rounded-b-2xl overflow-hidden">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                  />
                </div>
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Auto-sync Info */}
      {autoSync && selectedProvider && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="text-blue-800 font-medium">Auto-sync enabled</p>
            <p className="text-blue-700 mt-1">
              Storage connection will be automatically verified and synced when you select a provider.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}