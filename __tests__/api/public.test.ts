import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  default: {
    uploadPortal: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/password', () => ({
  verifyPassword: vi.fn(),
}))

vi.mock('jose', () => ({
  SignJWT: vi.fn().mockImplementation(() => ({
    setProtectedHeader: vi.fn().mockReturnThis(),
    setExpirationTime: vi.fn().mockReturnThis(),
    sign: vi.fn().mockResolvedValue('mock-jwt-token'),
  })),
}))

import prisma from '@/lib/prisma'
import { verifyPassword } from '@/lib/password'
import { SignJWT } from 'jose'

describe('API Route: /api/public/portals/[slug]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/public/portals/[slug]', () => {
    it('should return 404 when portal is not found', async () => {
      vi.mocked(prisma.uploadPortal.findUnique).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/public/portals/nonexistent')
      const { GET } = await import('@/app/api/public/portals/[slug]/route')
      const response = await GET(request, { params: { slug: 'nonexistent' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Portal not found')
      expect(prisma.uploadPortal.findUnique).toHaveBeenCalledWith({
        where: { slug: 'nonexistent' },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          isActive: true,
          isPasswordProtected: true,
          allowedFileTypes: true,
          maxFileSize: true,
          maxFiles: true,
          requireClientName: true,
          requireClientEmail: true,
          customMessage: true,
          expiresAt: true,
        },
      })
    })

    it('should return 404 when portal is inactive', async () => {
      const inactivePortal = {
        id: 'portal-123',
        name: 'Test Portal',
        slug: 'test-portal',
        isActive: false,
        isPasswordProtected: false,
      }

      vi.mocked(prisma.uploadPortal.findUnique).mockResolvedValue(inactivePortal)

      const request = new NextRequest('http://localhost:3000/api/public/portals/test-portal')
      const { GET } = await import('@/app/api/public/portals/[slug]/route')
      const response = await GET(request, { params: { slug: 'test-portal' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Portal not found')
    })

    it('should return 410 when portal is expired', async () => {
      const expiredPortal = {
        id: 'portal-123',
        name: 'Test Portal',
        slug: 'test-portal',
        isActive: true,
        isPasswordProtected: false,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired yesterday
      }

      vi.mocked(prisma.uploadPortal.findUnique).mockResolvedValue(expiredPortal)

      const request = new NextRequest('http://localhost:3000/api/public/portals/test-portal')
      const { GET } = await import('@/app/api/public/portals/[slug]/route')
      const response = await GET(request, { params: { slug: 'test-portal' } })
      const data = await response.json()

      expect(response.status).toBe(410)
      expect(data.error).toBe('Portal has expired')
    })

    it('should return portal details for valid public portal', async () => {
      const validPortal = {
        id: 'portal-123',
        name: 'Test Portal',
        slug: 'test-portal',
        description: 'Upload your files here',
        isActive: true,
        isPasswordProtected: false,
        allowedFileTypes: ['image/*', 'application/pdf'],
        maxFileSize: 10485760, // 10MB
        maxFiles: 5,
        requireClientName: true,
        requireClientEmail: false,
        customMessage: 'Please upload your documents',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days
      }

      vi.mocked(prisma.uploadPortal.findUnique).mockResolvedValue(validPortal)

      const request = new NextRequest('http://localhost:3000/api/public/portals/test-portal')
      const { GET } = await import('@/app/api/public/portals/[slug]/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.portal.name).toBe('Test Portal')
      expect(data.portal.slug).toBe('test-portal')
      expect(data.portal.isPasswordProtected).toBe(false)
      expect(data.portal.maxFileSize).toBe(10485760)
      expect(data.portal.requireClientName).toBe(true)
    })

    it('should not expose sensitive fields for password-protected portals', async () => {
      const protectedPortal = {
        id: 'portal-123',
        name: 'Protected Portal',
        slug: 'protected-portal',
        isActive: true,
        isPasswordProtected: true,
        allowedFileTypes: ['image/*'],
        maxFileSize: 5242880,
      }

      vi.mocked(prisma.uploadPortal.findUnique).mockResolvedValue(protectedPortal)

      const request = new NextRequest('http://localhost:3000/api/public/portals/protected-portal')
      const { GET } = await import('@/app/api/public/portals/[slug]/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.portal.name).toBe('Protected Portal')
      expect(data.portal.isPasswordProtected).toBe(true)
      // Should not expose detailed settings until password is verified
      expect(data.portal.allowedFileTypes).toBeUndefined()
      expect(data.portal.maxFileSize).toBeUndefined()
    })
  })

  describe('POST /api/public/portals/[slug]/verify', () => {
    it('should return 400 when password is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/public/portals/test-portal/verify', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const { POST } = await import('@/app/api/public/portals/[slug]/verify/route')
      const response = await POST(request, { params: { slug: 'test-portal' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Password is required')
    })

    it('should return 404 when portal is not found', async () => {
      vi.mocked(prisma.uploadPortal.findUnique).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/public/portals/nonexistent/verify', {
        method: 'POST',
        body: JSON.stringify({ password: 'test123' }),
      })

      const { POST } = await import('@/app/api/public/portals/nonexistent/verify/route')
      const response = await POST(request, { params: { slug: 'nonexistent' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Portal not found')
    })

    it('should return 401 when password is incorrect', async () => {
      const protectedPortal = {
        id: 'portal-123',
        name: 'Protected Portal',
        slug: 'protected-portal',
        isActive: true,
        isPasswordProtected: true,
        password: 'hashed-correct-password',
      }

      vi.mocked(prisma.uploadPortal.findUnique).mockResolvedValue(protectedPortal)
      vi.mocked(verifyPassword).mockResolvedValue(false)

      const request = new NextRequest('http://localhost:3000/api/public/portals/protected-portal/verify', {
        method: 'POST',
        body: JSON.stringify({ password: 'wrong-password' }),
      })

      const { POST } = await import('@/app/api/public/portals/protected-portal/verify/route')
      const response = await POST(request, { params: { slug: 'protected-portal' } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid password')
      expect(verifyPassword).toHaveBeenCalledWith('wrong-password', 'hashed-correct-password')
    })

    it('should return JWT token when password is correct', async () => {
      const protectedPortal = {
        id: 'portal-123',
        name: 'Protected Portal',
        slug: 'protected-portal',
        isActive: true,
        isPasswordProtected: true,
        password: 'hashed-correct-password',
        allowedFileTypes: ['image/*', 'application/pdf'],
        maxFileSize: 10485760,
        maxFiles: 3,
        requireClientName: true,
        requireClientEmail: true,
      }

      vi.mocked(prisma.uploadPortal.findUnique).mockResolvedValue(protectedPortal)
      vi.mocked(verifyPassword).mockResolvedValue(true)

      const mockJWT = {
        setProtectedHeader: vi.fn().mockReturnThis(),
        setExpirationTime: vi.fn().mockReturnThis(),
        sign: vi.fn().mockResolvedValue('mock-jwt-token'),
      }
      vi.mocked(SignJWT).mockReturnValue(mockJWT)

      const request = new NextRequest('http://localhost:3000/api/public/portals/protected-portal/verify', {
        method: 'POST',
        body: JSON.stringify({ password: 'correct-password' }),
      })

      const { POST } = await import('@/app/api/public/portals/protected-portal/verify/route')
      const response = await POST(request, { params: { slug: 'protected-portal' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.token).toBe('mock-jwt-token')
      expect(data.portal.id).toBe('portal-123')
      expect(data.portal.allowedFileTypes).toEqual(['image/*', 'application/pdf'])
      expect(verifyPassword).toHaveBeenCalledWith('correct-password', 'hashed-correct-password')
      expect(SignJWT).toHaveBeenCalledWith({ portalId: 'portal-123' })
    })

    it('should handle non-password-protected portals', async () => {
      const publicPortal = {
        id: 'portal-123',
        name: 'Public Portal',
        slug: 'public-portal',
        isActive: true,
        isPasswordProtected: false,
      }

      vi.mocked(prisma.uploadPortal.findUnique).mockResolvedValue(publicPortal)

      const request = new NextRequest('http://localhost:3000/api/public/portals/public-portal/verify', {
        method: 'POST',
        body: JSON.stringify({ password: 'any-password' }),
      })

      const { POST } = await import('@/app/api/public/portals/public-portal/verify/route')
      const response = await POST(request, { params: { slug: 'public-portal' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Portal is not password protected')
    })
  })

  describe('GET /api/public/health', () => {
    it('should return health status', async () => {
      const request = new NextRequest('http://localhost:3000/api/public/health')
      const { GET } = await import('@/app/api/public/health/route')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('healthy')
      expect(data.timestamp).toBeDefined()
      expect(data.version).toBeDefined()
    })
  })

  describe('Portal Not Found', () => {
    it('should return 404 for non-existent portal', async () => {
      vi.mocked(prisma.uploadPortal.findUnique).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/public/portals/test-portal')
      const { GET } = await import('@/app/api/public/portals/[slug]/route')
      const response = await GET(request, { params: { slug: 'test-portal' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Portal not found')
    })

    it('should return portal configuration without password hash', async () => {
      const mockPortal = {
        id: 'portal-1',
        name: 'Test Portal',
        slug: 'test-portal',
        description: 'A test portal',
        isActive: true,
        primaryColor: '#000000',
        secondaryColor: '#ffffff',
        logoUrl: 'https://example.com/logo.png',
        requireClientName: true,
        requireClientEmail: true,
        maxFileSize: 10485760, // 10MB
        allowedFileTypes: ['image/jpeg', 'image/png', 'text/plain'],
        passwordHash: 'hashed-password', // Should be excluded
        customMessage: 'Welcome to our portal',
        thankYouMessage: 'Thank you for your upload',
        emailNotifications: true,
        allowMultipleFiles: false,
        showUploadProgress: true,
        autoDeleteAfter: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(prisma.uploadPortal.findUnique).mockResolvedValue(mockPortal as any)

      const request = new NextRequest('http://localhost:3000/api/public/portals/test-portal')
      const { GET } = await import('@/app/api/public/portals/[slug]/route')
      const response = await GET(request, { params: { slug: 'test-portal' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        id: 'portal-1',
        name: 'Test Portal',
        slug: 'test-portal',
        description: 'A test portal',
        isActive: true,
        primaryColor: '#000000',
        secondaryColor: '#ffffff',
        logoUrl: 'https://example.com/logo.png',
        requireClientName: true,
        requireClientEmail: true,
        maxFileSize: 10485760,
        allowedFileTypes: ['image/jpeg', 'image/png', 'text/plain'],
        customMessage: 'Welcome to our portal',
        thankYouMessage: 'Thank you for your upload',
        emailNotifications: true,
        allowMultipleFiles: false,
        showUploadProgress: true,
        autoDeleteAfter: null,
        createdAt: mockPortal.createdAt,
        updatedAt: mockPortal.updatedAt,
        hasPassword: true, // Should indicate password exists without exposing hash
      })
      expect(data.passwordHash).toBeUndefined()
    })

    it('should indicate when portal has no password', async () => {
      const mockPortal = {
        id: 'portal-1',
        name: 'Test Portal',
        slug: 'test-portal',
        isActive: true,
        passwordHash: null,
        primaryColor: '#000000',
        requireClientName: false,
        requireClientEmail: false,
        maxFileSize: 5242880,
        allowedFileTypes: ['*'],
      }

      vi.mocked(prisma.uploadPortal.findUnique).mockResolvedValue(mockPortal as any)

      const request = new NextRequest('http://localhost:3000/api/public/portals/test-portal')
      const { GET } = await import('@/app/api/public/portals/[slug]/route')
      const response = await GET(request, { params: { slug: 'test-portal' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.hasPassword).toBe(false)
      expect(data.passwordHash).toBeUndefined()
    })

    it('should handle database errors', async () => {
      vi.mocked(prisma.uploadPortal.findUnique).mockRejectedValue(new Error('DB Error'))

      const request = new NextRequest('http://localhost:3000/api/public/portals/test-portal')
      const { GET } = await import('@/app/api/public/portals/[slug]/route')
      const response = await GET(request, { params: { slug: 'test-portal' } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})

describe('API Route: /api/public/portals/[slug]/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/public/portals/[slug]/verify', () => {
    it('should return 404 when portal is not found', async () => {
      vi.mocked(prisma.uploadPortal.findUnique).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/public/portals/nonexistent/verify', {
        method: 'POST',
        body: JSON.stringify({ password: 'test123' }),
      })

      const { POST } = await import('@/app/api/public/portals/[slug]/verify/route')
      const response = await POST(request, { params: { slug: 'nonexistent' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Portal not found')
    })

    it('should return 404 when portal is not active', async () => {
      const mockPortal = {
        id: 'portal-1',
        slug: 'test-portal',
        isActive: false,
        passwordHash: 'hashed-password',
      }

      vi.mocked(prisma.uploadPortal.findUnique).mockResolvedValue(mockPortal as any)

      const request = new NextRequest('http://localhost:3000/api/public/portals/test-portal/verify', {
        method: 'POST',
        body: JSON.stringify({ password: 'test123' }),
      })

      const { POST } = await import('@/app/api/public/portals/[slug]/verify/route')
      const response = await POST(request, { params: { slug: 'test-portal' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Portal not found')
    })

    it('should return 400 when portal has no password protection', async () => {
      const mockPortal = {
        id: 'portal-1',
        slug: 'test-portal',
        isActive: true,
        passwordHash: null,
      }

      vi.mocked(prisma.uploadPortal.findUnique).mockResolvedValue(mockPortal as any)

      const request = new NextRequest('http://localhost:3000/api/public/portals/test-portal/verify', {
        method: 'POST',
        body: JSON.stringify({ password: 'test123' }),
      })

      const { POST } = await import('@/app/api/public/portals/[slug]/verify/route')
      const response = await POST(request, { params: { slug: 'test-portal' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Portal is not password protected')
    })

    it('should return 400 when password is missing', async () => {
      const mockPortal = {
        id: 'portal-1',
        slug: 'test-portal',
        isActive: true,
        passwordHash: 'hashed-password',
      }

      vi.mocked(prisma.uploadPortal.findUnique).mockResolvedValue(mockPortal as any)

      const request = new NextRequest('http://localhost:3000/api/public/portals/test-portal/verify', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const { POST } = await import('@/app/api/public/portals/[slug]/verify/route')
      const response = await POST(request, { params: { slug: 'test-portal' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Password is required')
    })

    it('should return 401 when password is incorrect', async () => {
      const mockPortal = {
        id: 'portal-1',
        slug: 'test-portal',
        isActive: true,
        passwordHash: 'hashed-password',
      }

      vi.mocked(prisma.uploadPortal.findUnique).mockResolvedValue(mockPortal as any)
      vi.mocked(verifyPassword).mockResolvedValue(false)

      const request = new NextRequest('http://localhost:3000/api/public/portals/test-portal/verify', {
        method: 'POST',
        body: JSON.stringify({ password: 'wrong-password' }),
      })

      const { POST } = await import('@/app/api/public/portals/[slug]/verify/route')
      const response = await POST(request, { params: { slug: 'test-portal' } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid password')
      expect(verifyPassword).toHaveBeenCalledWith('wrong-password', 'hashed-password')
    })

    it('should return JWT token when password is correct', async () => {
      const mockPortal = {
        id: 'portal-1',
        slug: 'test-portal',
        isActive: true,
        passwordHash: 'hashed-password',
      }

      vi.mocked(prisma.uploadPortal.findUnique).mockResolvedValue(mockPortal as any)
      vi.mocked(verifyPassword).mockResolvedValue(true)

      const request = new NextRequest('http://localhost:3000/api/public/portals/test-portal/verify', {
        method: 'POST',
        body: JSON.stringify({ password: 'correct-password' }),
      })

      const { POST } = await import('@/app/api/public/portals/[slug]/verify/route')
      const response = await POST(request, { params: { slug: 'test-portal' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.token).toBe('mock-jwt-token')
      expect(data.expiresIn).toBe('24h')
      expect(verifyPassword).toHaveBeenCalledWith('correct-password', 'hashed-password')
      
      // Verify JWT creation
      expect(SignJWT).toHaveBeenCalledWith({ portalId: 'portal-1' })
      const mockJWT = vi.mocked(SignJWT).mock.results[0].value
      expect(mockJWT.setProtectedHeader).toHaveBeenCalledWith({ alg: 'HS256' })
      expect(mockJWT.setExpirationTime).toHaveBeenCalledWith('24h')
      expect(mockJWT.sign).toHaveBeenCalled()
    })

    it('should handle password verification errors', async () => {
      const mockPortal = {
        id: 'portal-1',
        slug: 'test-portal',
        isActive: true,
        passwordHash: 'hashed-password',
      }

      vi.mocked(prisma.uploadPortal.findUnique).mockResolvedValue(mockPortal as any)
      vi.mocked(verifyPassword).mockRejectedValue(new Error('Verification error'))

      const request = new NextRequest('http://localhost:3000/api/public/portals/test-portal/verify', {
        method: 'POST',
        body: JSON.stringify({ password: 'test123' }),
      })

      const { POST } = await import('@/app/api/public/portals/[slug]/verify/route')
      const response = await POST(request, { params: { slug: 'test-portal' } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should handle JWT signing errors', async () => {
      const mockPortal = {
        id: 'portal-1',
        slug: 'test-portal',
        isActive: true,
        passwordHash: 'hashed-password',
      }

      vi.mocked(prisma.uploadPortal.findUnique).mockResolvedValue(mockPortal as any)
      vi.mocked(verifyPassword).mockResolvedValue(true)
      
      // Mock JWT signing failure
      const mockJWT = {
        setProtectedHeader: vi.fn().mockReturnThis(),
        setExpirationTime: vi.fn().mockReturnThis(),
        sign: vi.fn().mockRejectedValue(new Error('JWT signing failed')),
      }
      vi.mocked(SignJWT).mockImplementation(() => mockJWT as any)

      const request = new NextRequest('http://localhost:3000/api/public/portals/test-portal/verify', {
        method: 'POST',
        body: JSON.stringify({ password: 'correct-password' }),
      })

      const { POST } = await import('@/app/api/public/portals/[slug]/verify/route')
      const response = await POST(request, { params: { slug: 'test-portal' } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should handle malformed JSON in request body', async () => {
      const mockPortal = {
        id: 'portal-1',
        slug: 'test-portal',
        isActive: true,
        passwordHash: 'hashed-password',
      }

      vi.mocked(prisma.uploadPortal.findUnique).mockResolvedValue(mockPortal as any)

      const request = new NextRequest('http://localhost:3000/api/public/portals/test-portal/verify', {
        method: 'POST',
        body: 'invalid-json',
      })

      const { POST } = await import('@/app/api/public/portals/[slug]/verify/route')
      const response = await POST(request, { params: { slug: 'test-portal' } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})