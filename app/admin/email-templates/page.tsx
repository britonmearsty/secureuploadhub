import { redirect } from "next/navigation"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import EmailTemplatesClient from "./EmailTemplatesClient"

export const dynamic = "force-dynamic"

export default async function EmailTemplatesPage() {
    const session = await auth()
    
    if (!session?.user?.id || session.user.role !== "admin") {
        redirect("/auth/signin")
    }

    const templates = await prisma.emailTemplate.findMany({
        orderBy: { createdAt: "desc" }
    })

    return <EmailTemplatesClient templates={templates as any} />
}
