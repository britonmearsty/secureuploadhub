import prisma from "@/lib/prisma"
import { headers } from "next/headers"

export type AdminAction = 
    | "user_created"
    | "user_updated"
    | "user_deleted"
    | "user_role_changed"
    | "portal_created"
    | "portal_updated"
    | "portal_deleted"
    | "subscription_created"
    | "subscription_cancelled"
    | "payment_processed"
    | "admin_login"
    | "settings_updated"
    | "system_health_check"
    | "data_export"
    | "audit_log_access"

export type AdminResource =
    | "user"
    | "portal"
    | "subscription"
    | "payment"
    | "settings"
    | "system"

export async function logAdminAction(
    action: AdminAction,
    resource: AdminResource,
    userId: string | null,
    userName: string | null,
    details?: string,
    status: "success" | "error" | "pending" = "success",
    changes?: { before?: Record<string, any>; after?: Record<string, any> }
) {
    try {
        const headersList = await headers()
        const ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown"
        const userAgent = headersList.get("user-agent") || "unknown"

        await prisma.systemLog.create({
            data: {
                action,
                resource,
                userId,
                userName,
                details,
                status,
                ipAddress,
                userAgent
            }
        })
    } catch (error) {
        console.error("Failed to log admin action:", error)
    }
}

export async function logUserCreated(userId: string, userName: string | null, adminId: string | null) {
    await logAdminAction(
        "user_created",
        "user",
        adminId,
        userName,
        `New user created: ${userId}`,
        "success"
    )
}

export async function logUserUpdated(userId: string, userName: string | null, adminId: string | null, changes?: any) {
    await logAdminAction(
        "user_updated",
        "user",
        adminId,
        userName,
        `User ${userId} updated`,
        "success",
        changes
    )
}

export async function logUserDeleted(userId: string, userEmail: string, adminId: string | null) {
    await logAdminAction(
        "user_deleted",
        "user",
        adminId,
        null,
        `User deleted: ${userEmail} (${userId})`,
        "success"
    )
}

export async function logUserRoleChanged(userId: string, oldRole: string, newRole: string, adminId: string | null) {
    await logAdminAction(
        "user_role_changed",
        "user",
        adminId,
        null,
        `User ${userId} role changed from ${oldRole} to ${newRole}`,
        "success",
        {
            before: { role: oldRole },
            after: { role: newRole }
        }
    )
}

export async function logPortalCreated(portalId: string, portalName: string, userId: string | null) {
    await logAdminAction(
        "portal_created",
        "portal",
        userId,
        null,
        `Portal created: ${portalName} (${portalId})`,
        "success"
    )
}

export async function logPortalUpdated(portalId: string, portalName: string, userId: string | null, changes?: any) {
    await logAdminAction(
        "portal_updated",
        "portal",
        userId,
        null,
        `Portal ${portalName} updated`,
        "success",
        changes
    )
}

export async function logPortalDeleted(portalId: string, portalName: string, userId: string | null) {
    await logAdminAction(
        "portal_deleted",
        "portal",
        userId,
        null,
        `Portal deleted: ${portalName} (${portalId})`,
        "success"
    )
}

export async function logSubscriptionCreated(subscriptionId: string, userId: string, planId: string) {
    await logAdminAction(
        "subscription_created",
        "subscription",
        userId,
        null,
        `Subscription created: ${subscriptionId} for plan ${planId}`,
        "success"
    )
}

export async function logSubscriptionCancelled(subscriptionId: string, userId: string, reason?: string) {
    await logAdminAction(
        "subscription_cancelled",
        "subscription",
        userId,
        null,
        `Subscription cancelled: ${subscriptionId} ${reason ? `- Reason: ${reason}` : ""}`,
        "success"
    )
}

export async function logDataExport(format: string, resource: string, recordCount: number, adminId: string | null) {
    await logAdminAction(
        "data_export",
        "system",
        adminId,
        null,
        `Data export: ${resource} (${recordCount} records) as ${format}`,
        "success"
    )
}

export async function logAdminLogin(userId: string, userName: string | null) {
    await logAdminAction(
        "admin_login",
        "system",
        userId,
        userName,
        `Admin login`,
        "success"
    )
}

export async function logSettingsUpdated(setting: string, oldValue: any, newValue: any, adminId: string | null) {
    await logAdminAction(
        "settings_updated",
        "settings",
        adminId,
        null,
        `Setting updated: ${setting}`,
        "success",
        {
            before: { [setting]: oldValue },
            after: { [setting]: newValue }
        }
    )
}

export async function logError(action: string, resource: string, error: string, adminId: string | null) {
    await logAdminAction(
        action as AdminAction,
        resource as AdminResource,
        adminId,
        null,
        `Error: ${error}`,
        "error"
    )
}
