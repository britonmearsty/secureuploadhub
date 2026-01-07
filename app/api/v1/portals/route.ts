/**
 * Consolidated Portals API
 * Replaces scattered portal endpoints with a single resource-based API
 */

import { NextRequest } from "next/server"
import { withAuthAndLogging, withAuthValidationAndLogging, withQueryValidation, ApiResponse } from "@/lib/api/middleware"
import { schemas } from "@/lib/api/schemas"
import prisma from "@/lib/prisma"
import { hashPassword } from "@/lib/password"
import { invalidateCache, getUserDashboardKey, getUserPortalsKey, getUserUploadsKey, getUserStatsKey } from "@/lib/cache"
import { assertPortalLimit } from "@/lib/billing"
import { validatePortalCreation } from "@/lib/storage/portal-locking"
import { ensureStorageForPortalOperation } from "@/lib/storage/middleware-fallback"
import { validateSlug } from "@/lib/slug-validation"

/**
 * GET /api/v1/portals - List portals with filtering and pagination
 */
export const GET = withQueryValidation(schemas.query.portalFilters,
  withAuthAndLogging('PORTALS_API')(
    async (request: NextRequest, session: any, query: any) => {
      const { limit = 50, offset = 0, isActive, storageProvider } = query

      // Build where clause with filters
      const whereClause: any = {
        userId: session.user.id
      }

      if (typeof isActive === 'boolean') {
        whereClause.isActive = isActive
      }

      if (storageProvider) {
        whereClause.storageProvider = storageProvider
      }

      // Get total count for pagination
      const total = await prisma.uploadPortal.count({ where: whereClause })

      // Get portals with includes
      const portals = await prisma.uploadPortal.findMany({
        where: whereClause,
        include: {
          _count: {
            select: { uploads: true }
          },
          storageAccount: {
            select: {
              id: true,
              status: true,
              provider: true,
              displayName: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset
      })

      return ApiResponse.success({
        data: portals,
        pagination: {
          total,
          page: Math.floor(offset / limit) + 1,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      })
    }
  )
)

/**
 * POST /api/v1/portals - Create a new portal
 */
export const POST = withAuthValidationAndLogging('PORTAL_CREATE', schemas.portal.create)(
  async (request: NextRequest, session: any, data: any) => {
    const {
      name,
      slug,
      description,
      primaryColor,
      logoUrl,
      requireClientName,
      requireClientEmail,
      storageProvider,
      storageFolderId,
      storageFolderPath,
      storageAccountId,
      password,
      maxFileSize,
      allowedFileTypes,
      backgroundImageUrl,
      backgroundColor,
      cardBackgroundColor,
      textColor,
      welcomeMessage,
      submitButtonText,
      successMessage,
      useClientFolders,
    } = data

    // Validate slug format and content
    const slugValidation = validateSlug(slug)
    if (!slugValidation.isValid) {
      return ApiResponse.error('BAD_REQUEST', {
        message: slugValidation.error,
        code: "INVALID_SLUG"
      })
    }

    // Use the sanitized slug
    const validatedSlug = slugValidation.sanitized!

    // ENHANCED STORAGE ACCOUNT VALIDATION
    console.log(`🔍 PORTAL_CREATION: Starting validation for userId=${session.user.id}, provider=${storageProvider}`)
    
    try {
      const fallbackResult = await ensureStorageForPortalOperation(session.user.id, storageProvider)
      console.log(`🔍 PORTAL_CREATION: Fallback result:`, fallbackResult)
      
      if (fallbackResult.created > 0) {
        console.log(`✅ PORTAL_CREATION: Created ${fallbackResult.created} missing StorageAccount(s) for user ${session.user.id}`)
      }
      
      if (!fallbackResult.hasRequiredProvider) {
        console.log(`❌ PORTAL_CREATION: Missing required provider ${storageProvider}`)
        return ApiResponse.error('BAD_REQUEST', {
          message: `No active ${storageProvider === "google_drive" ? "Google Drive" : "Dropbox"} storage account available. Please connect your ${storageProvider === "google_drive" ? "Google Drive" : "Dropbox"} account first.`,
          code: "MISSING_STORAGE_PROVIDER",
          requiredProvider: storageProvider
        })
      }
      
      if (fallbackResult.errors.length > 0) {
        console.warn(`⚠️ PORTAL_CREATION: Storage fallback had errors:`, fallbackResult.errors)
      }
    } catch (error) {
      console.error("❌ PORTAL_CREATION: Failed to ensure StorageAccounts during portal creation:", error)
      // Continue with portal creation - the validation below will catch any remaining issues
    }

    const userStorageAccounts = await prisma.storageAccount.findMany({
      where: { userId: session.user.id },
      select: { id: true, provider: true, status: true, userId: true }
    })

    const portalCreationRules = validatePortalCreation(
      session.user.id,
      storageProvider,
      storageAccountId || null,
      userStorageAccounts
    )

    if (!portalCreationRules.canCreate) {
      return ApiResponse.error('BAD_REQUEST', {
        message: portalCreationRules.reason || "Cannot create portal with current storage configuration"
      })
    }

    // Use validated storage account ID
    const validatedStorageAccountId = portalCreationRules.requiredStorageAccountId || null

    // Check if slug is already taken
    const existingPortal = await prisma.uploadPortal.findUnique({
      where: { slug: validatedSlug }
    })

    if (existingPortal) {
      return ApiResponse.error('BAD_REQUEST', {
        message: "This URL slug is already taken. Please choose a different one.",
        code: "SLUG_TAKEN"
      })
    }

    // Enforce plan portal limits
    try {
      await assertPortalLimit(session.user.id)
    } catch (err: any) {
      return ApiResponse.error('FORBIDDEN', err.message || "Portal limit reached")
    }

    // Hash password if provided
    const passwordHash = password ? hashPassword(password) : null

    const portal = await prisma.uploadPortal.create({
      data: {
        userId: session.user.id,
        name,
        slug: validatedSlug,
        description: description || null,
        primaryColor: primaryColor || "#4F46E5",
        logoUrl: logoUrl || null,
        requireClientName: requireClientName ?? true,
        requireClientEmail: requireClientEmail ?? false,
        storageProvider: storageProvider,
        storageFolderId: storageFolderId || null,
        storageFolderPath: storageFolderPath || null,
        storageAccountId: validatedStorageAccountId,
        passwordHash,
        isActive: true,
        maxFileSize: maxFileSize,
        allowedFileTypes: allowedFileTypes,
        backgroundImageUrl: backgroundImageUrl || null,
        backgroundColor: backgroundColor || null,
        cardBackgroundColor: cardBackgroundColor || "#ffffff",
        textColor: textColor || "#0f172a",
        welcomeMessage: welcomeMessage || null,
        submitButtonText: submitButtonText || "Initialize Transfer",
        successMessage: successMessage || "Transmission Verified",
        useClientFolders: useClientFolders || false,
      }
    })

    // Invalidate all relevant caches since new portal was created
    await Promise.all([
      invalidateCache(getUserDashboardKey(session.user.id)),
      invalidateCache(getUserPortalsKey(session.user.id)),
      invalidateCache(getUserUploadsKey(session.user.id)),
      invalidateCache(getUserStatsKey(session.user.id))
    ])

    return ApiResponse.success(portal, 201)
  }
)