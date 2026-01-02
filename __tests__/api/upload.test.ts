import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/upload/route'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  default: {
    uploadPortal: {
      findUnique: vi.fn(),
    },
    fileUpload: {
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/storage', () => ({
  uploadToCloudStorage: vi.fn(),
}))

vi.mock('@/lib/email-templates', () => ({
  sendUploadNotification: vi.fn(),
}))

vi.mock('jose', () => ({
  jwtVerify: vi.fn(),
}))

vi.mock('@/lib/cache', () => ({
  invalidateCache: vi.fn(),
  getUserDashboardKey: vi.fn(),
  getUserUploadsKey: vi.fn(),
  getUserStatsKey: vi.fn(),
  getUserPortalsKey: vi.fn(),
}))

vi.mock('@/lib/billing', () => ({
  assertUploadAllowed: vi.fn(),
}))

vi.mock('@/lib/scanner', () => ({
  scanFile: vi.fn(),
}))

import prisma from '@/lib/prisma'
import { uploadToCloudStorage } from '@/lib/storage'
import { sendUploadNotification } from '@/lib/email-templates'
import { jwtVerify } from 'jose'
import { invalidateCache } from '@/lib/cache'
import { assertUploadAllowed } from '@/lib/billing'
import { scanFile } from '@/lib/scanner'

describe('API Route: /api/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /api/upload', () => {
    const createMockFile = (name: string, size: number, type: string) => {
      const file = new File(['test content'], name, { type })
      Object.defineProperty(file, 'size', { value: size })
      return file
    }

    const createMockFormData = (overrides: Record<string, any> = {}) => {
      const formData = new FormData()
      formData.append('file', createMockFile('test.txt', 1024, 'text/plain'))
      formData.append('portalId', 'portal-1')
      formData.append('clientName', 'John Doe')
      formData.append('clientEmail', 'john@example.com')
      
      Object.entries(overrides).forEach(([key, value]) => {
        if (value === null) {
          formData.delete(key)
        } else {
          formData.set(key, value)
        }
      })
      
      return formData
    }

    const mockPortal = {
      id: 'portal-1',
      name: 'Test Portal',
      slug: 'test-portal',
      isActive: true,
      passwordHash: null,
      requireClientName: true,
      requireClientEmail: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedFileTypes: ['text/plain', 'image/jpeg'],
      storageProvider: 'google',
      storageConfig: { folderId: 'folder-123' },
      user: {
        id: 'user-1',
        email: 'user@example.com',
      },
    }

    it('should return 400 when file is missing', async () => {
      const formData = createMockFormData({ file: null })
      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('File and portal ID are required')
    })

    it('should return 400 when portalId is missing', async () => {
      const formData = createMockFormData({ portalId: null })
      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('File and portal ID are required')
    })

    it('should return 404 when portal is not found', async () => {
      vi.mocked(prisma.uploadPortal.findUnique).mockResolvedValue(null)

      const formData = createMockFormData()
      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Portal not found')
    })

    it('should return 400 when portal is not active', async () => {
      vi.mocked(prisma.uploadPortal.findUnique).mockResolvedValue({
        ...mockPortal,
        isActive: false,
      } as any)

      const formData = createMockFormData()
      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Portal is not active')
    })

    it('should return 401 when password is required but not provided', async () => {
      vi.mocked(prisma.uploadPortal.findUnique).mockResolvedValue({
        ...mockPortal,
        passwordHash: 'hashed-password',
      } as any)

      const formData = createMockFormData()
      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Password verification required')
    })

    it('should return 401 when password token is invalid', async () => {
      vi.mocked(prisma.uploadPortal.findUnique).mockResolvedValue({
        ...mockPortal,
        passwordHash: 'hashed-password',
      } as any)
      vi.mocked(jwtVerify).mockRejectedValue(new Error('Invalid token'))

      const formData = createMockFormData({ token: 'invalid-token' })
      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid or expired password token')
    })

    it('should return 400 when client name is required but missing', async () => {
      vi.mocked(prisma.uploadPortal.findUnique).mockResolvedValue(mockPortal as any)

      const formData = createMockFormData({ clientName: null })
      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Client name is required')
    })

    it('should return 400 when client email is required but missing', async () => {
      vi.mocked(prisma.uploadPortal.findUnique).mockResolvedValue(mockPortal as any)

      const formData = createMockFormData({ clientEmail: null })
      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Client email is required')
    })

    it('should return 400 when file size exceeds limit', async () => {
      vi.mocked(prisma.uploadPortal.findUnique).mockResolvedValue(mockPortal as any)

      const largeFile = createMockFile('large.txt', 20 * 1024 * 1024, 'text/plain') // 20MB
      const formData = createMockFormData({ file: largeFile })
      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('File size exceeds limit')
    })

    it('should return 400 when file type is not allowed', async () => {
      vi.mocked(prisma.uploadPortal.findUnique).mockResolvedValue(mockPortal as any)

      const invalidFile = createMockFile('test.exe', 1024, 'application/x-executable')
      const formData = createMockFormData({ file: invalidFile })
      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('File type not allowed')
    })

    it('should check upload limits', async () => {
      vi.mocked(prisma.uploadPortal.findUnique).mockResolvedValue(mockPortal as any)
      vi.mocked(assertUploadAllowed).mockRejectedValue(new Error('Upload limit exceeded'))

      const formData = createMockFormData()
      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Upload limit exceeded')
    })

    it('should scan file for malware', async () => {
      vi.mocked(prisma.uploadPortal.findUnique).mockResolvedValue(mockPortal as any)
      vi.mocked(assertUploadAllowed).mockResolvedValue(undefined)
      vi.mocked(scanFile).mockResolvedValue({ 
        isClean: false, 
        threat: 'Malware.Test',
        scanTime: 100 
      })

      const formData = createMockFormData()
      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('File contains malware: Malware.Test')
    })

    it('should upload file successfully', async () => {
      const mockUploadResult = {
        fileId: 'file-123',
        downloadUrl: 'https://example.com/file-123',
        provider: 'google',
      }
      const mockCreatedUpload = {
        id: 'upload-1',
        fileName: 'test.txt',
        fileSize: 1024,
        mimeType: 'text/plain',
        status: 'completed',
      }

      vi.mocked(prisma.uploadPortal.findUnique).mockResolvedValue(mockPortal as any)
      vi.mocked(assertUploadAllowed).mockResolvedValue(undefined)
      vi.mocked(scanFile).mockResolvedValue({ 
        isClean: true, 
        threat: null,
        scanTime: 50 
      })
      vi.mocked(uploadToCloudStorage).mockResolvedValue(mockUploadResult as any)
      vi.mocked(prisma.fileUpload.create).mockResolvedValue(mockCreatedUpload as any)
      vi.mocked(sendUploadNotification).mockResolvedValue(undefined)

      const formData = createMockFormData()
      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockCreatedUpload)
      expect(uploadToCloudStorage).toHaveBeenCalled()
      expect(prisma.fileUpload.create).toHaveBeenCalled()
      expect(sendUploadNotification).toHaveBeenCalled()
      expect(invalidateCache).toHaveBeenCalledTimes(4)
    })

    it('should handle upload errors gracefully', async () => {
      vi.mocked(prisma.uploadPortal.findUnique).mockResolvedValue(mockPortal as any)
      vi.mocked(assertUploadAllowed).mockResolvedValue(undefined)
      vi.mocked(scanFile).mockResolvedValue({ 
        isClean: true, 
        threat: null,
        scanTime: 50 
      })
      vi.mocked(uploadToCloudStorage).mockRejectedValue(new Error('Storage error'))

      const formData = createMockFormData()
      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Upload failed')
    })

    it('should skip malware scan for safe file types', async () => {
      const mockPortalWithSafeTypes = {
        ...mockPortal,
        allowedFileTypes: ['image/jpeg', 'image/png'],
      }
      const mockUploadResult = {
        fileId: 'file-123',
        downloadUrl: 'https://example.com/file-123',
        provider: 'google',
      }
      const mockCreatedUpload = {
        id: 'upload-1',
        fileName: 'image.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        status: 'completed',
      }

      vi.mocked(prisma.uploadPortal.findUnique).mockResolvedValue(mockPortalWithSafeTypes as any)
      vi.mocked(assertUploadAllowed).mockResolvedValue(undefined)
      vi.mocked(uploadToCloudStorage).mockResolvedValue(mockUploadResult as any)
      vi.mocked(prisma.fileUpload.create).mockResolvedValue(mockCreatedUpload as any)

      const imageFile = createMockFile('image.jpg', 1024, 'image/jpeg')
      const formData = createMockFormData({ file: imageFile })
      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(scanFile).not.toHaveBeenCalled() // Should skip scan for safe types
    })
  })
})