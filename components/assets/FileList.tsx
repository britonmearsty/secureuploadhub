'use client'

import { useState } from "react"
import { FileItem } from "./FileItem"
import { LayoutGrid, List as ListIcon, Search } from "lucide-react"

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
  showToast?: (type: 'error' | 'success' | 'warning' | 'info', title: string, message: string) => void
  showActions?: boolean
  showPortal?: boolean
  showSearch?: boolean
  showViewToggle?: boolean
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
  showToast,
  showActions = true,
  showPortal = true,
  showSearch = false,
  showViewToggle = false,
  compact = false,
  emptyMessage = "No files found",
  emptyDescription = "There are no files to display.",
  viewMode: externalViewMode,
  showDownloadOnly = false
}: FileListProps) {
  const [internalViewMode, setInternalViewMode] = useState<"grid" | "list">("list")
  const [searchQuery, setSearchQuery] = useState("")

  // Use external viewMode if provided, otherwise use internal state
  const viewMode = externalViewMode || internalViewMode

  const filteredFiles = files.filter(file =>
    file.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (file.clientName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (file.clientEmail?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

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
      {(showSearch || showViewToggle) && (
        <div className="flex items-center justify-between gap-4">
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
              onDelete={onDelete}
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