"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Folder,
  FolderOpen,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  Home,
  Loader2,
  Check,
  X,
  Edit3,
  Trash2,
  MoreHorizontal
} from "lucide-react"

interface StorageFolder {
  id: string
  name: string
  path: string
  subfolders?: StorageFolder[]
  canDelete?: boolean
  canRename?: boolean
}

interface FolderTreeProps {
  folders: StorageFolder[]
  selectedFolderId?: string
  onFolderSelect: (folder: StorageFolder) => void
  onFolderCreate?: (parentId: string, name: string) => Promise<void>
  onFolderRename?: (folderId: string, newName: string) => Promise<void>
  onFolderDelete?: (folderId: string) => Promise<void>
  loading?: boolean
  className?: string
}

interface FolderNodeProps {
  folder: StorageFolder
  level: number
  isSelected: boolean
  expandedFolders: Set<string>
  onToggleExpand: (folderId: string) => void
  onSelect: (folder: StorageFolder) => void
  onCreateChild?: (parentId: string, name: string) => Promise<void>
  onRename?: (folderId: string, newName: string) => Promise<void>
  onDelete?: (folderId: string) => Promise<void>
}

function FolderNode({
  folder,
  level,
  isSelected,
  expandedFolders,
  onToggleExpand,
  onSelect,
  onCreateChild,
  onRename,
  onDelete
}: FolderNodeProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [newName, setNewName] = useState(folder.name)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const actionsRef = useRef<HTMLDivElement>(null)

  const isExpanded = expandedFolders.has(folder.id)
  const hasSubfolders = folder.subfolders && folder.subfolders.length > 0

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isRenaming])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setShowActions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCreateFolder = async () => {
    if (!onCreateChild) return
    
    const folderName = `New Folder ${Date.now()}`
    setLoading(true)
    try {
      await onCreateChild(folder.id, folderName)
      setIsCreating(false)
      if (!isExpanded) {
        onToggleExpand(folder.id)
      }
    } catch (error) {
      console.error('Failed to create folder:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRename = async () => {
    if (!onRename || newName.trim() === folder.name || !newName.trim()) {
      setIsRenaming(false)
      setNewName(folder.name)
      return
    }

    setLoading(true)
    try {
      await onRename(folder.id, newName.trim())
      setIsRenaming(false)
    } catch (error) {
      console.error('Failed to rename folder:', error)
      setNewName(folder.name)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete || !confirm(`Are you sure you want to delete "${folder.name}"?`)) return

    setLoading(true)
    try {
      await onDelete(folder.id)
    } catch (error) {
      console.error('Failed to delete folder:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename()
    } else if (e.key === 'Escape') {
      setIsRenaming(false)
      setNewName(folder.name)
    }
  }

  return (
    <div className="select-none">
      <div
        className={`group flex items-center gap-2 py-2 px-3 rounded-lg transition-all hover:bg-muted/50 ${
          isSelected ? "bg-primary/10 border border-primary/20" : ""
        }`}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
      >
        {/* Expand/Collapse Button */}
        {hasSubfolders ? (
          <button
            type="button"
            onClick={() => onToggleExpand(folder.id)}
            className="p-0.5 hover:bg-muted rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <div className="w-5" />
        )}

        {/* Folder Icon */}
        <div className="flex-shrink-0">
          {level === 0 ? (
            <Home className="w-4 h-4 text-primary" />
          ) : isExpanded ? (
            <FolderOpen className="w-4 h-4 text-amber-500" />
          ) : (
            <Folder className="w-4 h-4 text-amber-500" />
          )}
        </div>

        {/* Folder Name */}
        <div className="flex-1 min-w-0">
          {isRenaming ? (
            <input
              ref={inputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={handleKeyPress}
              className="w-full px-2 py-1 text-sm bg-card border border-border rounded focus:ring-2 focus:ring-ring outline-none"
              disabled={loading}
            />
          ) : (
            <button
              type="button"
              onClick={() => onSelect(folder)}
              className="w-full text-left text-sm font-medium text-foreground hover:text-primary transition-colors truncate"
            >
              {folder.name}
            </button>
          )}
        </div>

        {/* Loading Indicator */}
        {loading && (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        )}

        {/* Actions Menu */}
        <div className="relative" ref={actionsRef}>
          <button
            type="button"
            onClick={() => setShowActions(!showActions)}
            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-muted rounded transition-all"
          >
            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
          </button>

          <AnimatePresence>
            {showActions && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute right-0 top-8 z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[140px]"
              >
                {onCreateChild && (
                  <button
                    type="button"
                    onClick={handleCreateFolder}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    <FolderPlus className="w-4 h-4" />
                    New Folder
                  </button>
                )}
                
                {folder.canRename && onRename && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsRenaming(true)
                      setShowActions(false)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                    Rename
                  </button>
                )}
                
                {folder.canDelete && onDelete && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Subfolders */}
      <AnimatePresence>
        {isExpanded && hasSubfolders && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {folder.subfolders!.map((subfolder) => (
              <FolderNode
                key={subfolder.id}
                folder={subfolder}
                level={level + 1}
                isSelected={isSelected}
                expandedFolders={expandedFolders}
                onToggleExpand={onToggleExpand}
                onSelect={onSelect}
                onCreateChild={onCreateChild}
                onRename={onRename}
                onDelete={onDelete}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FolderTree({
  folders,
  selectedFolderId,
  onFolderSelect,
  onFolderCreate,
  onFolderRename,
  onFolderDelete,
  loading = false,
  className = ""
}: FolderTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  const toggleExpand = (folderId: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId)
    } else {
      newExpanded.add(folderId)
    }
    setExpandedFolders(newExpanded)
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Loading folders...</span>
        </div>
      </div>
    )
  }

  if (!folders.length) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <Folder className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No folders found</p>
      </div>
    )
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {folders.map((folder) => (
        <FolderNode
          key={folder.id}
          folder={folder}
          level={0}
          isSelected={selectedFolderId === folder.id}
          expandedFolders={expandedFolders}
          onToggleExpand={toggleExpand}
          onSelect={onFolderSelect}
          onCreateChild={onFolderCreate}
          onRename={onFolderRename}
          onDelete={onFolderDelete}
        />
      ))}
    </div>
  )
}