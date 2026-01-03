import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"
import AdminSidebar from "./components/AdminSidebar"
import { getFreshUserData } from "@/lib/session-validation"

async function handleSignOut() {
    "use server"
    await signOut({ redirectTo: "/" })
}

export default async function AdminLayout({
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

        // Double-check admin role using fresh data
        if (freshUser.role !== "admin") {
            console.log(`User ${freshUser.email} (role: ${freshUser.role}) is not admin, redirecting to dashboard`)
            redirect("/dashboard")
        }

        return (
            <div className="min-h-screen bg-slate-50 flex">
                <AdminSidebar
                    userName={session.user.name || freshUser.name}
                    userImage={session.user.image}
                    signOutAction={handleSignOut}
                />
                <main className="flex-1 min-w-0 overflow-y-auto">
                    {children}
                </main>
            </div>
        )
    } catch (error) {
        console.error('Admin layout error:', error)
        // On any error, redirect to signin for safety
        redirect("/auth/signin")
    }
}
