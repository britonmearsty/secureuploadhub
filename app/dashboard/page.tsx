import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import PortalList from "./components/PortalList"
import RecentUploads from "./components/RecentUploads"
import PostHogIdentify from "./components/PostHogIdentify"

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/signin")
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* PostHog User Identification */}
      <PostHogIdentify
        userId={session.user.id!}
        email={session.user.email}
        name={session.user.name}
      />

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome back, {session.user.name?.split(" ")[0]}!
        </h1>
        <p className="text-gray-600">
          Manage your secure upload portals and connected storage
        </p>
      </div>

      {/* Portal List */}
      <div className="mb-8">
        <PortalList />
      </div>

      {/* Recent Uploads */}
      <RecentUploads />
    </div>
  )
}
