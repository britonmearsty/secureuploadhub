import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { SingleEmailStorageManager } from "@/lib/storage/single-email-manager"

/**
 * Admin endpoint to fix Google Drive OAuth issues
 * POST /api/admin/fix-google-oauth
 * 
 * Body: { userEmail?: string, fixAll?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    // Check if user is admin (you might want to adjust this check)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // For now, allow any authenticated user - you can add admin role check here
    // if (session.user.role !== 'admin') {
    //   return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    // }
    
    const body = await request.json()
    const { userEmail, fixAll } = body
    
    console.log(`🔧 GOOGLE_OAUTH_FIX: Starting fix - userEmail: ${userEmail}, fixAll: ${fixAll}`)
    
    if (fixAll) {
      // Fix all users with Google OAuth issues
      const results = await fixAllGoogleOAuthIssues()
      return NextResponse.json({
        success: true,
        message: `Fixed ${results.fixedUsers}/${results.totalUsers} users`,
        details: results
      })
    } else if (userEmail) {
      // Fix specific user
      const result = await fixUserGoogleOAuth(userEmail)
      return NextResponse.json(result)
    } else {
      return NextResponse.json({
        error: "Either userEmail or fixAll=true must be provided"
      }, { status: 400 })
    }
    
  } catch (error) {
    console.error("❌ GOOGLE_OAUTH_FIX: API error:", error)
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

/**
 * Fix Google OAuth issues for a specific user
 */
async function fixUserGoogleOAuth(userEmail: string) {
  console.log(`🔧 Fixing Google OAuth for user: ${userEmail}`)
  
  try {
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: {
        accounts: {
          where: { provider: 'google' }
        },
        storageAccounts: {
          where: { provider: 'google_drive' }
        }
      }
    })
    
    if (!user) {
      return {
        success: false,
        error: `User ${userEmail} not found`
      }
    }
    
    const googleOAuth = user.accounts[0]
    const googleStorage = user.storageAccounts[0]
    
    console.log(`📊 User analysis:`, {
      hasGoogleOAuth: !!googleOAuth,
      hasGoogleStorage: !!googleStorage,
      storageStatus: googleStorage?.status
    })
    
    if (!googleOAuth) {
      return {
        success: false,
        error: `User ${userEmail} has no Google OAuth account`
      }
    }
    
    if (googleStorage && googleStorage.status === 'ACTIVE') {
      return {
        success: true,
        message: `User ${userEmail} already has active Google Drive storage`,
        alreadyFixed: true
      }
    }
    
    // Attempt to create/fix StorageAccount
    const result = await SingleEmailStorageManager.autoDetectStorageAccount(
      user.id,
      'google',
      googleOAuth.providerAccountId
    )
    
    if (result.success) {
      console.log(`✅ Successfully fixed Google OAuth for ${userEmail}`)
      return {
        success: true,
        message: `Successfully ${result.created ? 'created' : 'updated'} Google Drive storage for ${userEmail}`,
        storageAccountId: result.storageAccountId,
        created: result.created,
        updated: result.updated
      }
    } else {
      console.log(`❌ Failed to fix Google OAuth for ${userEmail}: ${result.error}`)
      return {
        success: false,
        error: `Failed to fix Google Drive storage: ${result.error}`
      }
    }
    
  } catch (error) {
    console.error(`❌ Exception fixing Google OAuth for ${userEmail}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Fix Google OAuth issues for all users
 */
async function fixAllGoogleOAuthIssues() {
  console.log(`🔧 Starting comprehensive Google OAuth fix...`)
  
  const results = {
    totalUsers: 0,
    fixedUsers: 0,
    failedUsers: 0,
    alreadyFixed: 0,
    issues: [] as Array<{
      userEmail: string
      issue: string
      fixed: boolean
      error?: string
    }>
  }
  
  try {
    // Find all users with Google OAuth accounts
    const usersWithGoogleOAuth = await prisma.user.findMany({
      where: {
        accounts: {
          some: {
            provider: 'google'
          }
        }
      },
      include: {
        accounts: {
          where: { provider: 'google' }
        },
        storageAccounts: {
          where: { provider: 'google_drive' }
        }
      }
    })
    
    results.totalUsers = usersWithGoogleOAuth.length
    console.log(`📊 Found ${results.totalUsers} users with Google OAuth`)
    
    for (const user of usersWithGoogleOAuth) {
      const googleOAuth = user.accounts[0]
      const googleStorage = user.storageAccounts[0]
      
      let issue: string | null = null
      
      if (!googleStorage) {
        issue = "MISSING_STORAGE_ACCOUNT"
      } else if (googleStorage.status !== 'ACTIVE') {
        issue = "INACTIVE_STORAGE_ACCOUNT"
      }
      
      if (issue) {
        console.log(`🔍 User ${user.email} has issue: ${issue}`)
        
        try {
          const fixResult = await SingleEmailStorageManager.autoDetectStorageAccount(
            user.id,
            'google',
            googleOAuth.providerAccountId
          )
          
          if (fixResult.success) {
            results.fixedUsers++
            console.log(`✅ Fixed ${user.email}`)
          } else {
            results.failedUsers++
            console.log(`❌ Failed to fix ${user.email}: ${fixResult.error}`)
          }
          
          results.issues.push({
            userEmail: user.email,
            issue,
            fixed: fixResult.success,
            error: fixResult.error
          })
          
        } catch (error) {
          results.failedUsers++
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.log(`❌ Exception fixing ${user.email}: ${errorMessage}`)
          
          results.issues.push({
            userEmail: user.email,
            issue,
            fixed: false,
            error: errorMessage
          })
        }
      } else {
        results.alreadyFixed++
      }
    }
    
    console.log(`🎯 Fix complete! Fixed: ${results.fixedUsers}, Failed: ${results.failedUsers}, Already fixed: ${results.alreadyFixed}`)
    return results
    
  } catch (error) {
    console.error(`❌ Comprehensive fix failed:`, error)
    throw error
  }
}

/**
 * GET endpoint to check Google OAuth status
 */
export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // Get statistics about Google OAuth issues
    const totalGoogleOAuth = await prisma.account.count({
      where: { provider: 'google' }
    })
    
    const totalGoogleStorage = await prisma.storageAccount.count({
      where: { provider: 'google_drive' }
    })
    
    const activeGoogleStorage = await prisma.storageAccount.count({
      where: { 
        provider: 'google_drive',
        status: 'ACTIVE'
      }
    })
    
    const usersWithIssues = await prisma.user.findMany({
      where: {
        accounts: {
          some: { provider: 'google' }
        },
        storageAccounts: {
          none: { 
            provider: 'google_drive',
            status: 'ACTIVE'
          }
        }
      },
      select: {
        email: true,
        accounts: {
          where: { provider: 'google' },
          select: { providerAccountId: true }
        }
      }
    })
    
    return NextResponse.json({
      statistics: {
        totalGoogleOAuth,
        totalGoogleStorage,
        activeGoogleStorage,
        conversionRate: totalGoogleOAuth > 0 ? (activeGoogleStorage / totalGoogleOAuth * 100).toFixed(1) + '%' : '0%',
        usersWithIssues: usersWithIssues.length
      },
      usersWithIssues: usersWithIssues.map(user => ({
        email: user.email,
        providerAccountId: user.accounts[0]?.providerAccountId
      }))
    })
    
  } catch (error) {
    console.error("❌ GET Google OAuth status error:", error)
    return NextResponse.json({
      error: "Internal server error"
    }, { status: 500 })
  }
}