"use client"

import { useState } from "react"
import { updateSettings } from "../actions"
import { Loader2, Monitor, Moon, Sun } from "lucide-react"

interface ThemeSettingsProps {
  theme: string
}

export default function ThemeSettings({ theme: initialTheme }: ThemeSettingsProps) {
  const [theme, setTheme] = useState(initialTheme)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")

  async function handleSave(newTheme: string) {
    setTheme(newTheme)
    setIsLoading(true)
    setMessage("")

    try {
      await updateSettings({ theme: newTheme })
      setMessage("Theme updated successfully")
    } catch (_) {
      setMessage("Failed to update theme")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
          <Monitor className="w-5 h-5" />
          Appearance
        </h3>
        <p className="text-gray-600 text-sm mt-1">
          Customize how SecureUploadHub looks
        </p>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => handleSave("light")}
            disabled={isLoading}
            className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${
              theme === "light"
                ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                : "border-gray-200 hover:border-gray-300 text-gray-600"
            } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isLoading && theme === "light" ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sun className="w-6 h-6" />}
            <span className="font-medium text-sm">Light</span>
          </button>

          <button
            onClick={() => handleSave("dark")}
            disabled={isLoading}
            className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${
              theme === "dark"
                ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                : "border-gray-200 hover:border-gray-300 text-gray-600"
            } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isLoading && theme === "dark" ? <Loader2 className="w-6 h-6 animate-spin" /> : <Moon className="w-6 h-6" />}
            <span className="font-medium text-sm">Dark</span>
          </button>

          <button
            onClick={() => handleSave("system")}
            disabled={isLoading}
            className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${
              theme === "system"
                ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                : "border-gray-200 hover:border-gray-300 text-gray-600"
            } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isLoading && theme === "system" ? <Loader2 className="w-6 h-6 animate-spin" /> : <Monitor className="w-6 h-6" />}
            <span className="font-medium text-sm">System</span>
          </button>
        </div>
        
        {message && (
          <p className={`text-sm mt-4 ${message.includes("Failed") ? "text-red-600" : "text-green-600"}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}
