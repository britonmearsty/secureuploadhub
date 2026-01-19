"use client"

import { useState } from "react"
import { updateSettings } from "../actions"
import { Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react"
import { motion } from "framer-motion"

interface FileSettingsProps {
  showConnectedFilesOnly: boolean
}

export default function FileSettings({ showConnectedFilesOnly: initialSetting }: FileSettingsProps) {
  const [showConnectedFilesOnly, setShowConnectedFilesOnly] = useState(initialSetting)
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleToggle = async () => {
    const newValue = !showConnectedFilesOnly
    setIsLoading(true)
    try {
      await updateSettings({ showConnectedFilesOnly: newValue })
      setShowConnectedFilesOnly(newValue)
      
      // Show success feedback
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 2000)
    } catch (error) {
      console.error("Failed to update file visibility setting:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">File Visibility</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Control which files are displayed in your assets view based on storage account connection status.
        </p>
      </div>

      {/* Single Toggle Setting */}
      <div className="flex items-start justify-between p-6 bg-muted/30 rounded-xl border border-border">
        <div className="flex items-start gap-4">
          <div className="mt-1">
            {showConnectedFilesOnly ? (
              <Eye className="w-6 h-6 text-primary" />
            ) : (
              <EyeOff className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-foreground text-base">Hide Disconnected Files</h4>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {showConnectedFilesOnly 
                ? "Only files from active storage accounts are shown. Disconnected files are hidden to keep your view clean."
                : "All files are displayed, including those from disconnected accounts (marked as unavailable)."
              }
            </p>
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Connected files
              </span>
              <span className="inline-flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${showConnectedFilesOnly ? 'bg-gray-300' : 'bg-red-500'}`}></div>
                Disconnected files {showConnectedFilesOnly ? '(hidden)' : '(shown as unavailable)'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 ml-4">
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1 text-green-600"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-medium">Saved</span>
            </motion.div>
          )}
          <button
            onClick={handleToggle}
            disabled={isLoading}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
              showConnectedFilesOnly ? 'bg-primary' : 'bg-muted-foreground'
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-3 h-3 text-white animate-spin mx-auto" />
            ) : (
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm ${
                  showConnectedFilesOnly ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            )}
          </button>
        </div>
      </div>

      <div className="mt-6 p-4 bg-muted rounded-xl border border-border">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center mt-0.5">
            <span className="text-primary-foreground text-xs font-bold">i</span>
          </div>
          <div>
            <h5 className="font-medium text-foreground">How this works</h5>
            <p className="text-sm text-muted-foreground mt-1">
              When enabled, this setting filters out files from disconnected storage accounts to keep your assets view clean and focused on accessible files. 
              When disabled, all files are shown but disconnected ones are marked as unavailable.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}