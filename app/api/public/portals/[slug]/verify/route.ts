import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { verifyPassword } from "@/lib/password"
import { SignJWT } from "jose"

const JWT_SECRET = new TextEncoder().encode(
  process.env.PORTAL_PASSWORD_SECRET || process.env.NEXTAUTH_SECRET || "default-secret-change-me"
)

// POST /api/public/portals/[slug]/verify - Verify portal password
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const { password } = await request.json()

    if (!password) {
      return NextResponse.json({ error: "Password required" }, { status: 400 })
    }

    const portal = await prisma.uploadPortal.findUnique({
      where: { slug },
      select: {
        id: true,
        passwordHash: true,
        isActive: true,
      },
    })

    if (!portal || !portal.isActive) {
      return NextResponse.json({ error: "Portal not found" }, { status: 404 })
    }

    if (!portal.passwordHash) {
      // No password set, access granted
      return NextResponse.json({ success: true })
    }

    const isValid = verifyPassword(password, portal.passwordHash)

    if (!isValid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 })
    }

    // Generate a short-lived access token for this portal
    const token = await new SignJWT({ portalId: portal.id })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(JWT_SECRET)

    return NextResponse.json({ 
      success: true,
      token,
    })
  } catch (error) {
    console.error("Error verifying portal password:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

