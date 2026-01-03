#!/usr/bin/env tsx

import 'dotenv/config'
import prisma from '../lib/prisma'
import { createAuditLog, AUDIT_ACTIONS } from '../lib/audit-log'

async function seedAuditLogs() {
  try {
    console.log('🌱 Seeding audit logs...')

    // Get an admin user to create audit logs for
    const adminUser = await prisma.user.findFirst({
      where: { role: 'admin' },
      select: { id: true, email: true }
    })

    if (!adminUser) {
      console.error('❌ No admin user found. Please create an admin user first.')
      process.exit(1)
    }

    console.log(`📧 Using admin user: ${adminUser.email}`)

    // Get some regular users for audit log targets
    const users = await prisma.user.findMany({
      where: { role: 'user' },
      select: { id: true, email: true, name: true },
      take: 3
    })

    // Get some portals for audit log targets
    const portals = await prisma.uploadPortal.findMany({
      select: { id: true, name: true, slug: true },
      take: 2
    })

    // Get some billing plans for audit log targets
    const plans = await prisma.billingPlan.findMany({
      select: { id: true, name: true, price: true },
      take: 2
    })

    const auditLogs = []

    // Create user management audit logs
    if (users.length > 0) {
      auditLogs.push({
        userId: adminUser.id,
        action: AUDIT_ACTIONS.USER_ROLE_CHANGED,
        resource: 'user',
        resourceId: users[0].id,
        details: {
          oldRole: 'user',
          newRole: 'admin',
          targetUserEmail: users[0].email,
          targetUserName: users[0].name
        }
      })

      if (users.length > 1) {
        auditLogs.push({
          userId: adminUser.id,
          action: AUDIT_ACTIONS.USER_STATUS_CHANGED,
          resource: 'user',
          resourceId: users[1].id,
          details: {
            oldStatus: 'active',
            newStatus: 'suspended',
            targetUserEmail: users[1].email,
            targetUserName: users[1].name
          }
        })
      }
    }

    // Create portal management audit logs
    if (portals.length > 0) {
      auditLogs.push({
        userId: adminUser.id,
        action: AUDIT_ACTIONS.PORTAL_DELETED,
        resource: 'portal',
        resourceId: portals[0].id,
        details: {
          portalName: portals[0].name,
          portalSlug: portals[0].slug,
          uploadsDeleted: 5,
          ownerEmail: 'user@example.com'
        }
      })
    }

    // Create billing management audit logs
    if (plans.length > 0) {
      auditLogs.push({
        userId: adminUser.id,
        action: AUDIT_ACTIONS.BILLING_PLAN_CREATED,
        resource: 'billing_plan',
        resourceId: plans[0].id,
        details: {
          planName: plans[0].name,
          price: plans[0].price,
          currency: 'USD',
          maxPortals: 10,
          maxStorageGB: 100,
          maxUploadsMonth: 1000
        }
      })

      if (plans.length > 1) {
        auditLogs.push({
          userId: adminUser.id,
          action: AUDIT_ACTIONS.BILLING_PLAN_UPDATED,
          resource: 'billing_plan',
          resourceId: plans[1].id,
          details: {
            planName: plans[1].name,
            oldPrice: plans[1].price,
            newPrice: plans[1].price + 500,
            currency: 'USD'
          }
        })
      }
    }

    // Create system audit logs
    auditLogs.push({
      userId: adminUser.id,
      action: AUDIT_ACTIONS.ADMIN_LOGIN,
      resource: 'system',
      resourceId: 'admin-session',
      details: {
        loginMethod: 'google',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    auditLogs.push({
      userId: adminUser.id,
      action: AUDIT_ACTIONS.SYSTEM_SETTING_CHANGED,
      resource: 'system',
      resourceId: 'email-notifications',
      details: {
        setting: 'email_notifications_enabled',
        oldValue: false,
        newValue: true
      }
    })

    // Create bulk operation audit logs
    if (users.length > 2) {
      auditLogs.push({
        userId: adminUser.id,
        action: AUDIT_ACTIONS.BULK_STATUS_CHANGE,
        resource: 'user',
        resourceId: 'bulk-operation',
        details: {
          action: 'activate',
          userCount: 3,
          userIds: users.map(u => u.id).slice(0, 3),
          oldStatus: 'suspended',
          newStatus: 'active'
        }
      })
    }

    // Insert audit logs with different timestamps
    for (let i = 0; i < auditLogs.length; i++) {
      const log = auditLogs[i]
      const createdAt = new Date(Date.now() - (auditLogs.length - i) * 24 * 60 * 60 * 1000) // Spread over days
      
      await prisma.auditLog.create({
        data: {
          ...log,
          createdAt,
          ipAddress: '192.168.1.' + (100 + i),
          userAgent: 'Mozilla/5.0 (Admin Dashboard)'
        }
      })
    }

    console.log(`✅ Created ${auditLogs.length} audit log entries`)
    console.log('📊 Audit logs seeded successfully!')

  } catch (error) {
    console.error('❌ Error seeding audit logs:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seedAuditLogs()