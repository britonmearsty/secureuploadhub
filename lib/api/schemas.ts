/**
 * API Validation Schemas
 * Centralized Zod schemas for API request/response validation
 */

import { z } from "zod"

/**
 * Common field validations
 */
export const commonSchemas = {
  id: z.string().cuid(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  email: z.string().email(),
  url: z.string().url().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color").optional(),
  provider: z.enum(["google_drive", "dropbox"]),
  storageAccountStatus: z.enum(["ACTIVE", "INACTIVE", "DISCONNECTED", "ERROR"])
}

/**
 * Query parameter schemas
 */
/**
 * Query parameter schemas
 */
const paginationSchema = z.object({
  limit: z.string().transform(val => parseInt(val) || 50).pipe(z.number().min(1).max(100)),
  offset: z.string().transform(val => parseInt(val) || 0).pipe(z.number().min(0)),
  page: z.string().transform(val => parseInt(val) || 1).pipe(z.number().min(1))
}).partial()

export const querySchemas = {
  pagination: paginationSchema,
  
  uploadFilters: z.object({
    portalId: commonSchemas.id.optional(),
    clientEmail: commonSchemas.email.optional(),
    status: z.enum(["pending", "completed", "failed"]).optional(),
    storageProvider: commonSchemas.provider.optional()
  }).merge(paginationSchema),
  
  portalFilters: z.object({
    isActive: z.string().transform(val => val === 'true').pipe(z.boolean()).optional(),
    storageProvider: commonSchemas.provider.optional()
  }).merge(paginationSchema)
}

/**
 * Portal schemas
 */
export const portalSchemas = {
  create: z.object({
    name: z.string().min(1).max(100),
    slug: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    primaryColor: commonSchemas.color.default("#4F46E5"),
    logoUrl: commonSchemas.url,
    requireClientName: z.boolean().default(true),
    requireClientEmail: z.boolean().default(false),
    storageProvider: commonSchemas.provider.default("google_drive"),
    storageFolderId: z.string().optional(),
    storageFolderPath: z.string().optional(),
    storageAccountId: commonSchemas.id.optional(),
    password: z.string().min(4).max(100).optional(),
    maxFileSize: z.number().min(1024).max(5 * 1024 * 1024 * 1024).default(500 * 1024 * 1024), // 500MB default, 5GB max
    allowedFileTypes: z.array(z.string()).default([]),
    backgroundImageUrl: commonSchemas.url,
    backgroundColor: commonSchemas.color,
    cardBackgroundColor: commonSchemas.color.default("#ffffff"),
    textColor: commonSchemas.color.default("#0f172a"),
    welcomeMessage: z.string().max(500).optional(),
    submitButtonText: z.string().max(50).default("Initialize Transfer"),
    successMessage: z.string().max(200).default("Transmission Verified"),
    useClientFolders: z.boolean().default(false)
  }),
  
  update: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    primaryColor: commonSchemas.color.optional(),
    logoUrl: commonSchemas.url,
    requireClientName: z.boolean().optional(),
    requireClientEmail: z.boolean().optional(),
    password: z.string().min(4).max(100).optional(),
    maxFileSize: z.number().min(1024).max(5 * 1024 * 1024 * 1024).optional(),
    allowedFileTypes: z.array(z.string()).optional(),
    backgroundImageUrl: commonSchemas.url,
    backgroundColor: commonSchemas.color.optional(),
    cardBackgroundColor: commonSchemas.color.optional(),
    textColor: commonSchemas.color.optional(),
    welcomeMessage: z.string().max(500).optional(),
    submitButtonText: z.string().max(50).optional(),
    successMessage: z.string().max(200).optional(),
    useClientFolders: z.boolean().optional(),
    isActive: z.boolean().optional()
  }),
  
  activate: z.object({
    isActive: z.boolean()
  })
}

/**
 * Storage schemas
 */
export const storageSchemas = {
  disconnect: z.object({
    provider: z.enum(["google", "dropbox"])
  }),
  
  reconnect: z.object({
    provider: z.enum(["google", "dropbox"])
  }),
  
  healthCheck: z.object({
    provider: commonSchemas.provider.optional(),
    forceCheck: z.boolean().default(false)
  }),
  
  syncSettings: z.object({
    autoSync: z.boolean().default(true),
    deleteAfterSync: z.boolean().default(false),
    syncInterval: z.number().min(300).max(86400).default(3600) // 5 minutes to 24 hours
  })
}

/**
 * Upload schemas
 */
export const uploadSchemas = {
  create: z.object({
    portalId: commonSchemas.id,
    fileName: z.string().min(1).max(255),
    fileSize: z.number().min(1),
    mimeType: z.string().min(1).max(100),
    clientName: z.string().max(100).optional(),
    clientEmail: commonSchemas.email.optional(),
    clientMessage: z.string().max(1000).optional()
  }),
  
  update: z.object({
    status: z.enum(["pending", "completed", "failed"]).optional(),
    errorMessage: z.string().max(500).optional()
  }),
  
  chunkedInit: z.object({
    portalId: commonSchemas.id,
    fileName: z.string().min(1).max(255),
    fileSize: z.number().min(1),
    mimeType: z.string().min(1).max(100),
    totalChunks: z.number().min(1).max(1000),
    clientName: z.string().max(100).optional(),
    clientEmail: commonSchemas.email.optional(),
    clientMessage: z.string().max(1000).optional()
  }),
  
  chunkedComplete: z.object({
    uploadId: commonSchemas.id
  })
}

/**
 * Admin schemas
 */
export const adminSchemas = {
  userUpdate: z.object({
    name: z.string().min(1).max(100).optional(),
    email: commonSchemas.email.optional(),
    role: z.enum(["user", "admin"]).optional(),
    status: z.enum(["active", "suspended", "deleted"]).optional()
  }),
  
  systemSettings: z.object({
    key: z.string().min(1).max(100),
    value: z.string().max(1000),
    type: z.enum(["string", "number", "boolean", "json"]).default("string"),
    description: z.string().max(500).optional(),
    category: z.string().max(50).default("general"),
    isPublic: z.boolean().default(false)
  })
}

/**
 * Communication schemas
 */
export const communicationSchemas = {
  ticket: z.object({
    subject: z.string().min(1).max(200),
    description: z.string().min(1).max(2000),
    category: z.string().min(1).max(50),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM")
  }),
  
  message: z.object({
    content: z.string().min(1).max(2000)
  }),
  
  feedback: z.object({
    rating: z.number().min(1).max(5),
    comment: z.string().max(1000).optional(),
    category: z.enum(["GENERAL", "BUG_REPORT", "FEATURE_REQUEST", "UI_UX", "PERFORMANCE", "BILLING"])
  })
}

/**
 * Response schemas for type safety
 */
/**
 * Response schemas for type safety
 */
const storageAccountSchema = z.object({
  id: commonSchemas.id,
  provider: commonSchemas.provider,
  displayName: z.string(),
  email: z.string().optional(),
  status: commonSchemas.storageAccountStatus,
  isActive: z.boolean(),
  lastAccessedAt: z.date().optional(),
  createdAt: z.date()
})

const paginationResponseSchema = z.object({
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number()
})

export const responseSchemas = {
  success: z.object({
    success: z.boolean(),
    message: z.string().optional()
  }),
  
  error: z.object({
    error: z.string(),
    details: z.union([z.string(), z.object({}).passthrough()]).optional(),
    code: z.string().optional()
  }),
  
  pagination: paginationResponseSchema,
  
  storageAccount: storageAccountSchema,
  
  portal: z.object({
    id: commonSchemas.id,
    name: z.string(),
    slug: z.string(),
    description: z.string().optional(),
    isActive: z.boolean(),
    storageProvider: commonSchemas.provider,
    storageAccount: storageAccountSchema.optional(),
    _count: z.object({
      uploads: z.number()
    }).optional(),
    createdAt: z.date(),
    updatedAt: z.date()
  }),
  
  upload: z.object({
    id: commonSchemas.id,
    fileName: z.string(),
    fileSize: z.number(),
    mimeType: z.string(),
    status: z.string(),
    clientName: z.string().optional(),
    clientEmail: z.string().optional(),
    storageProvider: commonSchemas.provider,
    storageAccount: storageAccountSchema.optional(),
    portal: z.object({
      id: commonSchemas.id,
      name: z.string(),
      slug: z.string()
    }),
    createdAt: z.date(),
    uploadedAt: z.date().optional()
  })
}

/**
 * Utility function to create paginated response schema
 */
export function createPaginatedSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    pagination: responseSchemas.pagination
  })
}

/**
 * Export all schemas for easy importing
 */
export const schemas = {
  common: commonSchemas,
  query: querySchemas,
  portal: portalSchemas,
  storage: storageSchemas,
  upload: uploadSchemas,
  admin: adminSchemas,
  communication: communicationSchemas,
  response: responseSchemas
}