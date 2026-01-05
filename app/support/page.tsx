import { redirect } from "next/navigation"
import { auth } from "@/auth"
import SupportDashboard from "./SupportDashboard"

export default async function SupportPage() {
  const session = await auth()
  
  if (!session?.user || !session.user.id) {
    redirect("/auth/signin")
  }

  return <SupportDashboard user={{
    id: session.user.id,
    name: session.user.name || null,
    email: session.user.email || null,
    image: session.user.image || null
  }} />
}