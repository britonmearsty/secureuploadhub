import { redirect } from "next/navigation"
import { auth } from "@/auth"
import SupportDashboard from "./SupportDashboard"

export default async function SupportPage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect("/auth/signin")
  }

  return <SupportDashboard user={session.user} />
}