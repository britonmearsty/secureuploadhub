"use client"

import { useState, useRef } from "react"
import { Camera, Upload, Loader2, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface ImageUploadProps {
  currentImage?: string | null
  onImageChange: (url: string) => void
  type: 'profile' | 'logo'
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function ImageUpload({ 
  currentImage, 
  onImageChange, 
  type, 
  className = "",
  size = 'md'
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24', 
    lg: 'w-32 h-32'
  }

  const handleFileSelect = async (file: File) => {
    if (!file) return

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      onImageChange(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  const removeImage = () => {
    onImageChange('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className={`relative ${className}`}>
      <div
        className={`
          ${sizeClasses[size]} rounded-2xl border-2 border-dashed 
          ${dragActive ? 'border-primary bg-primary/5' : 'border-border'}
          ${currentImage ? 'border-solid' : ''}
          bg-muted hover:bg-muted/80 transition-all cursor-pointer 
          flex items-center justify-center overflow-hidden group
          ${isUploading ? 'pointer-events-none' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <AnimatePresence mode="wait">
          {isUploading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center"
            >
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </motion.div>
          ) : currentImage ? (
            <motion.div
              key="image"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative w-full h-full"
            >
              <img 
                src={currentImage} 
                alt={type === 'profile' ? 'Profile' : 'Logo'} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center text-muted-foreground"
            >
              <Upload className="w-6 h-6 mb-1" />
              <span className="text-xs text-center">
                {type === 'profile' ? 'Profile' : 'Logo'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Remove button */}
        {currentImage && !isUploading && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              removeImage()
            }}
            className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full shadow-md hover:bg-destructive/90 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={type === 'logo' ? 'image/*,.svg' : 'image/*'}
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Error message */}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-destructive mt-2"
        >
          {error}
        </motion.p>
      )}

      {/* Help text */}
      <p className="text-xs text-muted-foreground mt-2">
        {type === 'profile' 
          ? 'PNG, JPG or WebP up to 10MB. Recommended: 400x400px'
          : 'PNG, JPG, WebP or SVG up to 10MB. Recommended: 800x400px'
        }
      </p>
    </div>
  )
}