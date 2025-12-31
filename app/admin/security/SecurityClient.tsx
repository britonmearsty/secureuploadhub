"use client"

import { useState, useEffect } from "react"
import { AlertCircle, Trash2, Plus, X, Check, Shield, Lock, Eye, EyeOff } from "lucide-react"

interface FailedLogin {
    id: string
    email: string
    ipAddress: string
    userAgent?: string
    timestamp: Date
    reason: string
}

interface IPWhitelist {
    id: string
    ipAddress: string
    description: string
    createdAt: Date
}

interface RateLimitConfig {
    id: string
    endpoint: string
    requestsPerMinute: number
    enabled: boolean
}

interface SecurityData {
    failedLogins: FailedLogin[]
    whitelistIPs: IPWhitelist[]
    rateLimits: RateLimitConfig[]
    twoFAStatus: {
        enabled: boolean
        usersWithTwoFA: number
        totalUsers: number
    }
}

export default function SecurityClient({ data }: { data: SecurityData }) {
    const [securityData, setSecurityData] = useState(data)
    const [newIP, setNewIP] = useState("")
    const [newIPDesc, setNewIPDesc] = useState("")
    const [showAddIP, setShowAddIP] = useState(false)
    const [loading, setLoading] = useState(false)

    const addIPToWhitelist = async () => {
        if (!newIP.trim()) return

        setLoading(true)
        try {
            const res = await fetch("/api/admin/security/whitelist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ipAddress: newIP,
                    description: newIPDesc,
                }),
            })
            if (res.ok) {
                const newEntry = await res.json()
                setSecurityData({
                    ...securityData,
                    whitelistIPs: [newEntry, ...securityData.whitelistIPs],
                })
                setNewIP("")
                setNewIPDesc("")
                setShowAddIP(false)
            }
        } catch (error) {
            console.error("Failed to add IP:", error)
        } finally {
            setLoading(false)
        }
    }

    const removeIPFromWhitelist = async (id: string) => {
        try {
            const res = await fetch(`/api/admin/security/whitelist/${id}`, {
                method: "DELETE",
            })
            if (res.ok) {
                setSecurityData({
                    ...securityData,
                    whitelistIPs: securityData.whitelistIPs.filter(ip => ip.id !== id),
                })
            }
        } catch (error) {
            console.error("Failed to remove IP:", error)
        }
    }

    const clearFailedLogins = async () => {
        try {
            const res = await fetch("/api/admin/security/failed-logins", {
                method: "DELETE",
            })
            if (res.ok) {
                setSecurityData({
                    ...securityData,
                    failedLogins: [],
                })
            }
        } catch (error) {
            console.error("Failed to clear logs:", error)
        }
    }

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Security Settings</h1>
                <p className="text-slate-600 mt-1">Manage authentication, IP whitelist, and rate limiting</p>
            </div>

            {/* 2FA Status Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                        <div className="bg-blue-100 p-3 rounded-lg">
                            <Shield className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Two-Factor Authentication</h2>
                            <p className="text-sm text-slate-600 mt-1">
                                {securityData.twoFAStatus.usersWithTwoFA} of {securityData.twoFAStatus.totalUsers} users have 2FA enabled
                            </p>
                            <div className="mt-3">
                                <div className="w-64 bg-slate-200 rounded-full h-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full transition-all"
                                        style={{
                                            width: `${(securityData.twoFAStatus.usersWithTwoFA / securityData.twoFAStatus.totalUsers) * 100}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                            securityData.twoFAStatus.enabled ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}
                    >
                        {securityData.twoFAStatus.enabled ? "Enabled" : "Disabled"}
                    </span>
                </div>
            </div>

            {/* Failed Logins Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Failed Login Attempts */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-slate-900">Failed Login Attempts</h2>
                        {securityData.failedLogins.length > 0 && (
                            <button
                                onClick={clearFailedLogins}
                                className="px-3 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                            >
                                <Trash2 className="w-3 h-3 inline mr-1" />
                                Clear
                            </button>
                        )}
                    </div>

                    {securityData.failedLogins.length > 0 ? (
                        <div className="space-y-3">
                            {securityData.failedLogins.slice(0, 10).map((login) => (
                                <div key={login.id} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <p className="font-semibold text-red-900">{login.email}</p>
                                            <p className="text-xs text-red-700">{login.reason}</p>
                                        </div>
                                        <span className="text-xs font-mono text-red-600">{login.ipAddress}</span>
                                    </div>
                                    <p className="text-xs text-red-600">{new Date(login.timestamp).toLocaleString()}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Check className="w-8 h-8 text-green-500 mx-auto mb-2" />
                            <p className="text-slate-600 text-sm">No failed login attempts</p>
                        </div>
                    )}
                </div>

                {/* Rate Limiting Config */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-xl font-bold text-slate-900 mb-4">Rate Limiting Configuration</h2>
                    <div className="space-y-3">
                        {securityData.rateLimits.map((limit) => (
                            <div
                                key={limit.id}
                                className="p-4 border border-slate-200 rounded-lg flex items-center justify-between"
                            >
                                <div>
                                    <p className="font-medium text-slate-900">{limit.endpoint}</p>
                                    <p className="text-sm text-slate-500">
                                        {limit.requestsPerMinute} requests/minute
                                    </p>
                                </div>
                                <span
                                    className={`px-3 py-1 text-xs font-medium rounded-full ${
                                        limit.enabled
                                            ? "bg-green-100 text-green-700"
                                            : "bg-slate-100 text-slate-700"
                                    }`}
                                >
                                    {limit.enabled ? "Enabled" : "Disabled"}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* IP Whitelist Section */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">IP Whitelist</h2>
                        <p className="text-sm text-slate-500 mt-1">Only these IPs can access admin endpoints</p>
                    </div>
                    <button
                        onClick={() => setShowAddIP(!showAddIP)}
                        className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium text-sm"
                    >
                        <Plus className="w-4 h-4 inline mr-2" />
                        Add IP
                    </button>
                </div>

                {/* Add IP Form */}
                {showAddIP && (
                    <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700 mb-2 block">IP Address</label>
                                <input
                                    type="text"
                                    placeholder="192.168.1.1"
                                    value={newIP}
                                    onChange={(e) => setNewIP(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700 mb-2 block">
                                    Description (Optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Office network"
                                    value={newIPDesc}
                                    onChange={(e) => setNewIPDesc(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={addIPToWhitelist}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium disabled:opacity-50"
                                >
                                    Add
                                </button>
                                <button
                                    onClick={() => setShowAddIP(false)}
                                    className="flex-1 px-4 py-2 bg-slate-100 text-slate-900 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Whitelist Table */}
                {securityData.whitelistIPs.length > 0 ? (
                    <div className="space-y-2">
                        {securityData.whitelistIPs.map((ip) => (
                            <div
                                key={ip.id}
                                className="p-4 border border-slate-200 rounded-lg flex items-center justify-between hover:bg-slate-50 transition-colors"
                            >
                                <div className="flex-1">
                                    <p className="font-mono font-medium text-slate-900">{ip.ipAddress}</p>
                                    {ip.description && (
                                        <p className="text-sm text-slate-500">{ip.description}</p>
                                    )}
                                    <p className="text-xs text-slate-400">
                                        Added {new Date(ip.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <button
                                    onClick={() => removeIPFromWhitelist(ip.id)}
                                    className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <Lock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-slate-600 text-sm">No IPs whitelisted. All IPs are allowed.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
