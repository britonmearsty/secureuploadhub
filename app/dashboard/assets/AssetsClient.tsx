"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Database,
    Search,
    ChevronRight,
    Download,
    File,
    Folder,
    Cloud,
    HardDrive,
    Server,
    Filter,
    LayoutGrid,
    Layout,
    List as ListIcon,
    PieChart,
    TrendingUp,
    Calendar,
    ExternalLink,
    ChevronDown,
    Inbox,
    FileText,
    FileJson,
    FileCode,
    FileImage,
    Music,
    Video,
    Archive,
    Trash2,
    X,
    RefreshCw
} from "lucide-react"

interface FileUpload {
    id: string
    fileName: string
    fileSize: number
    mimeType: string
    storageProvider: string
    storagePath: string | null
    createdAt: string
    clientName: string | null
    clientEmail: string | null
    portal: {
        name: string
        slug: string
        primaryColor: string
    }
}

interface AssetsClientProps {
    initialUploads: FileUpload[]
}

export default function AssetsClient({ initialUploads }: AssetsClientProps) {
    const [activeTab, setActiveTab] = useState("all")
    const [searchQuery, setSearchQuery] = useState("")
    const [viewMode, setViewMode] = useState<"grid" | "list">("list")
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

    const tabs = [
        { id: "all", name: "All Assets", icon: Database, description: "All uploaded files across all providers" },
        { id: "storage", name: "By Storage", icon: Server, description: "Organized by cloud provider" },
        { id: "stats", name: "Insights", icon: PieChart, description: "Storage usage and distribution" },
    ]



    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const getProviderIcon = (provider: string) => {
        switch (provider.toLowerCase()) {
            case 'dropbox': return <Cloud className="w-5 h-5 text-blue-500" />
            case 'google_drive': return <HardDrive className="w-5 h-5 text-emerald-500" />
            default: return <Server className="w-5 h-5 text-slate-400" />
        }
    }

    const getFileIcon = (fileName: string, mimeType: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase() || ''
        const iconProps = "w-5 h-5"

        // Check mime types first
        if (mimeType?.startsWith('image/')) return <FileImage className={`${iconProps} text-pink-500`} />
        if (mimeType?.startsWith('audio/')) return <Music className={`${iconProps} text-cyan-500`} />
        if (mimeType?.startsWith('video/')) return <Video className={`${iconProps} text-indigo-500`} />
        if (mimeType === 'application/pdf') return <File className={`${iconProps} text-red-500`} />
        if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel') || mimeType?.includes('csv'))
            return <FileText className={`${iconProps} text-green-500`} />
        if (mimeType?.includes('presentation') || mimeType?.includes('powerpoint'))
            return <FileText className={`${iconProps} text-orange-500`} />
        if (mimeType?.includes('word') || mimeType?.includes('document'))
            return <FileText className={`${iconProps} text-blue-500`} />
        if (mimeType?.includes('json') || mimeType?.includes('xml'))
            return <FileJson className={`${iconProps} text-yellow-600`} />
        if (mimeType?.includes('zip') || mimeType?.includes('compressed') || mimeType?.includes('tar') || mimeType?.includes('archive'))
            return <Archive className={`${iconProps} text-amber-600`} />

        // Fallback to extensions
        if (['doc', 'docx'].includes(ext)) return <FileText className={`${iconProps} text-blue-500`} />
        if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileText className={`${iconProps} text-green-500`} />
        if (['ppt', 'pptx'].includes(ext)) return <FileText className={`${iconProps} text-orange-500`} />

        if (['py', 'js', 'ts', 'tsx', 'jsx', 'java', 'cpp', 'c', 'cs', 'rb', 'php', 'go', 'rs', 'sh', 'bash', 'html', 'css', 'scss'].includes(ext))
            return <FileCode className={`${iconProps} text-purple-500`} />

        return <File className={`${iconProps} text-slate-400`} />
    }

    const toggleFolder = (path: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev)
            if (next.has(path)) next.delete(path)
            else next.add(path)
            return next
        })
    }

    // Delete Modal State
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [fileToDelete, setFileToDelete] = useState<FileUpload | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [uploads, setUploads] = useState(initialUploads)

    const handleDeleteRequest = (file: FileUpload) => {
        setFileToDelete(file)
        setShowDeleteModal(true)
    }

    const confirmDelete = async () => {
        if (!fileToDelete) return

        setIsDeleting(true)
        try {
            const res = await fetch(`/api/uploads/${fileToDelete.id}`, {
                method: 'DELETE',
            })
            if (res.ok) {
                setUploads(prev => prev.filter(u => u.id !== fileToDelete.id))
                setShowDeleteModal(false)
                setFileToDelete(null)
            } else {
                alert('Failed to delete file')
            }
        } catch (error) {
            alert('Error deleting file')
        } finally {
            setIsDeleting(false)
        }
    }

    // Update filtered uploads to use local state 'uploads' instead of prop 'initialUploads'
    const filteredUploads = uploads.filter(u =>
        u.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.portal.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Update stats to depend on 'uploads'
    const stats = useMemo(() => {
        const totalSize = uploads.reduce((acc, u) => acc + u.fileSize, 0)
        const byProvider = uploads.reduce((acc, u) => {
            acc[u.storageProvider] = (acc[u.storageProvider] || 0) + 1
            return acc
        }, {} as Record<string, number>)

        return {
            totalFiles: uploads.length,
            totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
            byProvider
        }
    }, [uploads])

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="mb-10">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">Assets</h1>
                <p className="text-slate-500 mt-2 text-lg max-w-2xl leading-relaxed">
                    A centralized, secure command center for all client documents across your connected cloud storage ecosystems.
                </p>
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
                                        <motion.div layoutId="assets-active-indicator" className="ml-auto">
                                            <ChevronRight className="w-4 h-4 text-slate-400" />
                                        </motion.div>
                                    )}
                                </button>
                            )
                        })}
                    </nav>

                    <div className="mt-8 p-6 bg-slate-50 border border-slate-100 rounded-3xl">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Storage Pulse</h4>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-xs mb-1.5">
                                    <span className="text-slate-500 font-medium">Total Volume</span>
                                    <span className="text-slate-900 font-bold">{stats.totalSizeMB} MB</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: "45%" }}
                                        className="h-full bg-slate-900"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    <span className="text-xs text-slate-600">Dropbox</span>
                                </div>
                                <span className="text-xs font-bold text-slate-900">{stats.byProvider['dropbox'] || 0}</span>
                            </div>
                            <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span className="text-xs text-slate-600">Google Drive</span>
                                </div>
                                <span className="text-xs font-bold text-slate-900">{stats.byProvider['google_drive'] || 0}</span>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Content Area */}
                <main className="flex-1 min-w-0">
                    <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search assets..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900 transition-all outline-none text-sm"
                            />
                        </div>
                        <div className="flex items-center gap-2 p-1 bg-slate-100 border border-slate-200 rounded-xl w-fit">
                            <button
                                onClick={() => setViewMode("grid")}
                                className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode("list")}
                                className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                            >
                                <ListIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab + viewMode}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-slate-100 bg-slate-50/30">
                                    <h2 className="text-xl font-bold text-slate-900">
                                        {tabs.find(t => t.id === activeTab)?.name}
                                    </h2>
                                    <p className="text-sm text-slate-500 mt-1">
                                        {tabs.find(t => t.id === activeTab)?.description}
                                    </p>
                                </div>

                                <div className="p-0">
                                    {activeTab === "all" && (
                                        <div className={viewMode === "list" ? "divide-y divide-slate-100" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6"}>
                                            {filteredUploads.length > 0 ? (
                                                filteredUploads.map((file) => (
                                                    <FileItem key={file.id} file={file} viewMode={viewMode} formatFileSize={formatFileSize} getProviderIcon={getProviderIcon} getFileIcon={getFileIcon} onDelete={handleDeleteRequest} />
                                                ))
                                            ) : (
                                                <div className="text-center py-24 px-6 col-span-full">
                                                    <div className="p-4 bg-slate-50 rounded-full w-fit mx-auto mb-4">
                                                        <Inbox className="w-8 h-8 text-slate-200" />
                                                    </div>
                                                    <h4 className="text-slate-900 font-bold mb-1 text-lg">No Assets Found</h4>
                                                    <p className="text-slate-500 text-sm max-w-xs mx-auto">
                                                        Your vault is empty or no files match your current search criteria.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === "storage" && (
                                        <div className="p-6 space-y-8">
                                            {['dropbox', 'google_drive', 'local'].map(provider => {
                                                const providerFiles = filteredUploads.filter(u => u.storageProvider === provider)
                                                if (providerFiles.length === 0) return null

                                                return (
                                                    <div key={provider} className="bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden">
                                                        <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 bg-slate-50 rounded-xl">
                                                                    {getProviderIcon(provider)}
                                                                </div>
                                                                <h3 className="font-bold text-slate-900 capitalize">{provider.replace('_', ' ')}</h3>
                                                            </div>
                                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{providerFiles.length} items</span>
                                                        </div>
                                                        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4" : "divide-y divide-slate-100/50"}>
                                                            {providerFiles.map(file => (
                                                                <FileItem key={file.id} file={file} viewMode={viewMode} formatFileSize={formatFileSize} getProviderIcon={getProviderIcon} getFileIcon={getFileIcon} onDelete={handleDeleteRequest} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}

                                    {activeTab === "stats" && (
                                        <div className={`transition-all duration-300 ${viewMode === 'list' ? "p-8" : "p-12"} text-center`}>
                                            <div className={`mx-auto transition-all duration-300 bg-slate-50 rounded-full border border-slate-100 relative flex items-center justify-center ${viewMode === 'list' ? "w-20 h-20 mb-6" : "w-32 h-32 mb-8"
                                                }`}>
                                                <PieChart className={`text-slate-200 transition-all ${viewMode === 'list' ? "w-10 h-10" : "w-16 h-16"}`} />
                                                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full flex items-center justify-center shadow-sm transition-all ${viewMode === 'list' ? "w-7 h-7" : "w-10 h-10"
                                                    }`}>
                                                    <TrendingUp className={`text-slate-900 ${viewMode === 'list' ? "w-3.5 h-3.5" : "w-5 h-5"}`} />
                                                </div>
                                            </div>

                                            <div className={viewMode === 'list' ? "flex flex-col items-center" : ""}>
                                                <h3 className={`font-black text-slate-900 mb-2 transition-all ${viewMode === 'list' ? "text-xl" : "text-2xl"}`}>Storage Intelligence</h3>
                                                <p className={`text-slate-500 text-sm max-w-md mx-auto leading-relaxed transition-all ${viewMode === 'list' ? "mb-8" : "mb-10"}`}>
                                                    Monitor how your storage is distributed across your connected cloud ecosystems.
                                                </p>
                                            </div>

                                            <div className={`grid gap-4 mx-auto transition-all ${viewMode === 'list'
                                                ? "grid-cols-2 md:grid-cols-4 max-w-4xl"
                                                : "grid-cols-2 md:grid-cols-4 max-w-3xl"
                                                }`}>
                                                <div className={`bg-slate-50 rounded-3xl border border-slate-100 group hover:bg-white hover:border-slate-200 transition-all ${viewMode === 'list' ? "p-4" : "p-6"
                                                    }`}>
                                                    <p className={`font-black text-slate-900 transition-all ${viewMode === 'list' ? "text-2xl" : "text-3xl"}`}>{stats.totalFiles}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Files Collected</p>
                                                </div>
                                                <div className={`bg-slate-50 rounded-3xl border border-slate-100 group hover:bg-white hover:border-slate-200 transition-all ${viewMode === 'list' ? "p-4" : "p-6"
                                                    }`}>
                                                    <p className={`font-black text-slate-900 transition-all ${viewMode === 'list' ? "text-2xl" : "text-3xl"}`}>{Math.round(parseFloat(stats.totalSizeMB))}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">MB Utilized</p>
                                                </div>
                                                <div className={`bg-slate-50 rounded-3xl border border-slate-100 group hover:bg-white hover:border-slate-200 transition-all ${viewMode === 'list' ? "p-4" : "p-6"
                                                    }`}>
                                                    <p className={`font-black text-slate-900 transition-all ${viewMode === 'list' ? "text-2xl" : "text-3xl"}`}>{Object.keys(stats.byProvider).length}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Providers</p>
                                                </div>
                                                <div className={`bg-slate-50 rounded-3xl border border-slate-100 group hover:bg-white hover:border-slate-200 transition-all ${viewMode === 'list' ? "p-4" : "p-6"
                                                    }`}>
                                                    <p className={`font-black text-slate-900 transition-all ${viewMode === 'list' ? "text-2xl" : "text-3xl"}`}>{uploads.length > 0 ? 'Healthy' : '-'}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Vault Status</p>
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

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteModal && fileToDelete && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            onClick={() => !isDeleting && setShowDeleteModal(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8 text-center border border-slate-100"
                        >
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                disabled={isDeleting}
                                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6 relative">
                                <Trash2 className="w-10 h-10 text-red-500" />
                                {isDeleting && (
                                    <div className="absolute inset-0 bg-red-50/80 rounded-3xl flex items-center justify-center">
                                        <RefreshCw className="w-8 h-8 text-red-500 animate-spin" />
                                    </div>
                                )}
                            </div>

                            <h3 className="text-2xl font-black text-slate-900 mb-2">Delete Asset?</h3>
                            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                                Are you sure you want to permanently delete <span className="font-bold text-slate-900">"{fileToDelete.fileName}"</span>? This action cannot be undone.
                            </p>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={confirmDelete}
                                    disabled={isDeleting}
                                    className="w-full py-4 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-all active:scale-95 shadow-lg shadow-red-200 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                                >
                                    {isDeleting ? (
                                        <>
                                            <RefreshCw className="w-5 h-5 animate-spin" />
                                            Deleting...
                                        </>
                                    ) : (
                                        "Delete Forever"
                                    )}
                                </button>
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    disabled={isDeleting}
                                    className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all disabled:opacity-50"
                                >
                                    Keep File
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}

function FileItem({ file, viewMode, formatFileSize, getProviderIcon, getFileIcon, onDelete }: any) {
    const isGrid = viewMode === "grid"

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation()
        const link = document.createElement('a')
        link.href = `/api/uploads/${file.id}/download`
        link.download = file.fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (onDelete) onDelete(file)
    }

    const clientIdentifier = file.clientName || file.clientEmail || "Unknown Client"

    if (isGrid) {
        return (
            <div className="group bg-white rounded-2xl border border-slate-100 p-4 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/40 transition-all">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 group-hover:bg-white transition-colors">
                        {getFileIcon(file.fileName, file.mimeType)}
                    </div>
                    <div className="flex gap-1">
                        <button onClick={handleDownload} className="p-2 text-slate-300 hover:text-slate-900 hover:bg-white rounded-lg transition-all">
                            <Download className="w-4 h-4" />
                        </button>
                        <button onClick={handleDelete} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <h4 className="font-bold text-slate-900 truncate text-sm" title={file.fileName}>{file.fileName}</h4>
                <div className="text-xs text-slate-500 truncate mt-1" title={clientIdentifier}>{clientIdentifier}</div>
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{formatFileSize(file.fileSize)}</span>
                    <span className="w-1 h-1 bg-slate-200 rounded-full" />
                    <div className="flex items-center gap-1">
                        {getProviderIcon(file.storageProvider)}
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full truncate max-w-[100px]">
                        {file.portal.name}
                    </span>
                    <span className="text-[10px] text-slate-300">{new Date(file.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
        )
    }

    return (
        <div className="flex items-center gap-4 p-4 hover:bg-slate-50/50 transition-colors group">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-white border border-transparent group-hover:border-slate-200 transition-all shrink-0">
                {getFileIcon(file.fileName, file.mimeType)}
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-slate-900 truncate" title={file.fileName}>{file.fileName}</h4>
                <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-slate-500">{clientIdentifier}</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full" />
                    <span className="text-xs text-slate-500">{formatFileSize(file.fileSize)}</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full" />
                    <span className="text-xs text-slate-500 flex items-center gap-1.5">
                        <Layout className="w-3 h-3" />
                        {file.portal.name}
                    </span>
                </div>
            </div>
            <div className="hidden md:flex items-center gap-6 px-4">
                <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5 scale-75 origin-right">
                        {getProviderIcon(file.storageProvider)}
                    </div>
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Storage</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-semibold text-slate-600">{new Date(file.createdAt).toLocaleDateString()}</span>
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Added</span>
                </div>
            </div>
            <div className="flex items-center gap-1">
                <button onClick={handleDownload} className="p-2 text-slate-300 hover:text-slate-900 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all">
                    <Download className="w-4 h-4" />
                </button>
                <button onClick={handleDelete} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-200 transition-all">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}
