import Link from "next/link"
import { Plus } from "lucide-react"
import PortalList from "../components/PortalList"

export default function PortalsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload Portals</h1>
          <p className="text-gray-600">
            Manage your branded upload portals for clients
          </p>
        </div>
        <Link
          href="/dashboard/portals/new"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Create Portal
        </Link>
      </div>

      {/* Portal List */}
      <PortalList />
    </div>
  )
}

