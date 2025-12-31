"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Users,
    Activity,
    PieChart,
    Search,
    ChevronRight,
    X,
    Download,
    FileText,
    User as UserIcon,
    Calendar,
    Layers,
    ArrowUpRight,
    MoreVertical,
    Mail,
    Filter,
    RefreshCw,
    FileImage,
    FileVideo,
    FileAudio,
    File as FileIcon,
    Copy,
    Check
} from "lucide-react"

interface Client {
    key: string
    name: string | null
    email: string | null
    portals: string[]
    lastUpload: {
        date: string
        fileName: string
        portal: string
        mimeType: string
    }
    uploadCount: number
    totalStorageBytes: number
}

interface ClientsClientProps {
    clients: Client[]
}

export default function ClientsClient({ clients: initialClients }: ClientsClientProps) {
    const [activeTab, setActiveTab] = useState("directory")
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedClient, setSelectedClient] = useState<Client | null>(null)
    const [files, setFiles] = useState<any[]>([])
    const [isLoadingFiles, setIsLoadingFiles] = useState(false)
    const [copiedEmail, setCopiedEmail] = useState(false)

    const tabs = [
        { id: "directory", name: "Directory", icon: Users, description: "All clients and their history" },
        { id: "activity", name: "Recent Activity", icon: Activity, description: "Latest uploads across all clients" },
        { id: "stats", name: "Insights", icon: PieChart, description: "Client growth and portal usage" },
    ]

    const filteredClients = initialClients.filter(c =>
    (c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    const handleClientClick = async (client: Client) => {
        setSelectedClient(client)
        setIsLoadingFiles(true)
        try {
            const params = new URLSearchParams()
            if (client.email) params.append('clientEmail', client.email)
            if (client.name) params.append('clientName', client.name)

            const response = await fetch(`/api/uploads/client?${params}`)
            if (response.ok) {
                const data = await response.json()
                setFiles(data)
            }
        } catch (error) {
            console.error('Error fetching client files:', error)
        } finally {
            setIsLoadingFiles(false)
        }
    }

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const handleContactClient = (client: Client) => {
        if (!client.email) return

        const subject = encodeURIComponent(`Message regarding your uploads`)
        const body = encodeURIComponent(`Hi ${client.name || 'there'},\n\nI wanted to follow up regarding your recent uploads.\n\nBest regards`)
        const mailtoLink = `mailto:${client.email}?subject=${subject}&body=${body}`
        window.location.href = mailtoLink
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        setCopiedEmail(true)
        setTimeout(() => setCopiedEmail(false), 2000)
    }

    const getFileIcon = (mimeType: string = "") => {
        if (mimeType.startsWith("image/")) return <FileImage className="w-5 h-5 text-indigo-500" />
        if (mimeType.startsWith("video/")) return <FileVideo className="w-5 h-5 text-pink-500" />
        if (mimeType.startsWith("audio/")) return <FileAudio className="w-5 h-5 text-amber-500" />
        if (mimeType.includes("pdf")) return <FileText className="w-5 h-5 text-red-500" />
        return <FileIcon className="w-5 h-5 text-slate-400" />
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Client Directory</h1>
                <p className="text-slate-500 mt-1 text-lg">Manage your client relationships, track recent file transfers, and monitor activity across all your portals.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Navigation Sidebar */}
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
                                        ? "bg-white shadow-sm border border-slate-200 text-slate-900"
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                        }`}
                                >
                                    <Icon className={`w-5 h-5 ${isActive ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600"}`} />
                                    <span className="font-medium text-sm">{tab.name}</span>
                                    {isActive && (
                                        <motion.div layoutId="clients-active-indicator" className="ml-auto">
                                            <ChevronRight className="w-4 h-4 text-slate-400" />
                                        </motion.div>
                                    )}
                                </button>
                            )
                        })}
                    </nav>

                    <div className="mt-8 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Quick Stats</h4>
                        <div className="space-y-3">
                            <div className="flex justify-between items-end">
                                <span className="text-xs text-slate-500">Total Clients</span>
                                <span className="text-sm font-bold text-slate-900">{initialClients.length}</span>
                            </div>
                            <div className="flex justify-between items-end">
                                <span className="text-xs text-slate-500">Active Portals</span>
                                <span className="text-sm font-bold text-slate-900">
                                    {new Set(initialClients.flatMap(c => c.portals)).size}
                                </span>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Content Area */}
                <main className="flex-1 min-w-0">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-xl font-semibold text-slate-900">
                                            {tabs.find(t => t.id === activeTab)?.name}
                                        </h2>
                                        <p className="text-sm text-slate-500 mt-1">
                                            {tabs.find(t => t.id === activeTab)?.description}
                                        </p>
                                    </div>

                                    {activeTab === "directory" && (
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Filter clients..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full md:w-64 pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 transition-all outline-none text-sm"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="p-0">
                                    {activeTab === "directory" && (
                                        <div className="divide-y divide-slate-100">
                                            {filteredClients.length > 0 ? (
                                                filteredClients.map((client) => (
                                                    <button
                                                        key={client.key}
                                                        onClick={() => handleClientClick(client)}
                                                        className="w-full flex items-center gap-4 p-5 text-left hover:bg-slate-50/50 transition-colors group"
                                                    >
                                                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold group-hover:bg-white transition-colors">
                                                            {client.name?.charAt(0) || client.email?.charAt(0).toUpperCase() || "?"}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-slate-900 truncate">
                                                                    {client.name || "Unknown Client"}
                                                                </span>
                                                                {client.uploadCount > 5 && (
                                                                    <span className="bg-emerald-100 text-emerald-600 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">Frequent</span>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-slate-500 truncate">{client.email || "No email provided"}</p>
                                                        </div>
                                                        <div className="hidden md:flex flex-col items-end gap-1 px-4">
                                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                                                                <Layers className="w-3.5 h-3.5" />
                                                                {client.portals.length} Portals
                                                            </div>
                                                            <div className="text-[10px] text-slate-400">
                                                                {client.uploadCount} uploads
                                                            </div>
                                                        </div>
                                                        <div className="p-2 text-slate-300 group-hover:text-slate-900 transition-colors">
                                                            <ChevronRight className="w-5 h-5" />
                                                        </div>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="text-center py-20 px-6">
                                                    <div className="p-4 bg-slate-50 rounded-full w-fit mx-auto mb-4">
                                                        <Users className="w-8 h-8 text-slate-200" />
                                                    </div>
                                                    <h4 className="text-slate-900 font-semibold mb-1">No clients found</h4>
                                                    <p className="text-slate-500 text-sm max-w-xs mx-auto">
                                                        We couldn't find any clients matching your search. Try a different term or invite new clients to upload.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === "activity" && (
                                        <div className="divide-y divide-slate-100">
                                            {initialClients
                                                .sort((a, b) => new Date(b.lastUpload.date).getTime() - new Date(a.lastUpload.date).getTime())
                                                .map((client) => (
                                                    <div key={client.key} className="p-5 flex gap-4 transition-colors hover:bg-slate-50/30">
                                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                                            {getFileIcon(client.lastUpload.mimeType)}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm text-slate-900">
                                                                <span className="font-bold">{client.name || client.email}</span> uploaded <span className="font-medium">"{client.lastUpload.fileName}"</span>
                                                            </p>
                                                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                                                {new Date(client.lastUpload.date).toLocaleDateString()} · Through {client.lastUpload.portal}
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => handleClientClick(client)}
                                                            className="text-xs font-bold text-slate-400 hover:text-slate-900 underline underline-offset-4"
                                                        >
                                                            View
                                                        </button>
                                                    </div>
                                                ))}
                                        </div>
                                    )}

                                    {activeTab === "stats" && (
                                        <div className="p-12 text-center">
                                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 inline-block mb-6">
                                                <PieChart className="w-12 h-12 text-slate-200" />
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-900 mb-2">Detailed Insights</h3>
                                            <p className="text-slate-500 text-sm max-w-md mx-auto mb-8">
                                                We are building advanced analytics to help you understand your client engagement better. Check back soon for growth charts and portal performance.
                                            </p>
                                            <div className="flex flex-wrap justify-center gap-4">
                                                <div className="bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100 min-w-[140px]">
                                                    <p className="text-3xl font-extrabold text-slate-900">{initialClients.length}</p>
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Total Reach</p>
                                                </div>
                                                <div className="bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100 min-w-[140px]">
                                                    <p className="text-3xl font-extrabold text-slate-900">
                                                        {initialClients.reduce((acc, c) => acc + c.uploadCount, 0)}
                                                    </p>
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Files Handled</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>

            {/* Client Detail Modal */}
            <AnimatePresence>
                {selectedClient && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedClient(null)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center text-xl font-bold text-slate-900">
                                        {selectedClient.name?.charAt(0) || selectedClient.email?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-slate-900 leading-tight">
                                            {selectedClient.name || "Unknown Client"}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-slate-500 flex items-center gap-1.5">
                                                <Mail className="w-3.5 h-3.5" />
                                                {selectedClient.email || "No email available"}
                                            </p>
                                            {selectedClient.email && (
                                                <button
                                                    onClick={() => copyToClipboard(selectedClient.email!)}
                                                    className={`p-1.5 rounded-lg transition-all border ${copiedEmail
                                                        ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                                        : "bg-white text-slate-400 hover:text-slate-600 hover:border-slate-300 border-slate-100"
                                                        }`}
                                                    title="Copy email address"
                                                >
                                                    {copiedEmail ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedClient(null)}
                                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-8">
                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Files</p>
                                        <p className="text-xl font-bold text-slate-900">{selectedClient.uploadCount}</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Data</p>
                                        <p className="text-xl font-bold text-slate-900">{formatFileSize(selectedClient.totalStorageBytes)}</p>
                                    </div>
                                </div>

                                <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-slate-400" />
                                    Shared Documents
                                </h4>

                                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                                    {isLoadingFiles ? (
                                        <div className="py-12 text-center">
                                            <RefreshCw className="w-8 h-8 text-slate-200 animate-spin mx-auto mb-2" />
                                            <p className="text-slate-400 text-sm italic">Retrieving file history...</p>
                                        </div>
                                    ) : files.length > 0 ? (
                                        files.map((file) => (
                                            <div key={file.id} className="p-4 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all flex items-center justify-between group">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-white group-hover:shadow-sm transition-all shrink-0">
                                                        {getFileIcon(file.mimeType)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-slate-900 truncate">{file.fileName}</p>
                                                        <p className="text-xs text-slate-500 mt-0.5">
                                                            {formatFileSize(file.fileSize)} · {new Date(file.createdAt).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <a
                                                    href={`/api/uploads/${file.id}/download`}
                                                    className="w-10 h-10 bg-white shadow-sm border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 hover:border-slate-300 transition-all group-hover:scale-105 shrink-0"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </a>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center py-8 text-slate-400 italic text-sm">No documents found.</p>
                                    )}
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                                <button
                                    onClick={() => setSelectedClient(null)}
                                    className="px-6 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                                >
                                    Close
                                </button>
                                {selectedClient.email && (
                                    <button
                                        onClick={() => handleContactClient(selectedClient)}
                                        className="px-6 py-2.5 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 shadow-sm transition-all flex items-center gap-2"
                                    >
                                        Contact Client <ArrowUpRight className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )
                }
            </AnimatePresence >
        </div >
    )
}
