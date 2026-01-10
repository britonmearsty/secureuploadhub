"use client"

import { useState } from "react"
import { Bug, RefreshCw, Search, ShieldAlert, Terminal, History, Activity, Database, CheckCircle2, AlertCircle } from "lucide-react"

interface BillingDebugProps {
    subscription: any
    initialUsage: any
}

export function BillingDebug({ subscription, initialUsage }: BillingDebugProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState<'info' | 'actions' | 'logs'>('info')
    const [logs, setLogs] = useState<string[]>([])
    const [recoveryRef, setRecoveryRef] = useState("")
    const [recoveryStatus, setRecoveryStatus] = useState<any>(null)
    const [healthResults, setHealthResults] = useState<any>(null)

    const addLog = (message: string) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev].slice(0, 50))
    }

    const runAction = async (name: string, action: () => Promise<any>) => {
        setLoading(true)
        addLog(`Starting action: ${name}...`)
        try {
            const result = await action()
            addLog(`Success: ${name} - ${JSON.stringify(result).substring(0, 100)}...`)
            return result
        } catch (error) {
            addLog(`Error: ${name} - ${error instanceof Error ? error.message : String(error)}`)
        } finally {
            setLoading(false)
        }
    }

    const handleCheckStatus = () => {
        runAction("Check Status", async () => {
            const response = await fetch('/api/billing/subscription/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            })
            return await response.json()
        })
    }

    const handleRecovery = (reference?: string) => {
        runAction("Run Recovery", async () => {
            const response = await fetch('/api/billing/subscription/recover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subscriptionId: subscription?.id,
                    paymentReference: reference || undefined
                })
            })
            const data = await response.json()
            setRecoveryStatus(data)
            return data
        })
    }

    const handleHealthCheck = () => {
        runAction("Health Check", async () => {
            const response = await fetch('/api/billing/debug/health-check')
            const data = await response.json()
            setHealthResults(data)
            return data
        })
    }

    const handleIntegrationTest = () => {
        runAction("Run Integration Test", async () => {
            const response = await fetch('/api/billing/debug/integration-test', {
                method: 'POST'
            })
            const data = await response.json()
            return data
        })
    }

    const handleForceRefresh = () => {
        addLog("Forcing window reload...")
        window.location.reload()
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 p-4 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-full shadow-[0_0_20px_rgba(220,38,38,0.5)] hover:shadow-[0_0_30px_rgba(220,38,38,0.7)] transition-all z-50 flex items-center gap-3 animate-pulse hover:animate-none group hover:scale-105"
            >
                <Bug className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                <span className="text-sm font-bold tracking-tight">Debug Billing</span>
            </button>
        )
    }

    return (
        <div className="fixed bottom-4 right-4 w-[420px] max-h-[85vh] bg-card/95 backdrop-blur-md border-2 border-red-500/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
            <div className="p-5 bg-gradient-to-r from-red-600 to-orange-600 text-white flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3 font-extrabold text-lg">
                    <Bug className="w-6 h-6" />
                    <span className="tracking-tight uppercase">Billing Diagnostics</span>
                </div>
                <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors">
                    <span className="text-xl">✕</span>
                </button>
            </div>

            <div className="flex bg-muted/30 p-1 gap-1 m-2 rounded-xl">
                <button
                    onClick={() => setActiveTab('info')}
                    className={`flex-1 p-2.5 text-[11px] font-black uppercase flex items-center justify-center gap-2 rounded-lg transition-all ${activeTab === 'info' ? 'bg-card text-red-600 shadow-sm' : 'text-muted-foreground hover:bg-muted/50'}`}
                >
                    <Database className="w-3.5 h-3.5" /> State
                </button>
                <button
                    onClick={() => setActiveTab('actions')}
                    className={`flex-1 p-2.5 text-[11px] font-black uppercase flex items-center justify-center gap-2 rounded-lg transition-all ${activeTab === 'actions' ? 'bg-card text-red-600 shadow-sm' : 'text-muted-foreground hover:bg-muted/50'}`}
                >
                    <Terminal className="w-3.5 h-3.5" /> Actions
                </button>
                <button
                    onClick={() => setActiveTab('logs')}
                    className={`flex-1 p-2.5 text-[11px] font-black uppercase flex items-center justify-center gap-2 rounded-lg transition-all ${activeTab === 'logs' ? 'bg-card text-red-600 shadow-sm' : 'text-muted-foreground hover:bg-muted/50'}`}
                >
                    <History className="w-3.5 h-3.5" /> Logs
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 pb-8 space-y-5 font-mono">
                {activeTab === 'info' && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-left-2 duration-300">
                        <section className="bg-muted/20 p-3 rounded-xl border border-muted-foreground/10">
                            <h4 className="text-[10px] font-black text-red-500 uppercase mb-2 flex items-center gap-2">
                                <Activity className="w-3 h-3" /> Subscription Info
                            </h4>
                            <pre className="p-3 bg-card border rounded-lg text-[10px] overflow-x-auto text-foreground/90 leading-relaxed shadow-inner max-h-60">
                                {JSON.stringify(subscription, null, 2) || 'null (No active subscription)'}
                            </pre>
                        </section>
                        <section className="bg-muted/20 p-3 rounded-xl border border-muted-foreground/10">
                            <h4 className="text-[10px] font-black text-red-500 uppercase mb-2 flex items-center gap-2">
                                <Database className="w-3 h-3" /> Usage Stats
                            </h4>
                            <pre className="p-3 bg-card border rounded-lg text-[10px] overflow-x-auto text-foreground/90 leading-relaxed shadow-inner">
                                {JSON.stringify(initialUsage, null, 2)}
                            </pre>
                        </section>
                    </div>
                )}

                {activeTab === 'actions' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="space-y-2 text-[11px] font-medium text-blue-700 bg-blue-500/5 p-3 rounded-xl border border-blue-500/20 flex items-start gap-3">
                            <ShieldAlert className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                            <span>These operations interact with live database records. Exercise extreme caution when performing recovery actions.</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={handleCheckStatus}
                                disabled={loading}
                                className="flex flex-col items-center justify-center gap-2 p-4 bg-secondary/80 text-secondary-foreground rounded-xl hover:bg-secondary transition-all border border-foreground/5 shadow-sm active:scale-95 disabled:opacity-50"
                            >
                                <RefreshCw className={`w-5 h-5 text-red-500 ${loading ? 'animate-spin' : ''}`} />
                                <span className="text-[10px] font-bold uppercase">Sync Local</span>
                            </button>

                            <button
                                onClick={() => handleRecovery()}
                                disabled={loading}
                                className="flex flex-col items-center justify-center gap-2 p-4 bg-secondary/80 text-secondary-foreground rounded-xl hover:bg-secondary transition-all border border-foreground/5 shadow-sm active:scale-95 disabled:opacity-50"
                            >
                                <Search className="w-5 h-5 text-red-500" />
                                <span className="text-[10px] font-bold uppercase">Deep Search</span>
                            </button>

                            <button
                                onClick={handleHealthCheck}
                                disabled={loading}
                                className="flex flex-col items-center justify-center gap-2 p-4 bg-secondary/80 text-secondary-foreground rounded-xl hover:bg-secondary transition-all border border-foreground/5 shadow-sm active:scale-95 disabled:opacity-50"
                            >
                                <ShieldAlert className="w-5 h-5 text-red-500" />
                                <span className="text-[10px] font-bold uppercase">Health Check</span>
                            </button>

                            <button
                                onClick={handleIntegrationTest}
                                disabled={loading}
                                className="flex flex-col items-center justify-center gap-2 p-4 bg-secondary/80 text-secondary-foreground rounded-xl hover:bg-secondary transition-all border border-foreground/5 shadow-sm active:scale-95 disabled:opacity-50"
                            >
                                <Terminal className="w-5 h-5 text-orange-500" />
                                <span className="text-[10px] font-bold uppercase underline">Run Test</span>
                            </button>
                        </div>

                        <div className="pt-2">
                            <button
                                onClick={handleForceRefresh}
                                className="w-full flex items-center justify-center gap-2 p-3 bg-muted/50 text-muted-foreground rounded-xl border border-dashed border-muted-foreground/30 hover:bg-muted transition-all active:scale-[0.98]"
                            >
                                <Activity className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase">Hard Refresh UI</span>
                            </button>
                        </div>

                        <div className="pt-5 border-t border-muted-foreground/10 space-y-3">
                            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                <Database className="w-3 h-3" /> Manual Recovery
                            </h4>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Enter Paystack Payment Reference"
                                    className="flex-1 p-3 border rounded-xl bg-muted/20 text-[10px] focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
                                    value={recoveryRef}
                                    onChange={(e) => setRecoveryRef(e.target.value)}
                                />
                                <button
                                    onClick={() => handleRecovery(recoveryRef)}
                                    disabled={loading || !recoveryRef}
                                    className="px-4 py-2 bg-red-500 text-white rounded-xl text-[10px] font-bold shadow-md hover:bg-red-600 transition-all disabled:opacity-50 active:scale-95"
                                >
                                    Force Link
                                </button>
                            </div>
                        </div>

                        {recoveryStatus && (
                            <div className={`p-4 rounded-xl border-2 text-[10px] shadow-sm animate-in slide-in-from-top-2 ${recoveryStatus.recovery?.success ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                                <div className="font-black text-xs mb-2 flex items-center gap-2">
                                    {recoveryStatus.recovery?.success ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
                                    Recovery Result
                                </div>
                                <div className="leading-relaxed opacity-90">{recoveryStatus.recovery?.message}</div>
                                {recoveryStatus.recovery?.method && (
                                    <div className="mt-2 pt-2 border-t border-current/10 font-bold opacity-60 flex justify-between">
                                        <span>Method: {recoveryStatus.recovery?.method}</span>
                                        {recoveryStatus.recovery?.success && <span className="text-green-600 uppercase">Resolved</span>}
                                    </div>
                                )}
                            </div>
                        )}

                        {healthResults && (
                            <div className="pt-5 border-t border-muted-foreground/10 space-y-3 animate-in fade-in duration-500">
                                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <ShieldAlert className="w-3 h-3" /> Health Status
                                </h4>
                                <div className="space-y-2">
                                    {healthResults.checks?.map((check: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-muted-foreground/5">
                                            <span className="text-[11px] font-bold text-foreground/80">{check.name}</span>
                                            <div className="flex items-center gap-3">
                                                {check.message && <span className="text-[9px] text-muted-foreground italic truncate max-w-[120px]" title={check.message}>{check.message}</span>}
                                                <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter ${check.status === 'pass' ? 'bg-green-500/20 text-green-700' : check.status === 'warn' ? 'bg-yellow-500/20 text-yellow-700' : 'bg-red-500/20 text-red-700'}`}>
                                                    {check.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'logs' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-left-2 duration-300">
                        {logs.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground italic flex flex-col items-center gap-3">
                                <Terminal className="w-8 h-8 opacity-20" />
                                <span className="text-xs">No diagnostic logs generated yet.</span>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {logs.map((log, i) => (
                                    <div key={i} className={`p-3 rounded-lg border-l-4 text-[10px] shadow-sm leading-relaxed ${log.includes('Error') ? 'bg-red-500/5 border-red-500' : log.includes('Success') ? 'bg-green-500/5 border-green-500' : 'bg-muted/30 border-muted-foreground/30'}`}>
                                        <div className="font-bold flex justify-between mb-1">
                                            <span>{log.split('] ')[0]}]</span>
                                            {log.includes('Success') && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                                        </div>
                                        <div className="opacity-90">{log.split('] ')[1]}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="p-4 bg-muted/50 text-[10px] text-muted-foreground border-t flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${loading ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`}></div>
                    <span className="font-bold uppercase tracking-widest">{loading ? 'Processing...' : 'Ready'}</span>
                </div>
                <span className="font-black italic opacity-50">v1.2-STABLE-DEBUG</span>
            </div>
        </div>
    )
}
