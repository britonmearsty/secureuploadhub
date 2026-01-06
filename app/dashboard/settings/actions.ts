"use server"

import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function updateProfile(data: { name: string }) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: data.name },
  })

  revalidatePath("/dashboard/settings")
}

export async function updateSettings(data: {
  notificationEmail?: boolean
  marketingEmail?: boolean
  theme?: string
  showConnectedFilesOnly?: boolean
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  await prisma.user.update({
    where: { id: session.user.id },
    data,
  })

  revalidatePath("/dashboard/settings")
  revalidatePath("/dashboard/assets")
}
