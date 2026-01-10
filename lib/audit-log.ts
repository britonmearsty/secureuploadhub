import prisma from './prisma';

export interface AuditLogEntry {
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        details: entry.details || {},
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        createdAt: new Date()
      }
    });
  } catch (error) {
    console.error('Failed to create audit log entry:', error);
    // Don't throw error to avoid breaking the main operation
  }
}

export async function getAuditLogs(options: {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const {
    page = 1,
    limit = 50,
    userId,
    action,
    resource,
    startDate,
    endDate
  } = options;

  const skip = (page - 1) * limit;
  const where: any = {};

  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (resource) where.resource = resource;
  
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const [logs, totalCount] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            image: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip
    }),

    prisma.auditLog.count({ where })
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total: totalCount,
      pages: Math.ceil(totalCount / limit)
    }
  };
}

export async function getUserAuditLogs(userId: string, options: {
  page?: number;
  limit?: number;
  action?: string;
  resource?: string;
}) {
  return getAuditLogs({
    ...options,
    userId
  });
}

// Common audit actions
export const AUDIT_ACTIONS = {
  // User management
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  USER_STATUS_CHANGED: 'USER_STATUS_CHANGED',
  PASSWORD_RESET_INITIATED: 'PASSWORD_RESET_INITIATED',
  
  // Portal management
  PORTAL_CREATED: 'PORTAL_CREATED',
  PORTAL_UPDATED: 'PORTAL_UPDATED',
  PORTAL_DELETED: 'PORTAL_DELETED',
  PORTAL_TRANSFERRED: 'PORTAL_TRANSFERRED',
  PORTAL_STATUS_CHANGED: 'PORTAL_STATUS_CHANGED',
  
  // Billing management
  BILLING_PLAN_CREATED: 'BILLING_PLAN_CREATED',
  BILLING_PLAN_UPDATED: 'BILLING_PLAN_UPDATED',
  BILLING_PLAN_DELETED: 'BILLING_PLAN_DELETED',
  SUBSCRIPTION_CREATED: 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_UPDATED: 'SUBSCRIPTION_UPDATED',
  SUBSCRIPTION_CANCELLED: 'SUBSCRIPTION_CANCELLED',
  SUBSCRIPTION_MIGRATED: 'SUBSCRIPTION_MIGRATED',
  SUBSCRIPTION_GRACE_PERIOD_SET: 'SUBSCRIPTION_GRACE_PERIOD_SET',
  PAYMENT_ORPHANED: 'PAYMENT_ORPHANED',
  PAYMENT_AMOUNT_MISMATCH: 'PAYMENT_AMOUNT_MISMATCH',
  PAYMENT_AMOUNT_DISCREPANCY: 'PAYMENT_AMOUNT_DISCREPANCY',
  NOTIFICATION_SENT: 'NOTIFICATION_SENT',
  REFUND_PROCESSED: 'REFUND_PROCESSED',
  
  // Bulk operations
  BULK_USER_UPDATE: 'BULK_USER_UPDATE',
  BULK_USER_DELETE: 'BULK_USER_DELETE',
  BULK_ROLE_CHANGE: 'BULK_ROLE_CHANGE',
  BULK_STATUS_CHANGE: 'BULK_STATUS_CHANGE',
  
  // System operations
  SYSTEM_SETTING_CHANGED: 'SYSTEM_SETTING_CHANGED',
  EMAIL_TEMPLATE_UPDATED: 'EMAIL_TEMPLATE_UPDATED',
  
  // Security events
  ADMIN_LOGIN: 'ADMIN_LOGIN',
  ADMIN_LOGOUT: 'ADMIN_LOGOUT',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  UNAUTHORIZED_ACCESS_ATTEMPT: 'UNAUTHORIZED_ACCESS_ATTEMPT'
} as const;

export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS];