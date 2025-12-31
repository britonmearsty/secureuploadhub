"use client"

import { useState, useEffect } from "react"
import { Search, MoreVertical, Eye, Edit2, Trash2, X, Plus, Check } from "lucide-react"

interface EmailTemplate {
    id: string
    name: string
    displayName: string
    subject: string
    body: string
    description: string | null
    isEnabled: boolean
    variables: string[]
    createdAt: Date
    updatedAt: Date
}

interface EmailTemplatesClientProps {
    templates: EmailTemplate[]
}

const VARIABLE_REFERENCE = [
    { name: "userName", description: "User's full name" },
    { name: "userEmail", description: "User's email address" },
    { name: "portalName", description: "Upload portal name" },
    { name: "portalUrl", description: "Portal URL" },
    { name: "uploadLink", description: "Direct upload link" },
    { name: "resetLink", description: "Password reset link" },
    { name: "companyName", description: "Company name" },
]

export default function EmailTemplatesClient({ templates: initialTemplates }: EmailTemplatesClientProps) {
    const [templates, setTemplates] = useState<EmailTemplate[]>(initialTemplates)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [showForm, setShowForm] = useState(false)
    const [loading, setLoading] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        displayName: "",
        subject: "",
        body: "",
        description: "",
        variables: [] as string[]
    })

    const filteredTemplates = templates.filter((t) => {
        const query = searchQuery.toLowerCase()
        return (
            t.displayName.toLowerCase().includes(query) ||
            t.name.toLowerCase().includes(query) ||
            t.subject.toLowerCase().includes(query)
        )
    })

    const handleEdit = (template: EmailTemplate) => {
        setSelectedTemplate(template)
        setFormData({
            displayName: template.displayName,
            subject: template.subject,
            body: template.body,
            description: template.description || "",
            variables: template.variables
        })
        setIsEditing(true)
        setShowForm(false)
    }

    const handleSave = async () => {
        if (!selectedTemplate) return

        setLoading(true)
        try {
            const res = await fetch(`/api/admin/email-templates/${selectedTemplate.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subject: formData.subject,
                    body: formData.body,
                    description: formData.description,
                    variables: formData.variables
                })
            })

            if (res.ok) {
                const { template } = await res.json()
                setTemplates(templates.map(t => t.id === template.id ? template : t))
                setSelectedTemplate(template)
                setIsEditing(false)
            }
        } catch (error) {
            console.error("Failed to save template:", error)
        } finally {
            setLoading(false)
        }
    }

    const toggleEnabled = async (template: EmailTemplate) => {
        try {
            const res = await fetch(`/api/admin/email-templates/${template.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isEnabled: !template.isEnabled })
            })

            if (res.ok) {
                const { template: updated } = await res.json()
                setTemplates(templates.map(t => t.id === updated.id ? updated : t))
                if (selectedTemplate?.id === updated.id) {
                    setSelectedTemplate(updated)
                }
            }
        } catch (error) {
            console.error("Failed to toggle template:", error)
        }
    }

    const deleteTemplate = async (templateId: string) => {
        try {
            const res = await fetch(`/api/admin/email-templates/${templateId}`, {
                method: "DELETE"
            })

            if (res.ok) {
                setTemplates(templates.filter(t => t.id !== templateId))
                setSelectedTemplate(null)
                setDeleteConfirm(null)
            }
        } catch (error) {
            console.error("Failed to delete template:", error)
        }
    }

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Email Templates</h1>
                <p className="text-slate-500 mt-1">Manage transactional and notification emails</p>
            </div>

            {/* Search and Actions */}
            <div className="mb-6 flex gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search templates..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Templates List */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Template
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Subject
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {filteredTemplates.map((template) => (
                                <tr key={template.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-semibold text-slate-900">{template.displayName}</p>
                                            <p className="text-sm text-slate-500">{template.name}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 text-sm truncate max-w-xs">
                                        {template.subject}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                                            template.isEnabled
                                                ? "bg-green-100 text-green-700"
                                                : "bg-slate-100 text-slate-600"
                                        }`}>
                                            {template.isEnabled ? "Enabled" : "Disabled"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right flex gap-2 justify-end">
                                        <button
                                            onClick={() => handleEdit(template)}
                                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                            title="Edit template"
                                        >
                                            <Edit2 className="w-4 h-4 text-slate-400" />
                                        </button>
                                        <button
                                            onClick={() => toggleEnabled(template)}
                                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                            title={template.isEnabled ? "Disable" : "Enable"}
                                        >
                                            <Check className={`w-4 h-4 ${template.isEnabled ? "text-green-500" : "text-slate-400"}`} />
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirm(template.id)}
                                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                            title="Delete template"
                                        >
                                            <Trash2 className="w-4 h-4 text-red-400" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {filteredTemplates.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-slate-500">No email templates found</p>
                </div>
            )}

            {/* Template Editor Modal */}
            {isEditing && selectedTemplate && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white">
                            <h2 className="text-2xl font-bold text-slate-900">Edit Template</h2>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Subject */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-900 mb-2">
                                    Email Subject
                                </label>
                                <input
                                    type="text"
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                />
                            </div>

                            {/* Body */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-900 mb-2">
                                    Email Body
                                </label>
                                <textarea
                                    value={formData.body}
                                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                                    rows={10}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent font-mono text-sm"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-900 mb-2">
                                    Description (optional)
                                </label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Describe when this template is used..."
                                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                />
                            </div>

                            {/* Variables Reference */}
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <p className="text-sm font-semibold text-slate-900 mb-3">Available Variables</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {VARIABLE_REFERENCE.map((variable) => (
                                        <div key={variable.name} className="flex items-center justify-between">
                                            <code className="bg-white px-2 py-1 rounded text-xs font-mono text-slate-900">
                                                {`{{${variable.name}}}`}
                                            </code>
                                            <span className="text-xs text-slate-600">{variable.description}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-4 border-t border-slate-200">
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="flex-1 py-2 px-4 border border-slate-200 text-slate-900 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="flex-1 py-2 px-4 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium disabled:opacity-50"
                                >
                                    {loading ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-sm w-full p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Template?</h3>
                        <p className="text-slate-600 mb-6">
                            This action cannot be undone. The template will be permanently deleted.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 py-2 px-4 border border-slate-200 text-slate-900 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => deleteTemplate(deleteConfirm)}
                                className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
