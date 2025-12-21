"use client"

import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { Cloud, CheckCircle2, XCircle, RefreshCw, Loader2, ArrowRight } from "lucide-react"
import { motion } from "framer-motion"

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

  const googleAccount = accounts.find((a) => a.provider === "google")
  const dropboxAccount = accounts.find((a) => a.provider === "dropbox")

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-50 border border-slate-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }

  const providers = [
    {
      id: "google",
      name: "Google Drive",
      icon: <GoogleDriveIcon />,
      account: googleAccount,
      color: "blue"
    },
    {
      id: "dropbox",
      name: "Dropbox",
      icon: <DropboxIcon />,
      account: dropboxAccount,
      color: "blue"
    }
  ]

  return (
    <div className="space-y-4">
      {providers.map((p) => (
        <div
          key={p.id}
          className="flex items-center justify-between p-5 rounded-2xl bg-slate-50 border border-slate-100 transition-all hover:bg-slate-100/50"
        >
          <div className="flex gap-5">
            <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 h-fit">
              {p.icon}
            </div>
            <div>
              <h4 className="font-semibold text-slate-900">{p.name}</h4>
              <div className="flex items-center gap-2 mt-1">
                {p.account ? (
                  <div className="flex items-center gap-1.5">
                    {p.account.isConnected ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-sm text-slate-600 font-medium">{p.account.email}</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-red-500" />
                        <span className="text-sm text-red-600 font-medium">Session expired</span>
                      </>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-slate-500">Not connected</span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => signIn(p.id, { callbackUrl: "/dashboard/integrations" })}
            className={`px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 ${p.account?.isConnected
                ? "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                : "bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
              }`}
          >
            {p.account?.isConnected ? (
              <>
                <RefreshCw className="w-4 h-4" />
                Reconnect
              </>
            ) : (
              <>
                Connect <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      ))}

      {accounts.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 bg-slate-50 rounded-full mb-4">
            <Cloud className="w-8 h-8 text-slate-200" />
          </div>
          <h4 className="text-slate-900 font-semibold">No active connections</h4>
          <p className="text-slate-500 text-sm mt-1 max-w-xs">
            Connect your storage providers to automatically sync your files.
          </p>
        </div>
      )}

      {accounts.some(a => a.isConnected) && (
        <div className="mt-8 p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-sm font-medium">Automatic sync is active for {accounts.filter(a => a.isConnected).length} account(s)</p>
          </div>
          <button className="text-xs font-bold text-slate-400 hover:text-white transition-colors">
            View Sync Log
          </button>
        </div>
      )}
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


