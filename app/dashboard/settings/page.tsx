import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import SettingsClient from "./SettingsClient"

export default async function SettingsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  })

  if (!user) {
    redirect("/auth/signin")
  }

  const userData = {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    notificationEmail: user.notificationEmail,
    marketingEmail: user.marketingEmail,
    theme: user.theme || "system",
  }

  return <SettingsClient user={userData} />
}
