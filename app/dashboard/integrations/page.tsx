import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import IntegrationsClient from "./IntegrationsClient"

export const dynamic = "force-dynamic"

export default async function IntegrationsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/signin")
  }

  return <IntegrationsClient />
}
