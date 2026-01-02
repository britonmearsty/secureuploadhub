"use client"

import { useState } from "react"
import { updateProfile } from "../actions"
import { Loader2, Mail, User as UserIcon, Camera } from "lucide-react"
import { motion } from "framer-motion"

interface ProfileSettingsProps {
  user: {
    name: string | null
    email: string | null
    image: string | null
  }
}

export default function ProfileSettings({ user }: ProfileSettingsProps) {
  const [name, setName] = useState(user.name || "")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      await updateProfile({ name })
      setMessage({ text: "Profile updated successfully", type: 'success' })
    } catch (_) {
      setMessage({ text: "Failed to update profile", type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Profile Picture Section */}
        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="w-24 h-24 rounded-2xl bg-muted border-2 border-dashed border-border flex items-center justify-center overflow-hidden transition-colors group-hover:bg-muted/80 group-hover:border-muted-foreground">
              {user.image ? (
                <img src={user.image} alt={name} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-10 h-10 text-muted-foreground" />
              )}
            </div>
            <button
              type="button"
              className="absolute -bottom-2 -right-2 p-2 bg-card rounded-lg shadow-md border border-border text-muted-foreground hover:text-foreground transition-colors"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <div>
            <h4 className="font-medium text-foreground">Profile Picture</h4>
            <p className="text-sm text-muted-foreground mt-1">PNG, JPG or GIF up to 10MB.</p>
          </div>
        </div>

        <div className="grid gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-muted-foreground" />
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl focus:ring-2 focus:ring-primary focus:bg-card transition-all outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                value={user.email || ""}
                disabled
                className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-xl text-muted-foreground cursor-not-allowed italic"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground px-2 py-1 rounded">Locked</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Email addresses are managed via your authentication provider.</p>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 transition-all shadow-sm active:scale-95"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Update Profile
          </button>
          {message && (
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`text-sm font-medium ${message.type === 'error' ? "text-destructive" : "text-emerald-600"}`}
            >
              {message.text}
            </motion.p>
          )}
        </div>
      </form>
    </div>
  )
}

