import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import IntegrationsClient from "./IntegrationsClient"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Cloud Storage Integrations | SecureUploadHub",
  description: "Connect and manage cloud storage integrations including Google Drive and Dropbox. Automatically sync and backup uploaded files to your preferred cloud storage providers.",
}

export default async function IntegrationsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/signin")
  }

  return <IntegrationsClient />
}
