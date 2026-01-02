"use client"

import { useState } from "react"
import { updateSettings } from "../actions"
import { Loader2, Bell, Mail, Megaphone } from "lucide-react"
import { motion } from "framer-motion"

interface NotificationSettingsProps {
  notificationEmail: boolean
  marketingEmail: boolean
}

function Switch({ checked, onChange, disabled }: { checked: boolean, onChange: (val: boolean) => void, disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${checked ? 'bg-primary' : 'bg-muted'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <motion.span
        animate={{ x: checked ? 20 : 4 }}
        className="inline-block h-4 w-4 transform rounded-full bg-card transition-transform"
      />
    </button>
  )
}

export default function NotificationSettings({
  notificationEmail: initialNotificationEmail,
  marketingEmail: initialMarketingEmail
}: NotificationSettingsProps) {
  const [notificationEmail, setNotificationEmail] = useState(initialNotificationEmail)
  const [marketingEmail, setMarketingEmail] = useState(initialMarketingEmail)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null)

  async function handleSave() {
    setIsLoading(true)
    setMessage(null)

    try {
      await updateSettings({ notificationEmail, marketingEmail })
      setMessage({ text: "Preferences saved successfully", type: 'success' })
    } catch (_) {
      setMessage({ text: "Failed to save preferences", type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 rounded-2xl bg-muted border border-border transition-all hover:bg-muted/80">
          <div className="flex gap-4">
            <div className="p-2.5 bg-card rounded-xl shadow-sm border border-border h-fit">
              <Bell className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Upload Notifications</h4>
              <p className="text-sm text-muted-foreground">Receive an email when someone uploads a file to your portals.</p>
            </div>
          </div>
          <Switch
            checked={notificationEmail}
            onChange={setNotificationEmail}
            disabled={isLoading}
          />
        </div>

        <div className="flex items-center justify-between p-4 rounded-2xl bg-muted border border-border transition-all hover:bg-muted/80">
          <div className="flex gap-4">
            <div className="p-2.5 bg-card rounded-xl shadow-sm border border-border h-fit">
              <Megaphone className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Product Updates</h4>
              <p className="text-sm text-muted-foreground">Receive emails about new features and improvements.</p>
            </div>
          </div>
          <Switch
            checked={marketingEmail}
            onChange={setMarketingEmail}
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="flex items-center gap-4 pt-4">
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 transition-all shadow-sm active:scale-95"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Preferences
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
    </div>
  )
}

