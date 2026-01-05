import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { hashPassword } from "@/lib/password"
import { invalidateCache, getUserDashboardKey, getUserPortalsKey, getUserUploadsKey, getUserStatsKey } from "@/lib/cache"
import { assertPortalLimit } from "@/lib/billing"
import { validatePortalCreation } from "@/lib/storage/portal-locking"
import { StorageAccountStatus } from "@prisma/client"

// GET /api/portals - List all portals for the current user
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const portals = await prisma.uploadPortal.findMany({
      where: { userId: session.user.id },
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
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json(portals)
  } catch (error) {
    console.error("Error fetching portals:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/portals - Create a new portal
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
      storageAccountId, // NEW: Optional storage account selection
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
    } = await request.json()

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 })
    }

    // Validate storage provider
    const validProviders = ["google_drive", "dropbox"]
    const provider = validProviders.includes(storageProvider) ? storageProvider : "google_drive"

    // Normalize max file size (incoming in bytes) and cap to 5GB to avoid runaway values
    const DEFAULT_MAX_BYTES = 500 * 1024 * 1024
    const MAX_ALLOWED_BYTES = 5 * 1024 * 1024 * 1024
    const safeMaxFileSize =
      typeof maxFileSize === "number" && maxFileSize > 0
        ? Math.min(maxFileSize, MAX_ALLOWED_BYTES)
        : DEFAULT_MAX_BYTES

    // Sanitize allowed file types to strings
    const safeAllowedFileTypes = Array.isArray(allowedFileTypes)
      ? allowedFileTypes.filter((t) => typeof t === "string" && t.length > 0)
      : []

    // If using cloud storage, verify user has connected account and validate storage account selection
    const oauthProvider = provider === "google_drive" ? "google" : "dropbox"
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: oauthProvider,
      },
    })

    if (!account) {
      return NextResponse.json({
        error: `Please connect your ${provider === "google_drive" ? "Google" : "Dropbox"} account first`
      }, { status: 400 })
    }

    // STORAGE ACCOUNT VALIDATION - Validate portal creation with storage account
    const userStorageAccounts = await prisma.storageAccount.findMany({
      where: { userId: session.user.id },
      select: { id: true, provider: true, status: true, userId: true }
    })

    const portalCreationRules = validatePortalCreation(
      session.user.id,
      provider,
      storageAccountId || null,
      userStorageAccounts
    )

    if (!portalCreationRules.canCreate) {
      return NextResponse.json({
        error: portalCreationRules.reason || "Cannot create portal with current storage configuration"
      }, { status: 400 })
    }

    // Use validated storage account ID
    const validatedStorageAccountId = portalCreationRules.requiredStorageAccountId || null

    // Check if slug is already taken
    const existingPortal = await prisma.uploadPortal.findUnique({
      where: { slug }
    })

    if (existingPortal) {
      return NextResponse.json({ error: "This URL slug is already taken" }, { status: 400 })
    }

    // Enforce plan portal limits
    try {
      await assertPortalLimit(session.user.id)
    } catch (err: any) {
      return NextResponse.json({ error: err.message || "Portal limit reached" }, { status: 403 })
    }

    // Hash password if provided
    const passwordHash = password ? hashPassword(password) : null

    const portal = await prisma.uploadPortal.create({
      data: {
        userId: session.user.id,
        name,
        slug,
        description: description || null,
        primaryColor: primaryColor || "#4F46E5",
        logoUrl: logoUrl || null,
        requireClientName: requireClientName ?? true,
        requireClientEmail: requireClientEmail ?? false,
        storageProvider: provider,
        storageFolderId: storageFolderId || null,
        storageFolderPath: storageFolderPath || null,
        storageAccountId: validatedStorageAccountId, // CRITICAL: Bind portal to storage account
        passwordHash,
        isActive: true,
        maxFileSize: safeMaxFileSize,
        allowedFileTypes: safeAllowedFileTypes,
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

    return NextResponse.json(portal)
  } catch (error) {
    console.error("Error creating portal:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
