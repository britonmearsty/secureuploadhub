import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import ClientsClient from "./ClientsClient"

export const dynamic = "force-dynamic"

export default async function ClientsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  // Fetch unique clients from uploads with portal info
  const uploads = await prisma.fileUpload.findMany({
    where: {
      portal: {
        userId: session.user.id,
      },
    },
    select: {
      clientName: true,
      clientEmail: true,
      fileName: true,
      fileSize: true,
      createdAt: true,
      portal: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  // Aggregate unique clients
  const clientMap = new Map<string, {
    name: string | null;
    email: string | null;
    portals: Set<string>;
    lastUpload: { date: string; fileName: string; portal: string };
    uploadCount: number;
    totalStorageBytes: number;
  }>()

  uploads.forEach((upload: any) => {
    const key = upload.clientEmail || upload.clientName || "Unknown"
    const existing = clientMap.get(key)

    if (existing) {
      existing.portals.add(upload.portal.name)
      existing.uploadCount++
      existing.totalStorageBytes += upload.fileSize

      const currentLastDate = new Date(existing.lastUpload.date)
      const uploadDate = new Date(upload.createdAt)

      if (uploadDate > currentLastDate) {
        existing.lastUpload = {
          date: upload.createdAt.toISOString(),
          fileName: upload.fileName,
          portal: upload.portal.name
        }
      }
    } else {
      clientMap.set(key, {
        name: upload.clientName,
        email: upload.clientEmail,
        portals: new Set([upload.portal.name]),
        lastUpload: {
          date: upload.createdAt.toISOString(),
          fileName: upload.fileName,
          portal: upload.portal.name
        },
        uploadCount: 1,
        totalStorageBytes: upload.fileSize
      })
    }
  })

  const clients = Array.from(clientMap.entries()).map(([key, data]) => ({
    key,
    ...data,
    portals: Array.from(data.portals),
  }))

  return <ClientsClient clients={clients} />
}