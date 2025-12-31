import { redirect } from "next/navigation"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import SettingsClient from "./SettingsClient"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
    const session = await auth()
    
    if (!session?.user?.id || session.user.role !== "admin") {
        redirect("/auth/signin")
    }

    const settings = await prisma.systemSetting.findMany()
    
    const settingsObj = settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value
        return acc
    }, {} as Record<string, string>)

    return <SettingsClient initialSettings={settingsObj} />
}
