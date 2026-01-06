"use client"

import { useState, useMemo, useEffect } from "react"
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
import { ConfirmationModal } from "@/components/ui/ConfirmationModal"
import { StorageWarningModal } from "@/components/ui/StorageWarningModal"
import { ToastComponent } from "@/components/ui/Toast"

interface FileUpload {
    id: string
    fileName: string
    fileSize: number
    mimeType: string
    storageProvider: string
    storagePath: string | null
    storageAccountId?: string | null
    createdAt: string
    clientName: string | null
    clientEmail: string | null
    portal: {
        name: string
        slug: string
        primaryColor: string
    }
    storageAccount?: {
        id: string
        status: string
        provider: string
        displayName: string
        email?: string
    } | null
}

interface AssetsClientProps {
    initialUploads: FileUpload[]
}

export default function AssetsClient({ initialUploads }: AssetsClientProps) {
    const [activeTab, setActiveTab] = useState("all")
    const [searchQuery, setSearchQuery] = useState("")
    const [viewMode, setViewMode] = useState<"grid" | "list">("list")
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
    const [isHealthChecking, setIsHealthChecking] = useState(false)
    
    // Modal states
    const [errorModal, setErrorModal] = useState<{ isOpen: boolean; title: string; message: string }>({
        isOpen: false,
        title: "",
        message: ""
    })
    
    const [storageWarningModal, setStorageWarningModal] = useState<{
        isOpen: boolean;
        type: 'disconnected' | 'inactive' | 'error' | 'not_configured';
        storageProvider?: string;
        storageEmail?: string;
        fileId?: string;
    }>({
        isOpen: false,
        type: 'disconnected'
    })

    // Toast notification state
    const [toast, setToast] = useState<{
        isOpen: boolean;
        type: 'error' | 'success' | 'warning' | 'info';
        title: string;
        message: string;
    }>({
        isOpen: false,
        type: 'error',
        title: '',
        message: ''
    })

    const handleStorageWarning = (warningData: any) => {
        setStorageWarningModal({
            isOpen: true,
            type: warningData.type,
            storageProvider: warningData.storageProvider,
            storageEmail: warningData.storageEmail,
            fileId: warningData.fileId
        })
    }

    const showToast = (type: 'error' | 'success' | 'warning' | 'info', title: string, message: string) => {
        setToast({
            isOpen: true,
            type,
            title,
            message
        })
    }

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
            default: return <Server className="w-5 h-5 text-muted-foreground" />
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

        return <File className={`${iconProps} text-muted-foreground`} />
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
        // Check storage account status before showing delete modal
        if (file.storageAccount) {
            const status = file.storageAccount.status
            if (status === 'DISCONNECTED') {
                showToast('error', 'File Unavailable', `Cannot delete file. Your ${file.storageAccount.provider} storage account is disconnected.`)
                return
            } else if (status === 'ERROR') {
                showToast('error', 'File Unavailable', `Cannot delete file. There are connection issues with your ${file.storageAccount.provider} storage account.`)
                return
            }
        }
        
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
                setErrorModal({
                    isOpen: true,
                    title: "Delete Error",
                    message: "Failed to delete file"
                })
            }
        } catch (error) {
            setErrorModal({
                isOpen: true,
                title: "Delete Error", 
                message: "Error deleting file"
            })
        } finally {
            setIsDeleting(false)
        }
    }

    const handleHealthCheck = async () => {
        setIsHealthChecking(true)
        try {
            const res = await fetch('/api/storage/health-check', {
                method: 'POST',
            })
            
            if (res.ok) {
                const data = await res.json()
                
                // Refresh the page data to show updated storage statuses
                window.location.reload()
                
                showToast('success', 'Storage Health Check Complete', 
                    `Checked ${data.checkedAccounts} storage account(s). Status updated for any disconnected accounts.`)
            } else {
                showToast('error', 'Health Check Failed', 'Failed to check storage account health.')
            }
        } catch (error) {
            showToast('error', 'Health Check Error', 'Error checking storage account health.')
        } finally {
            setIsHealthChecking(false)
        }
    }

    const handleResetStatus = async () => {
        try {
            const res = await fetch('/api/storage/reset-status', {
                method: 'POST',
            })
            
            if (res.ok) {
                const data = await res.json()
                
                // Refresh the page data to show updated storage statuses
                window.location.reload()
                
                showToast('success', 'Storage Status Reset', data.message)
            } else {
                showToast('error', 'Reset Failed', 'Failed to reset storage account status.')
            }
        } catch (error) {
            showToast('error', 'Reset Error', 'Error resetting storage account status.')
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
                <h1 className="text-4xl font-black text-foreground tracking-tight">Assets</h1>
                <p className="text-muted-foreground mt-2 text-lg max-w-2xl leading-relaxed">
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
                                        ? "bg-card shadow-sm border border-border text-foreground"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        }`}
                                >
                                    <Icon className={`w-5 h-5 ${isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`} />
                                    <span className="font-medium text-sm">{tab.name}</span>
                                    {isActive && (
                                        <motion.div layoutId="assets-active-indicator" className="ml-auto">
                                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                        </motion.div>
                                    )}
                                </button>
                            )
                        })}
                    </nav>

                    <div className="mt-8 p-6 bg-muted border border-border rounded-3xl">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Storage Pulse</h4>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-xs mb-1.5">
                                    <span className="text-muted-foreground font-medium">Total Volume</span>
                                    <span className="text-foreground font-bold">{stats.totalSizeMB} MB</span>
                                </div>
                                <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: "45%" }}
                                        className="h-full bg-foreground"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-between items-center bg-card p-3 rounded-xl border border-border">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400" />
                                    <span className="text-xs text-muted-foreground">Dropbox</span>
                                </div>
                                <span className="text-xs font-bold text-foreground">{stats.byProvider['dropbox'] || 0}</span>
                            </div>
                            <div className="flex justify-between items-center bg-card p-3 rounded-xl border border-border">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                                    <span className="text-xs text-muted-foreground">Google Drive</span>
                                </div>
                                <span className="text-xs font-bold text-foreground">{stats.byProvider['google_drive'] || 0}</span>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Content Area */}
                <main className="flex-1 min-w-0">
                    <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search assets..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-2xl focus:ring-2 focus:ring-ring transition-all outline-none text-sm text-foreground"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleResetStatus}
                                className="flex items-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm font-medium"
                                title="Reset disconnected storage accounts to active"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Reset Status
                            </button>
                            <button
                                onClick={handleHealthCheck}
                                disabled={isHealthChecking}
                                className="flex items-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white rounded-lg transition-colors text-sm font-medium"
                                title="Check storage account connectivity"
                            >
                                <RefreshCw className={`w-4 h-4 ${isHealthChecking ? 'animate-spin' : ''}`} />
                                {isHealthChecking ? 'Checking...' : 'Health Check'}
                            </button>
                            <div className="flex items-center gap-2 p-1 bg-muted border border-border rounded-xl w-fit">
                                <button
                                    onClick={() => setViewMode("grid")}
                                    className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode("list")}
                                    className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                                >
                                    <ListIcon className="w-4 h-4" />
                                </button>
                            </div>
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
                            <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-border bg-muted/30">
                                    <h2 className="text-xl font-bold text-foreground">
                                        {tabs.find(t => t.id === activeTab)?.name}
                                    </h2>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {tabs.find(t => t.id === activeTab)?.description}
                                    </p>
                                </div>

                                <div className="p-0">
                                    {activeTab === "all" && (
                                        <div className={viewMode === "list" ? "divide-y divide-border" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6"}>
                                            {filteredUploads.length > 0 ? (
                                                filteredUploads.map((file) => (
                                                    <FileItem key={file.id} file={file} viewMode={viewMode} formatFileSize={formatFileSize} getProviderIcon={getProviderIcon} getFileIcon={getFileIcon} onDelete={handleDeleteRequest} onStorageWarning={handleStorageWarning} showToast={showToast} />
                                                ))
                                            ) : (
                                                <div className="text-center py-24 px-6 col-span-full">
                                                    <div className="p-4 bg-muted rounded-full w-fit mx-auto mb-4">
                                                        <Inbox className="w-8 h-8 text-muted-foreground" />
                                                    </div>
                                                    <h4 className="text-foreground font-bold mb-1 text-lg">No Assets Found</h4>
                                                    <p className="text-muted-foreground text-sm max-w-xs mx-auto">
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
                                                    <div key={provider} className="bg-muted rounded-3xl border border-border overflow-hidden">
                                                        <div className="p-4 bg-card border-b border-border flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 bg-muted rounded-xl">
                                                                    {getProviderIcon(provider)}
                                                                </div>
                                                                <h3 className="font-bold text-foreground capitalize">{provider.replace('_', ' ')}</h3>
                                                            </div>
                                                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{providerFiles.length} items</span>
                                                        </div>
                                                        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4" : "divide-y divide-border/50"}>
                                                            {providerFiles.map(file => (
                                                                <FileItem key={file.id} file={file} viewMode={viewMode} formatFileSize={formatFileSize} getProviderIcon={getProviderIcon} getFileIcon={getFileIcon} onDelete={handleDeleteRequest} onStorageWarning={handleStorageWarning} showToast={showToast} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}

                                    {activeTab === "stats" && (
                                        <div className={`transition-all duration-300 ${viewMode === 'list' ? "p-8" : "p-12"} text-center`}>
                                            <div className={`mx-auto transition-all duration-300 bg-muted rounded-full border border-border relative flex items-center justify-center ${viewMode === 'list' ? "w-20 h-20 mb-6" : "w-32 h-32 mb-8"
                                                }`}>
                                                <PieChart className={`text-muted-foreground transition-all ${viewMode === 'list' ? "w-10 h-10" : "w-16 h-16"}`} />
                                                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card rounded-full flex items-center justify-center shadow-sm transition-all ${viewMode === 'list' ? "w-7 h-7" : "w-10 h-10"
                                                    }`}>
                                                    <TrendingUp className={`text-foreground ${viewMode === 'list' ? "w-3.5 h-3.5" : "w-5 h-5"}`} />
                                                </div>
                                            </div>

                                            <div className={viewMode === 'list' ? "flex flex-col items-center" : ""}>
                                                <h3 className={`font-black text-foreground mb-2 transition-all ${viewMode === 'list' ? "text-xl" : "text-2xl"}`}>Storage Intelligence</h3>
                                                <p className={`text-muted-foreground text-sm max-w-md mx-auto leading-relaxed transition-all ${viewMode === 'list' ? "mb-8" : "mb-10"}`}>
                                                    Monitor how your storage is distributed across your connected cloud ecosystems.
                                                </p>
                                            </div>

                                            <div className={`grid gap-4 mx-auto transition-all ${viewMode === 'list'
                                                ? "grid-cols-2 md:grid-cols-4 max-w-4xl"
                                                : "grid-cols-2 md:grid-cols-4 max-w-3xl"
                                                }`}>
                                                <div className={`bg-muted rounded-3xl border border-border group hover:bg-card hover:border-border transition-all ${viewMode === 'list' ? "p-4" : "p-6"
                                                    }`}>
                                                    <p className={`font-black text-foreground transition-all ${viewMode === 'list' ? "text-2xl" : "text-3xl"}`}>{stats.totalFiles}</p>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1.5">Files Collected</p>
                                                </div>
                                                <div className={`bg-muted rounded-3xl border border-border group hover:bg-card hover:border-border transition-all ${viewMode === 'list' ? "p-4" : "p-6"
                                                    }`}>
                                                    <p className={`font-black text-foreground transition-all ${viewMode === 'list' ? "text-2xl" : "text-3xl"}`}>{Math.round(parseFloat(stats.totalSizeMB))}</p>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1.5">MB Utilized</p>
                                                </div>
                                                <div className={`bg-muted rounded-3xl border border-border group hover:bg-card hover:border-border transition-all ${viewMode === 'list' ? "p-4" : "p-6"
                                                    }`}>
                                                    <p className={`font-black text-foreground transition-all ${viewMode === 'list' ? "text-2xl" : "text-3xl"}`}>{Object.keys(stats.byProvider).length}</p>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1.5">Providers</p>
                                                </div>
                                                <div className={`bg-muted rounded-3xl border border-border group hover:bg-card hover:border-border transition-all ${viewMode === 'list' ? "p-4" : "p-6"
                                                    }`}>
                                                    <p className={`font-black text-foreground transition-all ${viewMode === 'list' ? "text-2xl" : "text-3xl"}`}>{uploads.length > 0 ? 'Healthy' : '-'}</p>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1.5">Vault Status</p>
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
                            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
                            onClick={() => !isDeleting && setShowDeleteModal(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-sm bg-card rounded-[2.5rem] shadow-2xl overflow-hidden p-8 text-center border border-border"
                        >
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                disabled={isDeleting}
                                className="absolute top-6 right-6 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="w-20 h-20 bg-red-50 dark:bg-red-950/30 rounded-3xl flex items-center justify-center mx-auto mb-6 relative">
                                <Trash2 className="w-10 h-10 text-red-500 dark:text-red-400" />
                                {isDeleting && (
                                    <div className="absolute inset-0 bg-red-50/80 dark:bg-red-950/50 rounded-3xl flex items-center justify-center">
                                        <RefreshCw className="w-8 h-8 text-red-500 dark:text-red-400 animate-spin" />
                                    </div>
                                )}
                            </div>

                            <h3 className="text-2xl font-black text-foreground mb-2">Delete Asset?</h3>
                            <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
                                Are you sure you want to permanently delete <span className="font-bold text-foreground">"{fileToDelete.fileName}"</span>? This action cannot be undone.
                            </p>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={confirmDelete}
                                    disabled={isDeleting}
                                    className="w-full py-4 bg-red-500 dark:bg-red-600 text-white rounded-2xl font-bold hover:bg-red-600 dark:hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-200 dark:shadow-red-900/20 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
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
                                    className="w-full py-4 bg-muted text-muted-foreground rounded-2xl font-bold hover:bg-secondary transition-all disabled:opacity-50"
                                >
                                    Keep File
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Error Modal */}
            <ConfirmationModal
                isOpen={errorModal.isOpen}
                onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
                onConfirm={() => setErrorModal({ ...errorModal, isOpen: false })}
                title={errorModal.title}
                message={errorModal.message}
                confirmText="OK"
                variant="danger"
            />

            {/* Storage Warning Modal */}
            <StorageWarningModal
                isOpen={storageWarningModal.isOpen}
                onClose={() => setStorageWarningModal({ ...storageWarningModal, isOpen: false })}
                type={storageWarningModal.type}
                storageProvider={storageWarningModal.storageProvider}
                storageEmail={storageWarningModal.storageEmail}
                onSettings={() => {
                    setStorageWarningModal({ ...storageWarningModal, isOpen: false })
                    // Navigate to settings - you can implement this
                    window.location.href = '/dashboard/settings'
                }}
                onReconnect={() => {
                    setStorageWarningModal({ ...storageWarningModal, isOpen: false })
                    // Navigate to integrations - you can implement this
                    window.location.href = '/dashboard/integrations'
                }}
            />

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

function FileItem({ file, viewMode, formatFileSize, getProviderIcon, getFileIcon, onDelete, onStorageWarning, showToast }: any) {
    const isGrid = viewMode === "grid"

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation()
        
        // Check storage account status before download
        if (file.storageAccount) {
            const status = file.storageAccount.status
            if (status === 'DISCONNECTED') {
                showToast?.('error', 'File Unavailable', `Cannot download file. Your ${file.storageAccount.provider} storage account is disconnected.`)
                return
            } else if (status === 'ERROR') {
                showToast?.('error', 'File Unavailable', `Cannot download file. There are connection issues with your ${file.storageAccount.provider} storage account.`)
                return
            }
        }
        
        const link = document.createElement('a')
        link.href = `/api/uploads/${file.id}/download`
        link.download = file.fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation()
        
        // Check storage account status before delete
        if (file.storageAccount) {
            const status = file.storageAccount.status
            if (status === 'DISCONNECTED') {
                showToast?.('error', 'File Unavailable', `Cannot delete file. Your ${file.storageAccount.provider} storage account is disconnected.`)
                return
            } else if (status === 'ERROR') {
                showToast?.('error', 'File Unavailable', `Cannot delete file. There are connection issues with your ${file.storageAccount.provider} storage account.`)
                return
            }
        }
        
        if (onDelete) onDelete(file)
    }

    const getStorageStatusIndicator = () => {
        if (!file.storageAccount) {
            return (
                <div className="flex items-center gap-1" title="Legacy file - no storage account binding">
                    <div className="w-2 h-2 bg-gray-400 rounded-full" />
                    <span className="text-xs text-gray-500">Legacy</span>
                </div>
            )
        }

        const status = file.storageAccount.status
        switch (status) {
            case 'ACTIVE':
                return (
                    <div className="flex items-center gap-1" title="Storage account connected">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-xs text-green-600">Connected</span>
                    </div>
                )
            case 'INACTIVE':
                return (
                    <div className="flex items-center gap-1" title="Storage account inactive">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                        <span className="text-xs text-yellow-600">Inactive</span>
                    </div>
                )
            case 'DISCONNECTED':
                return (
                    <div className="flex items-center gap-1" title="Storage account disconnected - file unavailable">
                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                        <span className="text-xs text-red-600">Unavailable</span>
                    </div>
                )
            case 'ERROR':
                return (
                    <div className="flex items-center gap-1" title="Storage account has connection errors - file unavailable">
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                        <span className="text-xs text-orange-600">Unavailable</span>
                    </div>
                )
            default:
                return (
                    <div className="flex items-center gap-1" title="Unknown storage status">
                        <div className="w-2 h-2 bg-gray-500 rounded-full" />
                        <span className="text-xs text-gray-600">Unknown</span>
                    </div>
                )
        }
    }

    const clientIdentifier = file.clientName || file.clientEmail || "Unknown Client"

    if (isGrid) {
        return (
            <div className="group bg-card rounded-2xl border border-border p-4 hover:border-muted-foreground hover:shadow-xl hover:shadow-muted/40 transition-all">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-muted rounded-xl border border-border group-hover:bg-card transition-colors">
                        {getFileIcon(file.fileName, file.mimeType)}
                    </div>
                    <div className="flex gap-1">
                        <button onClick={handleDownload} className="p-2 text-muted-foreground hover:text-foreground hover:bg-card rounded-lg transition-all">
                            <Download className="w-4 h-4" />
                        </button>
                        <button onClick={handleDelete} className="p-2 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <h4 className="font-bold text-foreground truncate text-sm" title={file.fileName}>{file.fileName}</h4>
                <div className="text-xs text-muted-foreground truncate mt-1" title={clientIdentifier}>{clientIdentifier}</div>
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{formatFileSize(file.fileSize)}</span>
                    <span className="w-1 h-1 bg-border rounded-full" />
                    <div className="flex items-center gap-1">
                        {getProviderIcon(file.storageProvider)}
                    </div>
                    <span className="w-1 h-1 bg-border rounded-full" />
                    {getStorageStatusIndicator()}
                </div>
                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-muted text-muted-foreground rounded-full truncate max-w-[100px]">
                        {file.portal.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{new Date(file.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
        )
    }

    return (
        <div className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors group">
            <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center text-muted-foreground group-hover:bg-card border border-transparent group-hover:border-border transition-all shrink-0">
                {getFileIcon(file.fileName, file.mimeType)}
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-foreground truncate" title={file.fileName}>{file.fileName}</h4>
                <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted-foreground">{clientIdentifier}</span>
                    <span className="w-1 h-1 bg-border rounded-full" />
                    <span className="text-xs text-muted-foreground">{formatFileSize(file.fileSize)}</span>
                    <span className="w-1 h-1 bg-border rounded-full" />
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
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
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Storage</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                    {getStorageStatusIndicator()}
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-semibold text-muted-foreground">{new Date(file.createdAt).toLocaleDateString()}</span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Added</span>
                </div>
            </div>
            <div className="flex items-center gap-1">
                <button onClick={handleDownload} className="p-2 text-muted-foreground hover:text-foreground hover:bg-card rounded-xl border border-transparent hover:border-border transition-all">
                    <Download className="w-4 h-4" />
                </button>
                <button onClick={handleDelete} className="p-2 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl border border-transparent hover:border-red-200 dark:hover:border-red-800 transition-all">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}
