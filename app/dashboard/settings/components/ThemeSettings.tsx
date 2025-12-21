"use client"

import { useState } from "react"
import { updateSettings } from "../actions"
import { Loader2, Monitor, Moon, Sun, CheckCircle2 } from "lucide-react"
import { motion } from "framer-motion"

interface ThemeSettingsProps {
  theme: string
}

export default function ThemeSettings({ theme: initialTheme }: ThemeSettingsProps) {
  const [theme, setTheme] = useState(initialTheme)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null)

  async function handleSave(newTheme: string) {
    if (newTheme === theme) return

    setTheme(newTheme)
    setIsLoading(true)
    setMessage(null)

    try {
      await updateSettings({ theme: newTheme })
      setMessage({ text: "Appearance updated successfully", type: 'success' })
    } catch (_) {
      setMessage({ text: "Failed to update appearance", type: 'error' })
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
                  ? "border-slate-900 bg-slate-50 ring-4 ring-slate-900/5"
                  : "border-slate-200 hover:border-slate-300 bg-white"
                } ${isLoading && theme !== t.id ? "opacity-50" : ""}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-xl border ${isActive ? "bg-white border-slate-200" : "bg-slate-50 border-slate-100"
                  }`}>
                  <Icon className={`w-6 h-6 ${isActive ? "text-slate-900" : "text-slate-400"}`} />
                </div>
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-slate-900"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 fill-slate-900 text-white" />
                    )}
                  </motion.div>
                )}
              </div>
              <div className="mt-auto">
                <p className={`font-semibold text-sm ${isActive ? "text-slate-900" : "text-slate-600"}`}>
                  {t.name}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {t.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      <div className="pt-4">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Monitor className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-sm font-medium text-slate-900">Reduced Motion</p>
              <p className="text-xs text-slate-500">Minimize animations and transitions across the app.</p>
            </div>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-600 px-2 py-1 rounded">Coming Soon</p>
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

