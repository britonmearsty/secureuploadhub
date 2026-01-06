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

  const handleToggle = async (newValue: boolean) => {
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

      <div className="space-y-4">
        {/* Show Connected Files Only Option */}
        <div className="flex items-start justify-between p-4 bg-muted/30 rounded-xl border border-border">
          <div className="flex items-start gap-3">
            <div className="mt-1">
              {showConnectedFilesOnly ? (
                <Eye className="w-5 h-5 text-green-600" />
              ) : (
                <EyeOff className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <h4 className="font-medium text-foreground">Show Connected Files Only</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Only display files from active storage accounts. Files from disconnected accounts will be hidden.
              </p>
              <div className="mt-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Connected files visible
                </span>
                <span className="mx-2">•</span>
                <span className="inline-flex items-center gap-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  Disconnected files hidden
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
              onClick={() => handleToggle(!showConnectedFilesOnly)}
              disabled={isLoading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                showConnectedFilesOnly ? 'bg-green-600' : 'bg-muted-foreground'
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-3 h-3 text-white animate-spin mx-auto" />
              ) : (
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showConnectedFilesOnly ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              )}
            </button>
          </div>
        </div>

        {/* Show All Files Option */}
        <div className="flex items-start justify-between p-4 bg-muted/30 rounded-xl border border-border">
          <div className="flex items-start gap-3">
            <div className="mt-1">
              {!showConnectedFilesOnly ? (
                <Eye className="w-5 h-5 text-blue-600" />
              ) : (
                <EyeOff className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <h4 className="font-medium text-foreground">Show All Files</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Display all files regardless of storage account status. Disconnected files will show as "Unavailable".
              </p>
              <div className="mt-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Connected files visible
                </span>
                <span className="mx-2">•</span>
                <span className="inline-flex items-center gap-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  Disconnected files visible (unavailable)
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleToggle(false)}
              disabled={isLoading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                !showConnectedFilesOnly ? 'bg-blue-600' : 'bg-muted-foreground'
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-3 h-3 text-white animate-spin mx-auto" />
              ) : (
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    !showConnectedFilesOnly ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              )}
            </button>
          </div>
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
              When "Show Connected Files Only" is enabled, files from disconnected storage accounts are filtered out of your assets view. 
              This helps keep your file list clean and focused on accessible files. You can always change this setting to view all files when needed.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}