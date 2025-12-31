import { auth } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const clientEmail = searchParams.get("clientEmail")
  const clientName = searchParams.get("clientName")

  if (!clientEmail && !clientName) {
    return NextResponse.json({ error: "clientEmail or clientName required" }, { status: 400 })
  }

  const uploads = await prisma.fileUpload.findMany({
    where: {
      portal: {
        userId: session.user.id,
      },
      OR: [
        clientEmail ? { clientEmail } : {},
        clientName ? { clientName } : {},
      ].filter(Boolean),
    },
    select: {
      id: true,
      fileName: true,
      fileSize: true,
      mimeType: true,
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

  return NextResponse.json(uploads)
}