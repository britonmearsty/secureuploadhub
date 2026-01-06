"use client"

import { useState } from "react"
import { Info, AlertTriangle, FileType, HardDrive } from "lucide-react"

interface FileConstraintsProps {
  maxFileSize: number // in MB
  allowedFileTypes: string[]
  onMaxFileSizeChange: (size: number) => void
  onAllowedFileTypesChange: (types: string[]) => void
  className?: string
}

const FILE_TYPE_PRESETS = [
  { id: "images", label: "Images", types: ["image/*"], icon: "🖼️" },
  { id: "documents", label: "Documents", types: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"], icon: "📄" },
  { id: "spreadsheets", label: "Spreadsheets", types: ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv"], icon: "📊" },
  { id: "presentations", label: "Presentations", types: ["application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation"], icon: "📽️" },
  { id: "archives", label: "Archives", types: ["application/zip", "application/x-rar-compressed", "application/x-7z-compressed"], icon: "🗜️" },
  { id: "videos", label: "Videos", types: ["video/*"], icon: "🎥" },
  { id: "audio", label: "Audio", types: ["audio/*"], icon: "🎵" },
  { id: "code", label: "Code Files", types: ["text/javascript", "text/typescript", "text/css", "text/html", "application/json", "text/x-python", "text/x-java-source", "text/x-c", "text/x-c++", "text/x-csharp", "text/x-php", "text/x-ruby", "text/x-go", "text/x-rust"], icon: "💻" },
  { id: "text", label: "Text & Markdown", types: ["text/plain", "text/markdown", "text/xml", "text/yaml", "text/x-yaml"], icon: "📝" },
  { id: "config", label: "Config Files", types: ["application/toml", "text/x-ini", "text/x-properties", "text/x-dockerfile"], icon: "⚙️" }
]

const FILE_SIZE_PRESETS = [
  { value: 10, label: "10 MB", description: "Small files only" },
  { value: 50, label: "50 MB", description: "Standard documents" },
  { value: 100, label: "100 MB", description: "Large documents" },
  { value: 500, label: "500 MB", description: "Media files" },
  { value: 1000, label: "1 GB", description: "Large media" },
  { value: 2000, label: "2 GB", description: "Very large files" },
  { value: 5000, label: "5 GB", description: "Maximum allowed" }
]

export default function FileConstraints({
  maxFileSize,
  allowedFileTypes,
  onMaxFileSizeChange,
  onAllowedFileTypesChange,
  className = ""
}: FileConstraintsProps) {
  const [customFileSize, setCustomFileSize] = useState(maxFileSize.toString())
  const [showCustomTypes, setShowCustomTypes] = useState(false)
  const [customType, setCustomType] = useState("")

  const handleFileSizeChange = (size: number) => {
    onMaxFileSizeChange(size)
    setCustomFileSize(size.toString())
  }

  const handleCustomFileSizeChange = (value: string) => {
    setCustomFileSize(value)
    const numValue = parseInt(value)
    if (!isNaN(numValue) && numValue > 0 && numValue <= 5000) {
      onMaxFileSizeChange(numValue)
    }
  }

  const toggleFileType = (preset: typeof FILE_TYPE_PRESETS[0]) => {
    const isSelected = preset.types.some(type => allowedFileTypes.includes(type))
    
    if (isSelected) {
      // Remove all types from this preset
      const newTypes = allowedFileTypes.filter(type => !preset.types.includes(type))
      onAllowedFileTypesChange(newTypes)
    } else {
      // Add all types from this preset
      const newTypes = [...new Set([...allowedFileTypes, ...preset.types])]
      onAllowedFileTypesChange(newTypes)
    }
  }

  const addCustomType = () => {
    if (customType.trim() && !allowedFileTypes.includes(customType.trim())) {
      onAllowedFileTypesChange([...allowedFileTypes, customType.trim()])
      setCustomType("")
    }
  }

  const removeCustomType = (type: string) => {
    onAllowedFileTypesChange(allowedFileTypes.filter(t => t !== type))
  }

  const formatFileSize = (sizeInMB: number) => {
    if (sizeInMB >= 1000) {
      return `${(sizeInMB / 1000).toFixed(1)} GB`
    }
    return `${sizeInMB} MB`
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* File Size Limits */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">File Size Limit</h3>
        </div>

        {/* Size Presets */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {FILE_SIZE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => handleFileSizeChange(preset.value)}
              className={`p-3 rounded-xl border-2 transition-all text-left ${
                maxFileSize === preset.value
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:border-muted-foreground hover:bg-muted/50"
              }`}
            >
              <div className="font-semibold text-sm">{preset.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{preset.description}</div>
            </button>
          ))}
        </div>

        {/* Custom Size Input */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-foreground">Custom size:</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="5000"
              value={customFileSize}
              onChange={(e) => handleCustomFileSizeChange(e.target.value)}
              className="w-20 px-3 py-2 bg-card border border-border rounded-lg focus:ring-2 focus:ring-ring outline-none text-sm"
            />
            <span className="text-sm text-muted-foreground">MB</span>
          </div>
        </div>

        {/* Size Warning */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="text-amber-800 font-medium">Current limit: {formatFileSize(maxFileSize)}</p>
            <p className="text-amber-700 mt-1">Files larger than this will be rejected during upload.</p>
          </div>
        </div>
      </div>

      {/* File Type Restrictions */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FileType className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Allowed File Types</h3>
        </div>

        {/* Type Presets */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {FILE_TYPE_PRESETS.map((preset) => {
            const isSelected = preset.types.some(type => allowedFileTypes.includes(type))
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => toggleFileType(preset)}
                className={`p-3 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:border-muted-foreground hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{preset.icon}</span>
                  <span className="font-semibold text-sm">{preset.label}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {preset.types.length} type{preset.types.length > 1 ? 's' : ''}
                </div>
              </button>
            )
          })}
        </div>

        {/* Custom Types */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowCustomTypes(!showCustomTypes)}
            className="text-sm text-primary hover:text-primary/80 font-medium"
          >
            {showCustomTypes ? "Hide" : "Add"} custom file types
          </button>

          {showCustomTypes && (
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  placeholder="e.g., application/pdf or image/*"
                  className="flex-1 px-3 py-2 bg-card border border-border rounded-lg focus:ring-2 focus:ring-ring outline-none text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && addCustomType()}
                />
                <button
                  type="button"
                  onClick={addCustomType}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                >
                  Add
                </button>
              </div>

              {/* Custom Types List */}
              {allowedFileTypes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Current allowed types:</p>
                  <div className="flex flex-wrap gap-2">
                    {allowedFileTypes.map((type) => (
                      <span
                        key={type}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-card border border-border rounded-md text-xs"
                      >
                        {type}
                        <button
                          type="button"
                          onClick={() => removeCustomType(type)}
                          className="text-muted-foreground hover:text-destructive ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Type Info */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="text-blue-800 font-medium">
              {allowedFileTypes.length === 0 
                ? "All file types allowed" 
                : `${allowedFileTypes.length} file type${allowedFileTypes.length > 1 ? 's' : ''} allowed`}
            </p>
            <p className="text-blue-700 mt-1">
              {allowedFileTypes.length === 0 
                ? "Users can upload any file type. Consider adding restrictions for security."
                : "Only files matching these types will be accepted during upload."}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}