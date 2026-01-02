import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  default: {
    newsletterSubscriber: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/email-templates', () => ({
  sendWelcomeEmail: vi.fn(),
}))

import prisma from '@/lib/prisma'
import { sendWelcomeEmail } from '@/lib/email-templates'

describe('API Route: /api/newsletter/subscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /api/newsletter/subscribe', () => {
    it('should return 400 when email is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/newsletter/subscribe', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const { POST } = await import('@/app/api/newsletter/subscribe/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Email is required')
    })

    it('should return 400 when email format is invalid', async () => {
      const request = new NextRequest('http://localhost:3000/api/newsletter/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email: 'invalid-email' }),
      })

      const { POST } = await import('@/app/api/newsletter/subscribe/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid email format')
    })

    it('should successfully subscribe new email', async () => {
      const mockSubscriber = {
        id: 'sub-123',
        email: 'user@example.com',
        isActive: true,
        subscribedAt: new Date(),
      }

      vi.mocked(prisma.newsletterSubscriber.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.newsletterSubscriber.create).mockResolvedValue(mockSubscriber)
      vi.mocked(sendWelcomeEmail).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost:3000/api/newsletter/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email: 'user@example.com' }),
      })

      const { POST } = await import('@/app/api/newsletter/subscribe/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Successfully subscribed to newsletter')
      expect(data.subscriber.email).toBe('user@example.com')
      expect(prisma.newsletterSubscriber.create).toHaveBeenCalledWith({
        data: {
          email: 'user@example.com',
          isActive: true,
        },
      })
      expect(sendWelcomeEmail).toHaveBeenCalledWith('user@example.com')
    })

    it('should reactivate existing inactive subscriber', async () => {
      const existingSubscriber = {
        id: 'sub-123',
        email: 'user@example.com',
        isActive: false,
        subscribedAt: new Date(),
      }

      const updatedSubscriber = {
        ...existingSubscriber,
        isActive: true,
      }

      vi.mocked(prisma.newsletterSubscriber.findUnique).mockResolvedValue(existingSubscriber)
      vi.mocked(prisma.newsletterSubscriber.update).mockResolvedValue(updatedSubscriber)

      const request = new NextRequest('http://localhost:3000/api/newsletter/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email: 'user@example.com' }),
      })

      const { POST } = await import('@/app/api/newsletter/subscribe/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Subscription reactivated')
      expect(prisma.newsletterSubscriber.update).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
        data: { isActive: true },
      })
    })

    it('should return 409 when email is already subscribed', async () => {
      const existingSubscriber = {
        id: 'sub-123',
        email: 'user@example.com',
        isActive: true,
        subscribedAt: new Date(),
      }

      vi.mocked(prisma.newsletterSubscriber.findUnique).mockResolvedValue(existingSubscriber)

      const request = new NextRequest('http://localhost:3000/api/newsletter/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email: 'user@example.com' }),
      })

      const { POST } = await import('@/app/api/newsletter/subscribe/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('Email is already subscribed')
    })

    it('should handle database errors gracefully', async () => {
      vi.mocked(prisma.newsletterSubscriber.findUnique).mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/newsletter/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email: 'user@example.com' }),
      })

      const { POST } = await import('@/app/api/newsletter/subscribe/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('POST /api/newsletter/unsubscribe', () => {
    it('should successfully unsubscribe existing subscriber', async () => {
      const existingSubscriber = {
        id: 'sub-123',
        email: 'user@example.com',
        isActive: true,
        subscribedAt: new Date(),
      }

      const updatedSubscriber = {
        ...existingSubscriber,
        isActive: false,
      }

      vi.mocked(prisma.newsletterSubscriber.findUnique).mockResolvedValue(existingSubscriber)
      vi.mocked(prisma.newsletterSubscriber.update).mockResolvedValue(updatedSubscriber)

      const request = new NextRequest('http://localhost:3000/api/newsletter/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ email: 'user@example.com' }),
      })

      const { POST } = await import('@/app/api/newsletter/unsubscribe/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Successfully unsubscribed from newsletter')
      expect(prisma.newsletterSubscriber.update).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
        data: { isActive: false },
      })
    })

    it('should return 404 when email is not found', async () => {
      vi.mocked(prisma.newsletterSubscriber.findUnique).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/newsletter/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ email: 'nonexistent@example.com' }),
      })

      const { POST } = await import('@/app/api/newsletter/unsubscribe/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Email not found in newsletter')
    })
  })
})

describe('API Route: /api/newsletter/subscribe (Extended)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/newsletter/subscribe', () => {
    it('should return 400 when email format is invalid', async () => {
      const request = new NextRequest('http://localhost:3000/api/newsletter/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email: 'invalid-email' }),
      })

      const { POST } = await import('@/app/api/newsletter/subscribe/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid email format')
    })

    it('should return 409 when email is already subscribed', async () => {
      const mockExistingSubscriber = {
        id: 'sub-1',
        email: 'test@example.com',
        status: 'subscribed',
        subscribedAt: new Date(),
      }

      vi.mocked(prisma.newsletterSubscriber.findUnique).mockResolvedValue(mockExistingSubscriber as any)

      const request = new NextRequest('http://localhost:3000/api/newsletter/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      })

      const { POST } = await import('@/app/api/newsletter/subscribe/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('Email is already subscribed')
      expect(prisma.newsletterSubscriber.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      })
    })

    it('should resubscribe previously unsubscribed email', async () => {
      const mockUnsubscribedSubscriber = {
        id: 'sub-1',
        email: 'test@example.com',
        status: 'unsubscribed',
        subscribedAt: new Date(),
        unsubscribedAt: new Date(),
      }
      const mockUpdatedSubscriber = {
        ...mockUnsubscribedSubscriber,
        status: 'subscribed',
        subscribedAt: new Date(),
        unsubscribedAt: null,
      }

      vi.mocked(prisma.newsletterSubscriber.findUnique).mockResolvedValue(mockUnsubscribedSubscriber as any)
      vi.mocked(prisma.newsletterSubscriber.update).mockResolvedValue(mockUpdatedSubscriber as any)
      vi.mocked(sendWelcomeEmail).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost:3000/api/newsletter/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      })

      const { POST } = await import('@/app/api/newsletter/subscribe/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Successfully subscribed to newsletter')
      expect(data.subscriber).toEqual(mockUpdatedSubscriber)
      expect(prisma.newsletterSubscriber.update).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        data: {
          status: 'subscribed',
          subscribedAt: expect.any(Date),
          unsubscribedAt: null,
        },
      })
      expect(sendWelcomeEmail).toHaveBeenCalledWith('test@example.com')
    })

    it('should create new subscription for new email', async () => {
      const mockNewSubscriber = {
        id: 'sub-1',
        email: 'new@example.com',
        status: 'subscribed',
        subscribedAt: new Date(),
        unsubscribedAt: null,
      }

      vi.mocked(prisma.newsletterSubscriber.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.newsletterSubscriber.create).mockResolvedValue(mockNewSubscriber as any)
      vi.mocked(sendWelcomeEmail).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost:3000/api/newsletter/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email: 'new@example.com' }),
      })

      const { POST } = await import('@/app/api/newsletter/subscribe/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Successfully subscribed to newsletter')
      expect(data.subscriber).toEqual(mockNewSubscriber)
      expect(prisma.newsletterSubscriber.create).toHaveBeenCalledWith({
        data: {
          email: 'new@example.com',
          status: 'subscribed',
          subscribedAt: expect.any(Date),
        },
      })
      expect(sendWelcomeEmail).toHaveBeenCalledWith('new@example.com')
    })

    it('should handle email sending errors gracefully', async () => {
      const mockNewSubscriber = {
        id: 'sub-1',
        email: 'new@example.com',
        status: 'subscribed',
        subscribedAt: new Date(),
      }

      vi.mocked(prisma.newsletterSubscriber.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.newsletterSubscriber.create).mockResolvedValue(mockNewSubscriber as any)
      vi.mocked(sendWelcomeEmail).mockRejectedValue(new Error('Email sending failed'))

      const request = new NextRequest('http://localhost:3000/api/newsletter/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email: 'new@example.com' }),
      })

      const { POST } = await import('@/app/api/newsletter/subscribe/route')
      const response = await POST(request)
      const data = await response.json()

      // Should still succeed even if email fails
      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Successfully subscribed to newsletter')
    })

    it('should handle database errors', async () => {
      vi.mocked(prisma.newsletterSubscriber.findUnique).mockRejectedValue(new Error('DB Error'))

      const request = new NextRequest('http://localhost:3000/api/newsletter/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      })

      const { POST } = await import('@/app/api/newsletter/subscribe/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should normalize email to lowercase', async () => {
      const mockNewSubscriber = {
        id: 'sub-1',
        email: 'test@example.com',
        status: 'subscribed',
        subscribedAt: new Date(),
      }

      vi.mocked(prisma.newsletterSubscriber.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.newsletterSubscriber.create).mockResolvedValue(mockNewSubscriber as any)
      vi.mocked(sendWelcomeEmail).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost:3000/api/newsletter/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email: 'TEST@EXAMPLE.COM' }),
      })

      const { POST } = await import('@/app/api/newsletter/subscribe/route')
      const response = await POST(request)

      expect(response.status).toBe(201)
      expect(prisma.newsletterSubscriber.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      })
      expect(prisma.newsletterSubscriber.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          status: 'subscribed',
          subscribedAt: expect.any(Date),
        },
      })
    })

    it('should handle malformed JSON in request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/newsletter/subscribe', {
        method: 'POST',
        body: 'invalid-json',
      })

      const { POST } = await import('@/app/api/newsletter/subscribe/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})

describe('API Route: /api/newsletter/unsubscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/newsletter/unsubscribe', () => {
    it('should return 400 when email is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/newsletter/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const { POST } = await import('@/app/api/newsletter/unsubscribe/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Email is required')
    })

    it('should return 400 when email format is invalid', async () => {
      const request = new NextRequest('http://localhost:3000/api/newsletter/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ email: 'invalid-email' }),
      })

      const { POST } = await import('@/app/api/newsletter/unsubscribe/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid email format')
    })

    it('should return 404 when email is not found', async () => {
      vi.mocked(prisma.newsletterSubscriber.findUnique).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/newsletter/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ email: 'notfound@example.com' }),
      })

      const { POST } = await import('@/app/api/newsletter/unsubscribe/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Email not found in our records')
      expect(prisma.newsletterSubscriber.findUnique).toHaveBeenCalledWith({
        where: { email: 'notfound@example.com' },
      })
    })

    it('should unsubscribe email successfully', async () => {
      const mockSubscriber = {
        id: 'sub-1',
        email: 'test@example.com',
        status: 'subscribed',
        subscribedAt: new Date(),
        unsubscribedAt: null,
      }
      const mockUpdatedSubscriber = {
        ...mockSubscriber,
        status: 'unsubscribed',
        unsubscribedAt: new Date(),
      }

      vi.mocked(prisma.newsletterSubscriber.findUnique).mockResolvedValue(mockSubscriber as any)
      vi.mocked(prisma.newsletterSubscriber.update).mockResolvedValue(mockUpdatedSubscriber as any)

      const request = new NextRequest('http://localhost:3000/api/newsletter/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      })

      const { POST } = await import('@/app/api/newsletter/unsubscribe/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Successfully unsubscribed from newsletter')
      expect(prisma.newsletterSubscriber.update).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        data: {
          status: 'unsubscribed',
          unsubscribedAt: expect.any(Date),
        },
      })
    })

    it('should handle already unsubscribed email', async () => {
      const mockUnsubscribedSubscriber = {
        id: 'sub-1',
        email: 'test@example.com',
        status: 'unsubscribed',
        subscribedAt: new Date(),
        unsubscribedAt: new Date(),
      }

      vi.mocked(prisma.newsletterSubscriber.findUnique).mockResolvedValue(mockUnsubscribedSubscriber as any)
      vi.mocked(prisma.newsletterSubscriber.update).mockResolvedValue(mockUnsubscribedSubscriber as any)

      const request = new NextRequest('http://localhost:3000/api/newsletter/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      })

      const { POST } = await import('@/app/api/newsletter/unsubscribe/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Successfully unsubscribed from newsletter')
      // Should still update the record
      expect(prisma.newsletterSubscriber.update).toHaveBeenCalled()
    })

    it('should normalize email to lowercase', async () => {
      const mockSubscriber = {
        id: 'sub-1',
        email: 'test@example.com',
        status: 'subscribed',
      }

      vi.mocked(prisma.newsletterSubscriber.findUnique).mockResolvedValue(mockSubscriber as any)
      vi.mocked(prisma.newsletterSubscriber.update).mockResolvedValue({
        ...mockSubscriber,
        status: 'unsubscribed',
      } as any)

      const request = new NextRequest('http://localhost:3000/api/newsletter/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ email: 'TEST@EXAMPLE.COM' }),
      })

      const { POST } = await import('@/app/api/newsletter/unsubscribe/route')
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(prisma.newsletterSubscriber.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      })
      expect(prisma.newsletterSubscriber.update).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        data: {
          status: 'unsubscribed',
          unsubscribedAt: expect.any(Date),
        },
      })
    })

    it('should handle database errors', async () => {
      vi.mocked(prisma.newsletterSubscriber.findUnique).mockRejectedValue(new Error('DB Error'))

      const request = new NextRequest('http://localhost:3000/api/newsletter/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      })

      const { POST } = await import('@/app/api/newsletter/unsubscribe/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should handle malformed JSON in request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/newsletter/unsubscribe', {
        method: 'POST',
        body: 'invalid-json',
      })

      const { POST } = await import('@/app/api/newsletter/unsubscribe/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})