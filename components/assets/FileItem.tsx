'use client'

import { useState } from "react"
import { Download, Trash2, Layout, X } from "lucide-react"
import { getFileIcon, getProviderIcon, formatFileSize } from "../../lib/file-utils"
import { getStorageStatusIndicator } from "../../lib/storage-utils"

interface FileUpload {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  clientName: string | null
  clientEmail: string | null
  storageProvider: string
  storagePath: string | null
  storageAccountId?: string | null
  createdAt: string
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

interface FileItemProps {
  file: FileUpload
  viewMode: "grid" | "list"
  onDelete?: (file: FileUpload) => void
  onDownload?: (file: FileUpload) => void
  showToast?: (type: 'error' | 'success' | 'warning' | 'info', title: string, message: string) => void
  showActions?: boolean
  showPortal?: boolean
  compact?: boolean
  showDownloadOnly?: boolean
  // New prop to control whether FileItem should show its own confirmation modal
  showDeleteConfirmation?: boolean
}

export function FileItem({ 
  file, 
  viewMode, 
  onDelete, 
  onDownload,
  showToast,
  showActions = true,
  showPortal = true,
  compact = false,
  showDownloadOnly = false,
  showDeleteConfirmation = true // Default to true for backward compatibility
}: FileItemProps) {
  const isGrid = viewMode === "grid"
  const [showDeleteModal, setShowDeleteModal] = useState(false)

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
    
    if (onDownload) {
      onDownload(file)
    } else {
      const link = document.createElement('a')
      link.href = `/api/uploads/${file.id}/download`
      link.download = file.fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
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
    
    // If showDeleteConfirmation is false, call onDelete directly (for parent-managed confirmation)
    // If showDeleteConfirmation is true, show our own modal (for backward compatibility)
    if (!showDeleteConfirmation) {
      if (onDelete) onDelete(file)
    } else {
      setShowDeleteModal(true)
    }
  }

  const confirmDelete = () => {
    setShowDeleteModal(false)
    if (onDelete) onDelete(file)
  }

  const clientIdentifier = file.clientName || file.clientEmail || "Unknown Client"

  if (isGrid) {
    return (
      <>
        <div className={`group bg-card rounded-2xl border border-border hover:border-muted-foreground hover:shadow-xl hover:shadow-muted/40 transition-all ${compact ? 'p-3' : 'p-4'}`}>
          <div className="flex justify-between items-start mb-4">
            <div className={`bg-muted rounded-xl border border-border group-hover:bg-card transition-colors ${compact ? 'p-2' : 'p-3'}`}>
              {getFileIcon(file.fileName, file.mimeType)}
            </div>
            {(showActions || showDownloadOnly) && (
              <div className="flex gap-1">
                <button onClick={handleDownload} className="p-2 text-muted-foreground hover:text-foreground hover:bg-card rounded-lg transition-all">
                  <Download className="w-4 h-4" />
                </button>
                {showActions && onDelete && (
                  <button onClick={handleDelete} className="p-2 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
          <h4 className={`font-bold text-foreground truncate ${compact ? 'text-xs' : 'text-sm'}`} title={file.fileName}>
            {file.fileName}
          </h4>
          <div className={`text-muted-foreground truncate mt-1 ${compact ? 'text-[10px]' : 'text-xs'}`} title={clientIdentifier}>
            {clientIdentifier}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">{formatFileSize(file.fileSize)}</span>
            <span className="w-1 h-1 bg-border rounded-full" />
            <div className="flex items-center gap-1">
              {getProviderIcon(file.storageProvider)}
            </div>
            <span className="w-1 h-1 bg-border rounded-full" />
            {getStorageStatusIndicator(file.storageAccount)}
          </div>
          {showPortal && (
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
              <span className="text-[10px] font-bold px-2 py-0.5 bg-muted text-muted-foreground rounded-full truncate max-w-[100px]">
                {file.portal.name}
              </span>
              <span className="text-[10px] text-muted-foreground">{new Date(file.createdAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal - only show if showDeleteConfirmation is true */}
        {showDeleteConfirmation && showDeleteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setShowDeleteModal(false)}
            />
            <div className="relative w-full max-w-sm bg-card rounded-3xl shadow-2xl overflow-hidden p-8 text-center border border-border">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8 text-destructive" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Delete File?</h3>
              <p className="text-muted-foreground text-sm mb-8">
                Are you sure you want to delete <span className="font-bold text-foreground">"{file.fileName}"</span>?
                This action cannot be undone.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={confirmDelete}
                  className="w-full py-3 bg-destructive text-destructive-foreground rounded-2xl font-bold hover:bg-destructive/90 transition-all active:scale-95 shadow-lg shadow-destructive/20"
                >
                  Delete Forever
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="w-full py-3 bg-muted text-muted-foreground rounded-2xl font-bold hover:bg-muted/80 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <>
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
            {showPortal && (
              <>
                <span className="w-1 h-1 bg-border rounded-full" />
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Layout className="w-3 h-3" />
                  {file.portal.name}
                </span>
              </>
            )}
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
            {getStorageStatusIndicator(file.storageAccount)}
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs font-semibold text-muted-foreground">{new Date(file.createdAt).toLocaleDateString()}</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Added</span>
          </div>
        </div>
        {(showActions || showDownloadOnly) && (
          <div className="flex items-center gap-1">
            <button onClick={handleDownload} className="p-2 text-muted-foreground hover:text-foreground hover:bg-card rounded-xl border border-transparent hover:border-border transition-all">
              <Download className="w-4 h-4" />
            </button>
            {showActions && onDelete && (
              <button onClick={handleDelete} className="p-2 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl border border-transparent hover:border-red-200 dark:hover:border-red-800 transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal - only show if showDeleteConfirmation is true */}
      {showDeleteConfirmation && showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowDeleteModal(false)}
          />
          <div className="relative w-full max-w-sm bg-card rounded-3xl shadow-2xl overflow-hidden p-8 text-center border border-border">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Delete File?</h3>
            <p className="text-muted-foreground text-sm mb-8">
              Are you sure you want to delete <span className="font-bold text-foreground">"{file.fileName}"</span>?
              This action cannot be undone.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={confirmDelete}
                className="w-full py-3 bg-destructive text-destructive-foreground rounded-2xl font-bold hover:bg-destructive/90 transition-all active:scale-95 shadow-lg shadow-destructive/20"
              >
                Delete Forever
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="w-full py-3 bg-muted text-muted-foreground rounded-2xl font-bold hover:bg-muted/80 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}