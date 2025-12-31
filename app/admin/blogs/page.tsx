import { redirect } from "next/navigation"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import BlogsClient from "./BlogsClient"

export const dynamic = "force-dynamic"

export default async function BlogsPage() {
    const session = await auth()
    
    if (!session?.user?.id || session.user.role !== "admin") {
        redirect("/auth/signin")
    }

    const blogs = await prisma.blogPost.findMany({
        orderBy: { createdAt: "desc" }
    })

    return <BlogsClient blogs={blogs as any} />
}
