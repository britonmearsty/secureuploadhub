import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import ConnectedAccounts from "../settings/components/ConnectedAccounts"

export default async function IntegrationsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/signin")
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Integrations</h1>
        <p className="text-gray-600">
          Connect your cloud storage providers to automatically sync uploaded files
        </p>
      </div>

      {/* Connected Storage Accounts */}
      <div className="mb-8">
        <ConnectedAccounts />
      </div>
    </div>
  )
}
