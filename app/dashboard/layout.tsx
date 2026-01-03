import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"
import Sidebar from "./components/Sidebar"
import { ThemeProvider } from "@/lib/theme-provider"
import { ThemeSync } from "@/lib/theme-sync"
import prisma from "@/lib/prisma"

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

  // Get user theme preference
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { theme: true }
  })

  const userTheme = user?.theme || "system"

  return (
    <ThemeProvider defaultTheme={userTheme as "light" | "dark" | "system"}>
      <ThemeSync userTheme={userTheme} />
      <div className="min-h-screen bg-background flex">
        <Sidebar
          userName={session.user.name}
          userImage={session.user.image}
          signOutAction={handleSignOut}
        />
        <main className="flex-1 min-w-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </ThemeProvider>
  )
}

