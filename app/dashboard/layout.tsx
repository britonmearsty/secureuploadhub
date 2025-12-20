import { auth, signOut } from "@/lib/auth"
import { redirect } from "next/navigation"
import Sidebar from "./components/Sidebar"

async function handleSignOut() {
  "use server"
  await signOut({ redirectTo: "/" })
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/signin")
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        userName={session.user.name}
        userImage={session.user.image}
        signOutAction={handleSignOut}
      />
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  )
}

