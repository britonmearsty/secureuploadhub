import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import PortalsClient from "./PortalsClient"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "My Portals | Secure Upload Hub",
  description: "Manage your secure file collection portals, track uploads, and configure security settings.",
}

export default async function PortalsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  const portals = await prisma.uploadPortal.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      _count: {
        select: { uploads: true }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  })

  return <PortalsClient initialPortals={portals} />
}
