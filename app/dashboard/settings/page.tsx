import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import ProfileSettings from "./components/ProfileSettings"
import NotificationSettings from "./components/NotificationSettings"
import ThemeSettings from "./components/ThemeSettings"

export default async function SettingsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  })

  if (!user) {
    redirect("/auth/signin")
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">
          Manage your account preferences
        </p>
      </div>

      <div className="space-y-8">
        {/* Profile Settings */}
        <ProfileSettings user={user} />

        {/* Notification Settings */}
        <NotificationSettings 
          notificationEmail={user.notificationEmail}
          marketingEmail={user.marketingEmail}
        />

        {/* Theme Settings */}
        <ThemeSettings theme={user.theme} />
      </div>
    </div>
  )
}

