import { auth, signOut } from "@/lib/auth"
import { redirect } from "next/navigation"
import { LogOut } from "lucide-react"
import PortalList from "./components/PortalList"
import RecentUploads from "./components/RecentUploads"

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/signin")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">SecureUploadHub</h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {session.user.image && (
                  <img
                    src={session.user.image}
                    alt={session.user.name || "User"}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <span className="text-gray-700">{session.user.name}</span>
              </div>
              <form
                action={async () => {
                  "use server"
                  await signOut({ redirectTo: "/" })
                }}
              >
                <button
                  type="submit"
                  className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Welcome back, {session.user.name?.split(" ")[0]}!
          </h2>
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
      </main>
    </div>
  )
}

