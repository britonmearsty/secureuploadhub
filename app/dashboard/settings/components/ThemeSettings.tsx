"use client"

import { useState } from "react"
import { updateSettings } from "../actions"
import { Loader2, Monitor, Moon, Sun, CheckCircle2 } from "lucide-react"
import { motion } from "framer-motion"
import { useTheme } from "@/lib/theme-provider"

interface ThemeSettingsProps {
  theme: string
}

export default function ThemeSettings({ theme: initialTheme }: ThemeSettingsProps) {
  const [theme, setTheme] = useState(initialTheme)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null)
  const { setTheme: setGlobalTheme } = useTheme()

  async function handleSave(newTheme: string) {
    if (newTheme === theme) return

    setTheme(newTheme)
    setIsLoading(true)
    setMessage(null)

    try {
      // Update the global theme immediately for instant feedback
      setGlobalTheme(newTheme as "light" | "dark" | "system")
      
      // Save to database
      await updateSettings({ theme: newTheme })
      setMessage({ text: "Appearance updated successfully", type: 'success' })
    } catch (_) {
      setMessage({ text: "Failed to update appearance", type: 'error' })
      // Revert theme on error
      setGlobalTheme(theme as "light" | "dark" | "system")
    } finally {
      setIsLoading(false)
    }
  }

  const themes = [
    { id: "light", name: "Light", icon: Sun, description: "Classic light appearance" },
    { id: "dark", name: "Dark", icon: Moon, description: "Easier on the eyes at night" },
    { id: "system", name: "System", icon: Monitor, description: "Follows your device settings" },
  ]

  return (
    <div className="max-w-3xl space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {themes.map((t) => {
          const Icon = t.icon
          const isActive = theme === t.id

          return (
            <button
              key={t.id}
              onClick={() => handleSave(t.id)}
              disabled={isLoading}
              className={`relative group flex flex-col p-4 rounded-2xl border-2 transition-all duration-200 text-left ${isActive
                  ? "border-primary bg-muted ring-4 ring-primary/5"
                  : "border-border hover:border-muted-foreground bg-card"
                } ${isLoading && theme !== t.id ? "opacity-50" : ""}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-xl border ${isActive ? "bg-card border-border" : "bg-muted border-border"
                  }`}>
                  <Icon className={`w-6 h-6 ${isActive ? "text-foreground" : "text-muted-foreground"}`} />
                </div>
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-foreground"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 fill-primary text-primary-foreground" />
                    )}
                  </motion.div>
                )}
              </div>
              <div className="mt-auto">
                <p className={`font-semibold text-sm ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                  {t.name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      <div className="pt-4">
        <div className="p-4 rounded-2xl bg-muted border border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Monitor className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Reduced Motion</p>
              <p className="text-xs text-muted-foreground">Minimize animations and transitions across the app.</p>
            </div>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground px-2 py-1 rounded">Coming Soon</p>
        </div>
      </div>

      {message && (
        <motion.p
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className={`text-sm font-medium ${message.type === 'error' ? "text-red-600" : "text-emerald-600"}`}
        >
          {message.text}
        </motion.p>
      )}
    </div>
  )
}

