import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import AssetsClient from "./AssetsClient"

export default async function AssetsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  // Fetch all file uploads for the user's portals
  const uploads = await prisma.fileUpload.findMany({
    where: {
      portal: {
        userId: session.user.id,
      },
    },
    select: {
      id: true,
      fileName: true,
      fileSize: true,
      mimeType: true,
      clientName: true,
      clientEmail: true,
      storageProvider: true,
      storagePath: true,
      createdAt: true,
      portal: {
        select: {
          name: true,
          slug: true,
          primaryColor: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  return <AssetsClient initialUploads={uploads as any} />
}