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
    console.log(`👑 ADMIN LAYOUT: Starting execution`)
    
    try {
        const session = await auth()
        console.log(`👑 ADMIN LAYOUT: Session check - User ID: ${session?.user?.id || 'none'}`)

        if (!session?.user?.id) {
            console.log(`👑 ADMIN LAYOUT: No session, redirecting to /auth/signin`)
            redirect("/auth/signin")
        }

        // Get fresh user data to ensure status and role are current
        console.log(`👑 ADMIN LAYOUT: Fetching fresh user data for ${session.user.id}`)
        const freshUser = await getFreshUserData(session.user.id)
        console.log(`👑 ADMIN LAYOUT: Fresh user data:`, {
            found: !!freshUser,
            email: freshUser?.email,
            role: freshUser?.role,
            status: freshUser?.status
        })
        
        if (!freshUser) {
            // User not found in database, sign out
            console.error(`👑 ADMIN LAYOUT: User ${session.user.id} not found in database, signing out`)
            await signOut({ redirectTo: "/auth/signin" })
            return null
        }

        // Check if user account is active
        if (freshUser.status !== 'active') {
            console.log(`👑 ADMIN LAYOUT: User ${freshUser.email} account is ${freshUser.status}, signing out`)
            await signOut({ redirectTo: "/auth/signin" })
            return null
        }

        // Double-check admin role using fresh data
        if (freshUser.role !== "admin") {
            console.log(`👑 ADMIN LAYOUT: User ${freshUser.email} (role: ${freshUser.role}) is not admin, redirecting to dashboard`)
            redirect("/dashboard")
        }

        console.log(`👑 ADMIN LAYOUT: Admin user ${freshUser.email} validated, rendering admin panel`)

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
        console.error('👑 ADMIN LAYOUT: Error occurred:', error)
        // On any error, redirect to signin for safety
        redirect("/auth/signin")
    }
}
