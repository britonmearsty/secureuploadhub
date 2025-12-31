import { redirect } from "next/navigation"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import BillingManagementClient from "./BillingManagementClient"

export const dynamic = "force-dynamic"

export default async function BillingPage() {
    const session = await auth()
    
    if (!session?.user?.id || session.user.role !== "admin") {
        redirect("/")
    }

    const plans = await prisma.billingPlan.findMany({
        orderBy: { price: "asc" },
        include: {
            _count: {
                select: { subscriptions: true }
            }
        }
    })

    return <BillingManagementClient plans={plans as any} />
}
