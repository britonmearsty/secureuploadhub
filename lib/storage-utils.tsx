interface StorageAccount {
  id: string
  status: string
  provider: string
  displayName: string
  email?: string
}

export function getStorageStatusIndicator(storageAccount?: StorageAccount | null) {
  if (!storageAccount) {
    return (
      <div className="flex items-center gap-1" title="Legacy file - no storage account binding">
        <div className="w-2 h-2 bg-gray-400 rounded-full" />
        <span className="text-xs text-gray-500">Legacy</span>
      </div>
    )
  }

  const status = storageAccount.status
  switch (status) {
    case 'ACTIVE':
      return (
        <div className="flex items-center gap-1" title="Storage account connected">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-green-600">Connected</span>
        </div>
      )
    case 'INACTIVE':
      return (
        <div className="flex items-center gap-1" title="Storage account inactive">
          <div className="w-2 h-2 bg-yellow-500 rounded-full" />
          <span className="text-xs text-yellow-600">Inactive</span>
        </div>
      )
    case 'DISCONNECTED':
      return (
        <div className="flex items-center gap-1" title="Storage account disconnected - file unavailable">
          <div className="w-2 h-2 bg-red-500 rounded-full" />
          <span className="text-xs text-red-600">Unavailable</span>
        </div>
      )
    case 'ERROR':
      return (
        <div className="flex items-center gap-1" title="Storage account has connection errors - file unavailable">
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
          <span className="text-xs text-orange-600">Unavailable</span>
        </div>
      )
    default:
      return (
        <div className="flex items-center gap-1" title="Unknown storage status">
          <div className="w-2 h-2 bg-gray-500 rounded-full" />
          <span className="text-xs text-gray-600">Unknown</span>
        </div>
      )
  }
}