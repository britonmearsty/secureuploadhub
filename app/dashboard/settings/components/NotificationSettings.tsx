"use client"

import { useState } from "react"
import { updateSettings } from "../actions"
import { Loader2, Bell } from "lucide-react"

interface NotificationSettingsProps {
  notificationEmail: boolean
  marketingEmail: boolean
}

export default function NotificationSettings({ 
  notificationEmail: initialNotificationEmail, 
  marketingEmail: initialMarketingEmail 
}: NotificationSettingsProps) {
  const [notificationEmail, setNotificationEmail] = useState(initialNotificationEmail)
  const [marketingEmail, setMarketingEmail] = useState(initialMarketingEmail)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")

  async function handleSave() {
    setIsLoading(true)
    setMessage("")

    try {
      await updateSettings({ notificationEmail, marketingEmail })
      setMessage("Preferences saved successfully")
    } catch (_) {
      setMessage("Failed to save preferences")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notification Preferences
        </h3>
        <p className="text-gray-600 text-sm mt-1">
          Manage how we contact you
        </p>
      </div>
      
      <div className="p-6 space-y-6">
        <div className="flex items-start gap-3">
          <div className="flex items-center h-5">
            <input
              id="notificationEmail"
              type="checkbox"
              checked={notificationEmail}
              onChange={(e) => setNotificationEmail(e.target.checked)}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
          </div>
          <div className="text-sm">
            <label htmlFor="notificationEmail" className="font-medium text-gray-900">
              Upload Notifications
            </label>
            <p className="text-gray-500">Receive an email when someone uploads a file to your portals</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex items-center h-5">
            <input
              id="marketingEmail"
              type="checkbox"
              checked={marketingEmail}
              onChange={(e) => setMarketingEmail(e.target.checked)}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
          </div>
          <div className="text-sm">
            <label htmlFor="marketingEmail" className="font-medium text-gray-900">
              Product Updates
            </label>
            <p className="text-gray-500">Receive emails about new features and improvements</p>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-2">
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Preferences
          </button>
          {message && (
            <p className={`text-sm ${message.includes("Failed") ? "text-red-600" : "text-green-600"}`}>
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
