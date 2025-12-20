// Password hashing utilities for portal protection

import { createHash, randomBytes, timingSafeEqual } from "crypto"

/**
 * Hash a password using SHA-256 with salt
 * Note: For a production app, consider using bcrypt or argon2
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex")
  const hash = createHash("sha256")
    .update(salt + password)
    .digest("hex")
  return `${salt}:${hash}`
}

/**
 * Verify a password against a hash
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(":")
  if (!salt || !hash) return false
  
  const testHash = createHash("sha256")
    .update(salt + password)
    .digest("hex")
  
  // Use timing-safe comparison to prevent timing attacks
  try {
    return timingSafeEqual(Buffer.from(hash), Buffer.from(testHash))
  } catch {
    return false
  }
}

