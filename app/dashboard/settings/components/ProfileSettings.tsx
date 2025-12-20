"use client"

import { useState } from "react"
import { User } from "next-auth"
import { updateProfile } from "../actions"
import { Loader2, User as UserIcon } from "lucide-react"

interface ProfileSettingsProps {
  user: User
}

export default function ProfileSettings({ user }: ProfileSettingsProps) {
  const [name, setName] = useState(user.name || "")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setMessage("")

    try {
      await updateProfile({ name })
      setMessage("Profile updated successfully")
    } catch (_) {
      setMessage("Failed to update profile")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
          <UserIcon className="w-5 h-5" />
          Profile Settings
        </h3>
        <p className="text-gray-600 text-sm mt-1">
          Update your personal information
        </p>
      </div>
      
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={user.email || ""}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
            {message && (
              <p className={`text-sm ${message.includes("Failed") ? "text-red-600" : "text-green-600"}`}>
                {message}
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
