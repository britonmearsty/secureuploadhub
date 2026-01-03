import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/storage', () => ({
  getConnectedAccounts: vi.fn(),
  disconnectStorageAccount: vi.fn(),
  listCloudFolders: vi.fn(),
  createCloudFolder: vi.fn(),
  renameCloudFolder: vi.fn(),
  deleteCloudFolder: vi.fn(),
  getRootFolder: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    syncSettings: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

import { auth } from '@/auth'
import { 
  getConnectedAccounts, 
  disconnectStorageAccount,
  listCloudFolders,
  createCloudFolder,
  renameCloudFolder,
  deleteCloudFolder,
  getRootFolder
} from '@/lib/storage'
import prisma from '@/lib/prisma'

describe('API Route: /api/storage/accounts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/storage/accounts', () => {
    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/storage/accounts')
      const { GET } = await import('@/app/api/storage/accounts/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return connected storage accounts for authenticated user', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'user@example.com' }
      }

      const mockAccounts = [
        {
          id: 'account-1',
          provider: 'google_drive',
          email: 'user@gmail.com',
          isConnected: true,
          connectedAt: new Date(),
        },
        {
          id: 'account-2',
          provider: 'dropbox',
          email: 'user@example.com',
          isConnected: true,
          connectedAt: new Date(),
        },
      ]

      vi.mocked(auth).mockResolvedValue(mockSession)
      vi.mocked(getConnectedAccounts).mockResolvedValue(mockAccounts)

      const request = new NextRequest('http://localhost:3000/api/storage/accounts')
      const { GET } = await import('@/app/api/storage/accounts/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.accounts).toHaveLength(2)
      expect(data.accounts[0].provider).toBe('google_drive')
      expect(data.accounts[1].provider).toBe('dropbox')
      expect(getConnectedAccounts).toHaveBeenCalledWith('user-123')
    })

    it('should return empty array when no accounts are connected', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'user@example.com' }
      }

      vi.mocked(auth).mockResolvedValue(mockSession)
      vi.mocked(getConnectedAccounts).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/storage/accounts')
      const { GET } = await import('@/app/api/storage/accounts/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.accounts).toHaveLength(0)
    })
  })

  describe('DELETE /api/storage/accounts/[provider]', () => {
    it('should disconnect storage account successfully', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'user@example.com' }
      }

      vi.mocked(auth).mockResolvedValue(mockSession)
      vi.mocked(disconnectStorageAccount).mockResolvedValue(true)

      const request = new NextRequest('http://localhost:3000/api/storage/accounts/google_drive', {
        method: 'DELETE',
      })

      const { DELETE } = await import('@/app/api/storage/accounts/[provider]/route')
      const response = await DELETE(request, { params: { provider: 'google_drive' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Storage account disconnected successfully')
      expect(disconnectStorageAccount).toHaveBeenCalledWith('user-123', 'google_drive')
    })

    it('should return 400 for invalid provider', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'user@example.com' }
      }

      vi.mocked(auth).mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost:3000/api/storage/accounts/invalid_provider', {
        method: 'DELETE',
      })

      const { DELETE } = await import('@/app/api/storage/accounts/[provider]/route')
      const response = await DELETE(request, { params: { provider: 'invalid_provider' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid storage provider')
    })
  })

  describe('GET /api/storage/folders', () => {
    it('should list cloud folders for authenticated user', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'user@example.com' }
      }

      const mockFolders = [
        {
          id: 'folder-1',
          name: 'uploads',
          path: '/uploads',
          provider: 'google_drive',
          parentId: 'root',
        },
        {
          id: 'folder-2',
          name: 'documents',
          path: '/documents',
          provider: 'google_drive',
          parentId: 'root',
        },
      ]

      vi.mocked(auth).mockResolvedValue(mockSession)
      vi.mocked(listCloudFolders).mockResolvedValue(mockFolders)

      const request = new NextRequest('http://localhost:3000/api/storage/folders?provider=google_drive')
      const { GET } = await import('@/app/api/storage/folders/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.folders).toHaveLength(2)
      expect(data.folders[0].name).toBe('uploads')
      expect(listCloudFolders).toHaveBeenCalledWith('user-123', 'google_drive', undefined)
    })

    it('should create new folder successfully', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'user@example.com' }
      }

      const mockNewFolder = {
        id: 'folder-new',
        name: 'new-folder',
        path: '/new-folder',
        provider: 'google_drive',
        parentId: 'root',
      }

      vi.mocked(auth).mockResolvedValue(mockSession)
      vi.mocked(createCloudFolder).mockResolvedValue(mockNewFolder)

      const request = new NextRequest('http://localhost:3000/api/storage/folders', {
        method: 'POST',
        body: JSON.stringify({
          provider: 'google_drive',
          name: 'new-folder',
          parentId: 'root',
        }),
      })

      const { POST } = await import('@/app/api/storage/folders/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.folder.name).toBe('new-folder')
      expect(createCloudFolder).toHaveBeenCalledWith('user-123', 'google_drive', 'new-folder', 'root')
    })
  })

  describe('PUT /api/storage/folders/[folderId]', () => {
    it('should rename folder successfully', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'user@example.com' }
      }

      const mockRenamedFolder = {
        id: 'folder-1',
        name: 'renamed-folder',
        path: '/renamed-folder',
        provider: 'google_drive',
      }

      vi.mocked(auth).mockResolvedValue(mockSession)
      vi.mocked(renameCloudFolder).mockResolvedValue(mockRenamedFolder)

      const request = new NextRequest('http://localhost:3000/api/storage/folders/folder-1', {
        method: 'PUT',
        body: JSON.stringify({
          provider: 'google_drive',
          name: 'renamed-folder',
        }),
      })

      const { PUT } = await import('@/app/api/storage/folders/[folderId]/route')
      const response = await PUT(request, { params: { folderId: 'folder-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.folder.name).toBe('renamed-folder')
      expect(renameCloudFolder).toHaveBeenCalledWith('user-123', 'google_drive', 'folder-1', 'renamed-folder')
    })

    it('should delete folder successfully', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'user@example.com' }
      }

      vi.mocked(auth).mockResolvedValue(mockSession)
      vi.mocked(deleteCloudFolder).mockResolvedValue(true)

      const request = new NextRequest('http://localhost:3000/api/storage/folders/folder-1', {
        method: 'DELETE',
      })

      const { DELETE } = await import('@/app/api/storage/folders/[folderId]/route')
      const response = await DELETE(request, { params: { folderId: 'folder-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Folder deleted successfully')
      expect(deleteCloudFolder).toHaveBeenCalledWith('user-123', expect.any(String), 'folder-1')
    })
  })

  describe('GET /api/storage/sync-settings', () => {
    it('should return sync settings for authenticated user', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'user@example.com' }
      }

      const mockSyncSettings = {
        id: 'sync-1',
        userId: 'user-123',
        autoSync: true,
        syncProvider: 'google_drive',
        syncFolderId: 'folder-uploads',
        syncFrequency: 'daily',
      }

      vi.mocked(auth).mockResolvedValue(mockSession)
      vi.mocked(prisma.syncSettings.findUnique).mockResolvedValue(mockSyncSettings)

      const request = new NextRequest('http://localhost:3000/api/storage/sync-settings')
      const { GET } = await import('@/app/api/storage/sync-settings/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.settings.autoSync).toBe(true)
      expect(data.settings.syncProvider).toBe('google_drive')
    })

    it('should update sync settings successfully', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'user@example.com' }
      }

      const mockUpdatedSettings = {
        id: 'sync-1',
        userId: 'user-123',
        autoSync: false,
        syncProvider: 'dropbox',
        syncFolderId: 'folder-new',
        syncFrequency: 'weekly',
      }

      vi.mocked(auth).mockResolvedValue(mockSession)
      vi.mocked(prisma.syncSettings.upsert).mockResolvedValue(mockUpdatedSettings)

      const request = new NextRequest('http://localhost:3000/api/storage/sync-settings', {
        method: 'PUT',
        body: JSON.stringify({
          autoSync: false,
          syncProvider: 'dropbox',
          syncFolderId: 'folder-new',
          syncFrequency: 'weekly',
        }),
      })

      const { PUT } = await import('@/app/api/storage/sync-settings/route')
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.settings.autoSync).toBe(false)
      expect(data.settings.syncProvider).toBe('dropbox')
    })
  })
})
      vi.mocked(auth).mockResolvedValue(null)

      const { GET } = await import('@/app/api/storage/accounts/route')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('Storage Provider Configuration', () => {
    it('should handle storage provider data', () => {
      const storageProviders = [
        {
          provider: 'google_drive',
          email: 'user@gmail.com',
          connected: true,
          hasValidToken: true,
        },
        {
          provider: 'dropbox',
          email: 'user@example.com',
          connected: true,
          hasValidToken: false,
        },
      ]

      expect(storageProviders).toHaveLength(2)
      expect(storageProviders[0].connected).toBe(true)
      expect(storageProviders[1].hasValidToken).toBe(false)
    })
  })
})