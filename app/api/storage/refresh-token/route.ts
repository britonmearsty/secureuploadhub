import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"

// POST /api/storage/refresh-token - Refresh expired OAuth tokens
export async function POST(request: Request) {
  console.log('🔄 TOKEN_REFRESH: Request received')
  
  try {
    const session = await auth()
    console.log('🔄 TOKEN_REFRESH: Session check:', { 
      hasSession: !!session, 
      userId: session?.user?.id 
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { provider } = await request.json()
    console.log('🔄 TOKEN_REFRESH: Request data:', { provider })

    if (!provider || !["google", "dropbox"].includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 })
    }

    // Find the OAuth account
    const oauthAccount = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider
      }
    })

    if (!oauthAccount) {
      return NextResponse.json({ 
        error: "OAuth account not found. Please reconnect your account." 
      }, { status: 404 })
    }

    if (!oauthAccount.refresh_token) {
      return NextResponse.json({ 
        error: "No refresh token available. Please reconnect your account." 
      }, { status: 400 })
    }

    // Refresh the token based on provider
    let refreshResult: { success: boolean; access_token?: string; expires_at?: number; refresh_token?: string; error?: string }
    
    if (provider === 'google') {
      refreshResult = await refreshGoogleToken(oauthAccount.refresh_token)
    } else if (provider === 'dropbox') {
      refreshResult = await refreshDropboxToken(oauthAccount.refresh_token)
    } else {
      return NextResponse.json({ error: "Unsupported provider" }, { status: 400 })
    }

    if (!refreshResult.success) {
      console.log('❌ TOKEN_REFRESH: Failed to refresh token:', refreshResult.error)
      return NextResponse.json({ 
        error: refreshResult.error || "Failed to refresh token" 
      }, { status: 500 })
    }

    // Update the OAuth account with new tokens
    await prisma.account.update({
      where: {
        provider_providerAccountId: {
          provider: oauthAccount.provider,
          providerAccountId: oauthAccount.providerAccountId
        }
      },
      data: {
        access_token: refreshResult.access_token,
        expires_at: refreshResult.expires_at,
        refresh_token: refreshResult.refresh_token || oauthAccount.refresh_token, // Keep old refresh token if new one not provided
        updatedAt: new Date()
      }
    })

    console.log('✅ TOKEN_REFRESH: Successfully refreshed token')

    return NextResponse.json({ 
      success: true, 
      message: `${provider} token refreshed successfully`,
      expires_at: refreshResult.expires_at
    })

  } catch (error) {
    console.error("❌ TOKEN_REFRESH: Error refreshing token:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function refreshGoogleToken(refreshToken: string) {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Google token refresh failed:', errorData)
      return {
        success: false,
        error: errorData.error_description || 'Failed to refresh Google token'
      }
    }

    const data = await response.json()
    
    return {
      success: true,
      access_token: data.access_token,
      expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
      refresh_token: data.refresh_token // Google may provide a new refresh token
    }
  } catch (error) {
    console.error('Error refreshing Google token:', error)
    return {
      success: false,
      error: 'Network error while refreshing token'
    }
  }
}

async function refreshDropboxToken(refreshToken: string) {
  try {
    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.DROPBOX_CLIENT_ID!,
        client_secret: process.env.DROPBOX_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Dropbox token refresh failed:', errorData)
      return {
        success: false,
        error: errorData.error_description || 'Failed to refresh Dropbox token'
      }
    }

    const data = await response.json()
    
    return {
      success: true,
      access_token: data.access_token,
      expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
      refresh_token: data.refresh_token || refreshToken // Dropbox may not provide new refresh token
    }
  } catch (error) {
    console.error('Error refreshing Dropbox token:', error)
    return {
      success: false,
      error: 'Network error while refreshing token'
    }
  }
}