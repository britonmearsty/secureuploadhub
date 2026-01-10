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
                style={{ zIndex: 9999 }}
                className="fixed bottom-6 right-6 p-4 bg-red-600 text-white rounded-full shadow-2xl hover:bg-red-700 transition-all flex items-center gap-3 group border-4 border-white dark:border-slate-800 scale-100 hover:scale-110 active:scale-95"
            >
                <Bug className="w-6 h-6" />
                <span className="text-sm font-bold tracking-tight">Debug Billing</span>
            </button>
        )
    }

    return (
        <div
            style={{ zIndex: 10000 }}
            className="fixed bottom-6 right-6 w-96 max-h-[85vh] bg-white dark:bg-slate-900 border-2 border-red-500 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
            {/* Header */}
            <div className="p-4 bg-red-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-3 font-bold">
                    <Bug className="w-5 h-5 text-white" />
                    <span className="uppercase tracking-wider text-sm">Billing Diagnostics</span>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="hover:bg-red-700 p-2 rounded-full transition-colors flex items-center justify-center w-8 h-8 font-black text-xl"
                >
                    ×
                </button>
            </div>

            {/* Tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 m-2 rounded-lg border border-slate-200 dark:border-slate-700">
                <button
                    onClick={() => setActiveTab('info')}
                    className={`flex-1 py-2 text-[10px] font-bold uppercase transition-all rounded ${activeTab === 'info' ? 'bg-white dark:bg-slate-700 text-red-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                >
                    State
                </button>
                <button
                    onClick={() => setActiveTab('actions')}
                    className={`flex-1 py-2 text-[10px] font-bold uppercase transition-all rounded ${activeTab === 'actions' ? 'bg-white dark:bg-slate-700 text-red-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                >
                    Actions
                </button>
                <button
                    onClick={() => setActiveTab('logs')}
                    className={`flex-1 py-2 text-[10px] font-bold uppercase transition-all rounded ${activeTab === 'logs' ? 'bg-white dark:bg-slate-700 text-red-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                >
                    Logs
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-slate-800 dark:text-slate-200">
                {activeTab === 'info' && (
                    <div className="space-y-4">
                        <section className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded border border-slate-200 dark:border-slate-700">
                            <h4 className="text-[9px] font-bold text-red-500 uppercase mb-2 flex items-center gap-2">
                                <Database className="w-3 h-3" /> Subscription Info
                            </h4>
                            <pre className="p-2 bg-white dark:bg-slate-900 border rounded text-[9px] overflow-x-auto max-h-48 whitespace-pre-wrap">
                                {JSON.stringify(subscription, null, 2) || 'No subscription found'}
                            </pre>
                        </section>
                        <section className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded border border-slate-200 dark:border-slate-700">
                            <h4 className="text-[9px] font-bold text-red-500 uppercase mb-2 flex items-center gap-2">
                                <Activity className="w-3 h-3" /> Usage Stats
                            </h4>
                            <pre className="p-2 bg-white dark:bg-slate-900 border rounded text-[9px] overflow-x-auto">
                                {JSON.stringify(initialUsage, null, 2)}
                            </pre>
                        </section>
                    </div>
                )}

                {activeTab === 'actions' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={handleCheckStatus}
                                disabled={loading}
                                className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl hover:border-red-500 dark:hover:border-red-500 transition-all disabled:opacity-50"
                            >
                                <RefreshCw className={`w-5 h-5 text-red-600 ${loading ? 'animate-spin' : ''}`} />
                                <span className="text-[9px] font-black uppercase">Sync Local</span>
                            </button>
                            <button
                                onClick={() => handleRecovery()}
                                disabled={loading}
                                className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl hover:border-red-500 dark:hover:border-red-500 transition-all disabled:opacity-50"
                            >
                                <Search className="w-5 h-5 text-red-600" />
                                <span className="text-[9px] font-black uppercase">Deep Search</span>
                            </button>
                            <button
                                onClick={handleHealthCheck}
                                disabled={loading}
                                className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl hover:border-red-500 dark:hover:border-red-500 transition-all disabled:opacity-50"
                            >
                                <ShieldAlert className="w-5 h-5 text-red-600" />
                                <span className="text-[9px] font-black uppercase">Health Check</span>
                            </button>
                            <button
                                onClick={handleIntegrationTest}
                                disabled={loading}
                                className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl hover:border-orange-500 dark:hover:border-orange-500 transition-all disabled:opacity-50"
                            >
                                <Terminal className="w-5 h-5 text-orange-600" />
                                <span className="text-[9px] font-black uppercase">Integration</span>
                            </button>
                        </div>

                        <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
                            <h4 className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Manual Recovery</h4>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Enter Paystack Ref"
                                    className="flex-1 p-2 border bg-slate-50 dark:bg-slate-800 rounded text-[10px] outline-none focus:border-red-500"
                                    value={recoveryRef}
                                    onChange={(e) => setRecoveryRef(e.target.value)}
                                />
                                <button
                                    onClick={() => handleRecovery(recoveryRef)}
                                    disabled={loading || !recoveryRef}
                                    className="px-3 py-1 bg-red-600 text-white rounded text-[10px] font-bold disabled:opacity-50"
                                >
                                    Force
                                </button>
                            </div>
                        </div>

                        {recoveryStatus && (
                            <div className={`p-3 rounded border text-[10px] ${recoveryStatus.recovery?.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                                <div className="font-bold mb-1 underline">Recovery Result:</div>
                                <div className="leading-tight">{recoveryStatus.recovery?.message}</div>
                            </div>
                        )}

                        {healthResults && (
                            <div className="pt-2 space-y-1">
                                <h4 className="text-[9px] font-bold text-slate-500 uppercase">Health Map</h4>
                                {healthResults.checks?.map((check: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center bg-slate-100 dark:bg-slate-800 p-2 rounded text-[9px]">
                                        <span>{check.name}</span>
                                        <span className={`px-1.5 py-0.5 rounded font-black uppercase ${check.status === 'pass' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                            {check.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'logs' && (
                    <div className="space-y-2">
                        {logs.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 italic text-[10px]">Ready for diagnosis...</div>
                        ) : (
                            <div className="space-y-1.5">
                                {logs.map((log, i) => (
                                    <div key={i} className={`p-2 rounded border-l-2 text-[9px] leading-tight ${log.includes('Error') ? 'bg-red-50 dark:bg-red-900/10 border-red-500 text-red-800 dark:text-red-200' : log.includes('Success') ? 'bg-green-50 dark:bg-green-900/10 border-green-500 text-green-800 dark:text-green-200' : 'bg-slate-50 dark:bg-slate-800 border-slate-400 text-slate-700 dark:text-slate-300'}`}>
                                        <span className="font-bold opacity-75">{log.split('] ')[0]}]</span> {log.split('] ')[1]}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-[10px] text-slate-500">
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
                    <span className="font-bold uppercase tracking-widest">{loading ? 'WORKING' : 'SYSTEM IDLE'}</span>
                </div>
                <button onClick={handleForceRefresh} className="hover:text-red-600 transition-colors uppercase font-black cursor-pointer">
                    RELOAD UI
                </button>
            </div>
        </div>
    )
}
