import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { ThemeProvider } from "@/lib/theme-provider"
import { ThemeSync } from "@/lib/theme-sync"
import { getFreshUserData } from "@/lib/session-validation"

// Force dynamic rendering for authenticated routes
export const dynamic = 'force-dynamic'

export default async function SupportLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  // Get fresh user data to ensure theme is current
  const freshUser = await getFreshUserData(session.user.id)
  
  if (!freshUser) {
    redirect("/auth/signin")
  }

  // Check if user account is active
  if (freshUser.status !== 'active') {
    redirect("/auth/signin")
  }

  const userTheme = freshUser.theme || "system"

  return (
    <ThemeProvider defaultTheme={userTheme as "light" | "dark" | "system"}>
      <ThemeSync userTheme={userTheme} />
      <div className="min-h-screen bg-background">
        {children}
      </div>
    </ThemeProvider>
  )
}