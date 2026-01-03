import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"
import Sidebar from "./components/Sidebar"
import { ThemeProvider } from "@/lib/theme-provider"
import { ThemeSync } from "@/lib/theme-sync"
import { getFreshUserData } from "@/lib/session-validation"

async function handleSignOut() {
  "use server"
  await signOut({ redirectTo: "/" })
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      redirect("/auth/signin")
    }

    // Get fresh user data to ensure status and role are current
    const freshUser = await getFreshUserData(session.user.id)
    
    if (!freshUser) {
      // User not found in database, sign out
      console.error(`User ${session.user.id} not found in database`)
      await signOut({ redirectTo: "/auth/signin" })
      return null
    }

    // Check if user account is active
    if (freshUser.status !== 'active') {
      console.log(`User ${freshUser.email} account is ${freshUser.status}, signing out`)
      await signOut({ redirectTo: "/auth/signin" })
      return null
    }

    // Redirect admin users to admin panel (using fresh role data)
    // This is safe because admin layout won't redirect back to dashboard
    if (freshUser.role === 'admin') {
      redirect("/admin")
    }

    const userTheme = freshUser.theme || "system"

    return (
      <ThemeProvider defaultTheme={userTheme as "light" | "dark" | "system"}>
        <ThemeSync userTheme={userTheme} />
        <div className="min-h-screen bg-background flex">
          <Sidebar
            userName={session.user.name || freshUser.name}
            userImage={session.user.image}
            signOutAction={handleSignOut}
          />
          <main className="flex-1 min-w-0 overflow-y-auto">
            {children}
          </main>
        </div>
      </ThemeProvider>
    )
  } catch (error) {
    console.error('Dashboard layout error:', error)
    // On any error, redirect to signin for safety
    redirect("/auth/signin")
  }
}

