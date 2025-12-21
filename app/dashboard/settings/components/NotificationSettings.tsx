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
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 ${checked ? 'bg-slate-900' : 'bg-slate-200'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <motion.span
        animate={{ x: checked ? 20 : 4 }}
        className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
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
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 transition-all hover:bg-slate-100/50">
          <div className="flex gap-4">
            <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-200 h-fit">
              <Bell className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900">Upload Notifications</h4>
              <p className="text-sm text-slate-500">Receive an email when someone uploads a file to your portals.</p>
            </div>
          </div>
          <Switch
            checked={notificationEmail}
            onChange={setNotificationEmail}
            disabled={isLoading}
          />
        </div>

        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 transition-all hover:bg-slate-100/50">
          <div className="flex gap-4">
            <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-200 h-fit">
              <Megaphone className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900">Product Updates</h4>
              <p className="text-sm text-slate-500">Receive emails about new features and improvements.</p>
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
          className="px-6 py-2.5 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2 transition-all shadow-sm active:scale-95"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Preferences
        </button>
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
    </div>
  )
}

