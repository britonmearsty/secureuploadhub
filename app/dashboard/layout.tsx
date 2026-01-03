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
  console.log(`🏠 DASHBOARD LAYOUT: Starting execution`)
  
  try {
    const session = await auth()
    console.log(`🏠 DASHBOARD LAYOUT: Session check - User ID: ${session?.user?.id || 'none'}`)

    if (!session?.user?.id) {
      console.log(`🏠 DASHBOARD LAYOUT: No session, redirecting to /auth/signin`)
      redirect("/auth/signin")
    }

    // Get fresh user data to ensure status and role are current
    console.log(`🏠 DASHBOARD LAYOUT: Fetching fresh user data for ${session.user.id}`)
    const freshUser = await getFreshUserData(session.user.id)
    console.log(`🏠 DASHBOARD LAYOUT: Fresh user data:`, {
      found: !!freshUser,
      email: freshUser?.email,
      role: freshUser?.role,
      status: freshUser?.status
    })
    
    if (!freshUser) {
      // User not found in database, sign out
      console.error(`🏠 DASHBOARD LAYOUT: User ${session.user.id} not found in database, signing out`)
      await signOut({ redirectTo: "/auth/signin" })
      return null
    }

    // Check if user account is active
    if (freshUser.status !== 'active') {
      console.log(`🏠 DASHBOARD LAYOUT: User ${freshUser.email} account is ${freshUser.status}, signing out`)
      await signOut({ redirectTo: "/auth/signin" })
      return null
    }

    // Redirect admin users to admin panel (using fresh role data)
    // TEMPORARY FIX: Comment out the redirect to prevent loops
    if (freshUser.role === 'admin') {
      console.log(`🏠 DASHBOARD LAYOUT: Admin user ${freshUser.email} detected - allowing dashboard access`)
      // redirect("/admin") // Commented out to prevent redirect loop
    }

    console.log(`🏠 DASHBOARD LAYOUT: Regular user ${freshUser.email}, rendering dashboard`)
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
    console.error('🏠 DASHBOARD LAYOUT: Error occurred:', error)
    // On any error, redirect to signin for safety
    redirect("/auth/signin")
  }
}

