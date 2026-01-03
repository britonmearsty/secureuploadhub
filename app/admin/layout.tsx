import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"
import AdminSidebar from "./components/AdminSidebar"

async function handleSignOut() {
    "use server"
    await signOut({ redirectTo: "/" })
}

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()

    if (!session?.user) {
        redirect("/auth/signin")
    }

    // Double-check admin role
    if (session.user.role !== "admin") {
        redirect("/dashboard")
    }

    return (
        <div className="min-h-screen bg-slate-50 flex">
            <AdminSidebar
                userName={session.user.name}
                userImage={session.user.image}
                signOutAction={handleSignOut}
            />
            <main className="flex-1 min-w-0 overflow-y-auto">
                {children}
            </main>
        </div>
    )
}
