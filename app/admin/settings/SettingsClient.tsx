"use client"

import { useState } from "react"
import { Save } from "lucide-react"

interface SettingsClientProps {
    initialSettings: Record<string, string>
}

export default function SettingsClient({ initialSettings }: SettingsClientProps) {
    const [settings, setSettings] = useState(initialSettings)
    const [hasChanges, setHasChanges] = useState(false)
    const [loading, setLoading] = useState(false)
    const [saved, setSaved] = useState(false)

    const handleChange = (key: string, value: string) => {
        setSettings(prev => ({
            ...prev,
            [key]: value
        }))
        setHasChanges(true)
        setSaved(false)
    }

    const handleSave = async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/admin/platform-settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings)
            })

            if (res.ok) {
                const { settings: updated } = await res.json()
                setSettings(updated)
                setHasChanges(false)
                setSaved(true)
                setTimeout(() => setSaved(false), 3000)
            }
        } catch (error) {
            console.error("Failed to save settings:", error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
                <p className="text-slate-500 mt-1">Manage system-wide settings and configuration</p>
            </div>

            <div className="max-w-4xl space-y-8">
                {/* General Settings */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                        <h2 className="text-lg font-bold text-slate-900">General Settings</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-900 mb-2">
                                Site Name
                            </label>
                            <input
                                type="text"
                                value={settings["siteName"] || ""}
                                onChange={(e) => handleChange("siteName", e.target.value)}
                                placeholder="e.g., Secure Upload Hub"
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-900 mb-2">
                                Site Description
                            </label>
                            <textarea
                                value={settings["siteDescription"] || ""}
                                onChange={(e) => handleChange("siteDescription", e.target.value)}
                                placeholder="Brief description of your platform"
                                rows={3}
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-900 mb-2">
                                Company Name
                            </label>
                            <input
                                type="text"
                                value={settings["companyName"] || ""}
                                onChange={(e) => handleChange("companyName", e.target.value)}
                                placeholder="Legal company name"
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-900 mb-2">
                                Logo URL
                            </label>
                            <input
                                type="url"
                                value={settings["logoUrl"] || ""}
                                onChange={(e) => handleChange("logoUrl", e.target.value)}
                                placeholder="https://example.com/logo.png"
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* Email Settings */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                        <h2 className="text-lg font-bold text-slate-900">Email Settings</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-900 mb-2">
                                SMTP Host
                            </label>
                            <input
                                type="text"
                                value={settings["smtpHost"] || ""}
                                onChange={(e) => handleChange("smtpHost", e.target.value)}
                                placeholder="smtp.example.com"
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-900 mb-2">
                                    SMTP Port
                                </label>
                                <input
                                    type="number"
                                    value={settings["smtpPort"] || ""}
                                    onChange={(e) => handleChange("smtpPort", e.target.value)}
                                    placeholder="587"
                                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-900 mb-2">
                                    SMTP Protocol
                                </label>
                                <select
                                    value={settings["smtpProtocol"] || "tls"}
                                    onChange={(e) => handleChange("smtpProtocol", e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                >
                                    <option value="tls">TLS</option>
                                    <option value="ssl">SSL</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-900 mb-2">
                                SMTP Username
                            </label>
                            <input
                                type="text"
                                value={settings["smtpUsername"] || ""}
                                onChange={(e) => handleChange("smtpUsername", e.target.value)}
                                placeholder="your-email@example.com"
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-900 mb-2">
                                SMTP Password
                            </label>
                            <input
                                type="password"
                                value={settings["smtpPassword"] || ""}
                                onChange={(e) => handleChange("smtpPassword", e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-900 mb-2">
                                Default Sender Email
                            </label>
                            <input
                                type="email"
                                value={settings["emailFromAddress"] || ""}
                                onChange={(e) => handleChange("emailFromAddress", e.target.value)}
                                placeholder="noreply@example.com"
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-900 mb-2">
                                Default Sender Name
                            </label>
                            <input
                                type="text"
                                value={settings["emailFromName"] || ""}
                                onChange={(e) => handleChange("emailFromName", e.target.value)}
                                placeholder="Secure Upload Hub"
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* Upload Settings */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                        <h2 className="text-lg font-bold text-slate-900">Upload Settings</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-900 mb-2">
                                Max File Size (MB)
                            </label>
                            <input
                                type="number"
                                value={settings["maxFileSize"] || ""}
                                onChange={(e) => handleChange("maxFileSize", e.target.value)}
                                placeholder="500"
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-900 mb-2">
                                Allowed File Types (comma-separated)
                            </label>
                            <input
                                type="text"
                                value={settings["allowedFileTypes"] || ""}
                                onChange={(e) => handleChange("allowedFileTypes", e.target.value)}
                                placeholder="pdf,doc,docx,xlsx,zip"
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-900 mb-2">
                                Storage Provider
                            </label>
                            <select
                                value={settings["storageProvider"] || "local"}
                                onChange={(e) => handleChange("storageProvider", e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                            >
                                <option value="local">Local Storage</option>
                                <option value="s3">AWS S3</option>
                                <option value="gcs">Google Cloud Storage</option>
                                <option value="azure">Azure Blob</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Security Settings */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                        <h2 className="text-lg font-bold text-slate-900">Security Settings</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-900 mb-2">
                                Session Timeout (minutes)
                            </label>
                            <input
                                type="number"
                                value={settings["sessionTimeout"] || ""}
                                onChange={(e) => handleChange("sessionTimeout", e.target.value)}
                                placeholder="30"
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-900 mb-2">
                                Minimum Password Length
                            </label>
                            <input
                                type="number"
                                value={settings["passwordMinLength"] || ""}
                                onChange={(e) => handleChange("passwordMinLength", e.target.value)}
                                placeholder="8"
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                            />
                        </div>

                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={settings["requirePasswordNumbers"] === "true"}
                                    onChange={(e) => handleChange("requirePasswordNumbers", e.target.checked ? "true" : "false")}
                                    className="w-4 h-4 border border-slate-300 rounded"
                                />
                                <span className="text-sm font-medium text-slate-900">Require numbers in password</span>
                            </label>
                        </div>

                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={settings["requirePasswordSpecial"] === "true"}
                                    onChange={(e) => handleChange("requirePasswordSpecial", e.target.checked ? "true" : "false")}
                                    className="w-4 h-4 border border-slate-300 rounded"
                                />
                                <span className="text-sm font-medium text-slate-900">Require special characters</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Feature Flags */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                        <h2 className="text-lg font-bold text-slate-900">Feature Flags</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={settings["featureBlog"] === "true"}
                                    onChange={(e) => handleChange("featureBlog", e.target.checked ? "true" : "false")}
                                    className="w-4 h-4 border border-slate-300 rounded"
                                />
                                <span className="text-sm font-medium text-slate-900">Enable Blog</span>
                            </label>
                        </div>

                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={settings["featureAnalytics"] === "true"}
                                    onChange={(e) => handleChange("featureAnalytics", e.target.checked ? "true" : "false")}
                                    className="w-4 h-4 border border-slate-300 rounded"
                                />
                                <span className="text-sm font-medium text-slate-900">Enable Analytics</span>
                            </label>
                        </div>

                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={settings["maintenanceMode"] === "true"}
                                    onChange={(e) => handleChange("maintenanceMode", e.target.checked ? "true" : "false")}
                                    className="w-4 h-4 border border-slate-300 rounded"
                                />
                                <span className="text-sm font-medium text-slate-900">Maintenance Mode</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Links & Contact */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                        <h2 className="text-lg font-bold text-slate-900">Links & Contact</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-900 mb-2">
                                Contact Email
                            </label>
                            <input
                                type="email"
                                value={settings["contactEmail"] || ""}
                                onChange={(e) => handleChange("contactEmail", e.target.value)}
                                placeholder="support@example.com"
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-900 mb-2">
                                Terms & Conditions URL
                            </label>
                            <input
                                type="url"
                                value={settings["termsUrl"] || ""}
                                onChange={(e) => handleChange("termsUrl", e.target.value)}
                                placeholder="https://example.com/terms"
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-900 mb-2">
                                Privacy Policy URL
                            </label>
                            <input
                                type="url"
                                value={settings["privacyUrl"] || ""}
                                onChange={(e) => handleChange("privacyUrl", e.target.value)}
                                placeholder="https://example.com/privacy"
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex gap-4">
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges || loading}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save className="w-4 h-4" />
                        {loading ? "Saving..." : "Save Settings"}
                    </button>
                    {saved && (
                        <div className="flex items-center gap-2 text-green-600 font-medium">
                            ✓ Settings saved successfully
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
