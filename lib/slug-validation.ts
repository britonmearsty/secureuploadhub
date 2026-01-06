/**
 * Slug validation utilities for portal URLs
 */

// Reserved slugs that should not be allowed
const RESERVED_SLUGS = [
  // System routes
  'api', 'admin', 'dashboard', 'auth', 'login', 'logout', 'signup', 'register',
  'settings', 'profile', 'account', 'billing', 'subscription', 'pricing',
  
  // Common pages
  'about', 'contact', 'help', 'support', 'faq', 'terms', 'privacy', 'legal',
  'blog', 'news', 'docs', 'documentation', 'guide', 'tutorial',
  
  // Technical terms
  'www', 'mail', 'email', 'ftp', 'ssh', 'ssl', 'tls', 'http', 'https',
  'cdn', 'static', 'assets', 'public', 'private', 'secure',
  
  // Common words that might cause confusion
  'home', 'index', 'main', 'root', 'default', 'test', 'demo', 'example',
  'upload', 'download', 'file', 'files', 'portal', 'portals',
  
  // Potentially problematic for routing
  'new', 'edit', 'delete', 'create', 'update', 'view', 'show', 'list',
  'search', 'filter', 'sort', 'page', 'pages', 'user', 'users',
  
  // Potentially offensive or problematic
  'admin', 'administrator', 'root', 'system', 'null', 'undefined',
  'error', '404', '500', 'forbidden', 'unauthorized',
  
  // Social media and common services
  'facebook', 'twitter', 'instagram', 'linkedin', 'youtube', 'google',
  'apple', 'microsoft', 'amazon', 'github', 'gitlab'
]

export interface SlugValidationResult {
  isValid: boolean
  error?: string
  sanitized?: string
}

/**
 * Validates a slug for portal URLs
 */
export function validateSlug(slug: string): SlugValidationResult {
  if (!slug || typeof slug !== 'string') {
    return {
      isValid: false,
      error: 'Slug is required'
    }
  }

  const trimmed = slug.trim()
  
  if (!trimmed) {
    return {
      isValid: false,
      error: 'Slug cannot be empty'
    }
  }

  // Check length constraints
  if (trimmed.length < 2) {
    return {
      isValid: false,
      error: 'Slug must be at least 2 characters long'
    }
  }

  if (trimmed.length > 50) {
    return {
      isValid: false,
      error: 'Slug cannot be longer than 50 characters'
    }
  }

  // Check for valid characters (lowercase letters, numbers, hyphens)
  const validPattern = /^[a-z0-9-]+$/
  if (!validPattern.test(trimmed)) {
    return {
      isValid: false,
      error: 'Slug can only contain lowercase letters, numbers, and hyphens'
    }
  }

  // Check that it doesn't start or end with hyphen
  if (trimmed.startsWith('-') || trimmed.endsWith('-')) {
    return {
      isValid: false,
      error: 'Slug cannot start or end with a hyphen'
    }
  }

  // Check for consecutive hyphens
  if (trimmed.includes('--')) {
    return {
      isValid: false,
      error: 'Slug cannot contain consecutive hyphens'
    }
  }

  // Check if it's a reserved slug
  if (RESERVED_SLUGS.includes(trimmed.toLowerCase())) {
    return {
      isValid: false,
      error: 'This slug is reserved and cannot be used'
    }
  }

  // Check for common problematic patterns
  if (/^\d+$/.test(trimmed) && trimmed.length > 1) {
    return {
      isValid: false,
      error: 'Slug cannot be only numbers'
    }
  }

  // Check for potentially confusing patterns
  if (trimmed.match(/^(www|api|cdn|mail|ftp)-/)) {
    return {
      isValid: false,
      error: 'Slug cannot start with technical prefixes like www-, api-, cdn-, etc.'
    }
  }

  return {
    isValid: true,
    sanitized: trimmed
  }
}

/**
 * Sanitizes a string to create a valid slug
 */
export function sanitizeSlug(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  return input
    .toLowerCase()
    .trim()
    // Remove special characters except hyphens and spaces (including slashes, backslashes, etc.)
    .replace(/[^a-z0-9\s-]/g, '')
    // Replace spaces and multiple hyphens with single hyphen
    .replace(/[\s-]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Limit length
    .slice(0, 50)
}

/**
 * Generates a unique slug suggestion based on input
 */
export function generateSlugSuggestion(input: string, existingSlugs: string[] = []): string {
  let baseSlug = sanitizeSlug(input)
  
  if (!baseSlug) {
    baseSlug = 'portal'
  }

  // If the base slug is valid and not taken, return it
  const baseValidation = validateSlug(baseSlug)
  if (baseValidation.isValid && !existingSlugs.includes(baseSlug)) {
    return baseSlug
  }

  // If base slug is reserved, try with number suffix
  let counter = 1
  let suggestion = baseSlug
  
  while (counter <= 999) {
    suggestion = `${baseSlug}-${counter}`
    const validation = validateSlug(suggestion)
    
    if (validation.isValid && !existingSlugs.includes(suggestion)) {
      return suggestion
    }
    
    counter++
  }

  // Fallback to timestamp-based slug
  const timestamp = Date.now().toString().slice(-6)
  return `portal-${timestamp}`
}