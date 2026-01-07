'use client'

import { useState } from "react"
import { FileItem } from "./FileItem"
import { LayoutGrid, List as ListIcon, Search, RefreshCw } from "lucide-react"

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

interface FileListProps {
  files: FileUpload[]
  onDelete?: (file: FileUpload) => void
  onDownload?: (file: FileUpload) => void
  onFilesUpdate?: (files: FileUpload[]) => void
  showToast?: (type: 'error' | 'success' | 'warning' | 'info', title: string, message: string) => void
  showActions?: boolean
  showPortal?: boolean
  showSearch?: boolean
  showViewToggle?: boolean
  showAutoSync?: boolean
  compact?: boolean
  emptyMessage?: string
  emptyDescription?: string
  viewMode?: "grid" | "list"
  showDownloadOnly?: boolean
}

export function FileList({
  files,
  onDelete,
  onDownload,
  onFilesUpdate,
  showToast,
  showActions = true,
  showPortal = true,
  showSearch = false,
  showViewToggle = false,
  showAutoSync = false,
  compact = false,
  emptyMessage = "No files found",
  emptyDescription = "There are no files to display.",
  viewMode: externalViewMode,
  showDownloadOnly = false
}: FileListProps) {
  const [internalViewMode, setInternalViewMode] = useState<"grid" | "list">("list")
  const [searchQuery, setSearchQuery] = useState("")
  const [autoSyncStatus, setAutoSyncStatus] = useState<Record<string, boolean>>({})

  // Use external viewMode if provided, otherwise use internal state
  const viewMode = externalViewMode || internalViewMode

  const filteredFiles = files.filter(file =>
    file.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (file.clientName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (file.clientEmail?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Enhanced delete handler that updates the file list
  const handleDelete = async (file: FileUpload) => {
    if (onDelete) {
      onDelete(file)
    }
    
    // If we have an update handler, remove the file from the list
    if (onFilesUpdate) {
      const updatedFiles = files.filter(f => f.id !== file.id)
      onFilesUpdate(updatedFiles)
    }
  }

  // Auto-sync function for storage providers
  const runAutoSync = async (provider: "google_drive" | "dropbox") => {
    setAutoSyncStatus(prev => ({ ...prev, [provider]: true }))
    
    try {
      const response = await fetch('/api/storage/auto-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider })
      })

      const result = await response.json()
      
      if (result.success && result.deletedFiles > 0) {
        // Update the files list by removing deleted files
        if (onFilesUpdate) {
          const updatedFiles = files.filter(file => 
            file.storageProvider !== provider || 
            !result.orphanedFileIds?.includes(file.id)
          )
          onFilesUpdate(updatedFiles)
        }
        
        showToast?.('success', 'Auto-Sync Complete', 
          `Removed ${result.deletedFiles} files that were deleted from ${provider.replace('_', ' ')}`
        )
      } else if (result.success) {
        showToast?.('info', 'Auto-Sync Complete', 
          `All ${provider.replace('_', ' ')} files are in sync`
        )
      } else {
        showToast?.('error', 'Auto-Sync Failed', result.error || 'Unknown error')
      }
    } catch (error) {
      showToast?.('error', 'Auto-Sync Failed', 'Network error occurred')
    } finally {
      setAutoSyncStatus(prev => ({ ...prev, [provider]: false }))
    }
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-12 px-6">
        <div className="p-4 bg-muted rounded-full w-fit mx-auto mb-4">
          <ListIcon className="w-8 h-8 text-muted-foreground" />
        </div>
        <h4 className="text-foreground font-semibold mb-1">{emptyMessage}</h4>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          {emptyDescription}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {(showSearch || showViewToggle || showAutoSync) && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {showSearch && (
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-xl focus:ring-2 focus:ring-ring transition-all outline-none text-sm text-foreground"
              />
            </div>
          )}
          
          <div className="flex items-center gap-3">
            {/* Auto-sync buttons */}
            {showAutoSync && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => runAutoSync("google_drive")}
                  disabled={autoSyncStatus.google_drive}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                  title="Sync Google Drive files (remove files deleted from Drive)"
                >
                  {autoSyncStatus.google_drive ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <div className="w-4 h-4 bg-white rounded-sm"></div>
                  )}
                  Sync Drive
                </button>
                
                <button
                  onClick={() => runAutoSync("dropbox")}
                  disabled={autoSyncStatus.dropbox}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                  title="Sync Dropbox files (remove files deleted from Dropbox)"
                >
                  {autoSyncStatus.dropbox ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <div className="w-4 h-4 bg-white rounded-sm"></div>
                  )}
                  Sync Dropbox
                </button>
              </div>
            )}
            
            {showViewToggle && (
              <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
                <button
                  onClick={() => setInternalViewMode("list")}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === "list"
                      ? "bg-card shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ListIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setInternalViewMode("grid")}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === "grid"
                      ? "bg-card shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {filteredFiles.length === 0 ? (
        <div className="text-center py-8 px-6">
          <h4 className="text-foreground font-semibold mb-1">No matching files</h4>
          <p className="text-muted-foreground text-sm">
            Try adjusting your search terms.
          </p>
        </div>
      ) : (
        <div className={viewMode === "grid" ? `grid gap-4 ${compact ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}` : "divide-y divide-border"}>
          {filteredFiles.map((file) => (
            <FileItem
              key={file.id}
              file={file}
              viewMode={viewMode}
              onDelete={handleDelete}
              onDownload={onDownload}
              showToast={showToast}
              showActions={showActions}
              showPortal={showPortal}
              compact={compact}
              showDownloadOnly={showDownloadOnly}
            />
          ))}
        </div>
      )}
    </div>
  )
}