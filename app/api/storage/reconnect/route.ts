import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { StorageAccountStatus } from "@/lib/storage/account-states"

// POST /api/storage/reconnect - Reconnect storage access for existing OAuth account
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { provider } = await request.json()

    if (!provider || !["google", "dropbox"].includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 })
    }

    // Check if user has OAuth account for this provider
    const oauthAccount = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider
      }
    })

    if (!oauthAccount) {
      return NextResponse.json({ 
        error: `No ${provider} account found. Please connect your ${provider} account first.`,
        needsOAuth: true
      }, { status: 400 })
    }

    // Reactivate storage accounts for this provider
    const storageProvider = provider === "google" ? "GOOGLE_DRIVE" : "DROPBOX"
    const result = await prisma.storageAccount.updateMany({
      where: {
        userId: session.user.id,
        provider: storageProvider,
        providerAccountId: oauthAccount.providerAccountId
      },
      data: {
        status: StorageAccountStatus.ACTIVE,
        lastError: null,
        updatedAt: new Date()
      }
    })

    if (result.count === 0) {
      // Create storage account if it doesn't exist
      await prisma.storageAccount.create({
        data: {
          userId: session.user.id,
          provider: storageProvider,
          providerAccountId: oauthAccount.providerAccountId,
          status: StorageAccountStatus.ACTIVE,
          displayName: `${provider} Account`,
          email: null, // Will be populated by next API call
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: `${provider} storage access has been reactivated. Your files should now be accessible.`
    })
  } catch (error) {
    console.error("Error reconnecting storage:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}