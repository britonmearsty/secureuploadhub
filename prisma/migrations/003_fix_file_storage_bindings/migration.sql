-- Migration: Fix File Storage Account Bindings
-- This fixes files that were incorrectly bound to wrong storage accounts

-- Update Google Drive files to be bound to Google Drive storage accounts
UPDATE "FileUpload" 
SET "storageAccountId" = (
  SELECT sa.id 
  FROM "StorageAccount" sa 
  JOIN "UploadPortal" p ON p."userId" = sa."userId"
  WHERE p.id = "FileUpload"."portalId" 
  AND sa.provider = 'google_drive'
  AND "FileUpload"."storageProvider" = 'google_drive'
  LIMIT 1
)
WHERE "storageProvider" = 'google_drive'
AND "storageAccountId" IS NOT NULL
AND EXISTS (
  SELECT 1 FROM "StorageAccount" sa 
  JOIN "UploadPortal" p ON p."userId" = sa."userId"
  WHERE p.id = "FileUpload"."portalId" 
  AND sa.provider = 'google_drive'
);

-- Update Dropbox files to be bound to Dropbox storage accounts  
UPDATE "FileUpload" 
SET "storageAccountId" = (
  SELECT sa.id 
  FROM "StorageAccount" sa 
  JOIN "UploadPortal" p ON p."userId" = sa."userId"
  WHERE p.id = "FileUpload"."portalId" 
  AND sa.provider = 'dropbox'
  AND "FileUpload"."storageProvider" = 'dropbox'
  LIMIT 1
)
WHERE "storageProvider" = 'dropbox'
AND "storageAccountId" IS NOT NULL
AND EXISTS (
  SELECT 1 FROM "StorageAccount" sa 
  JOIN "UploadPortal" p ON p."userId" = sa."userId"
  WHERE p.id = "FileUpload"."portalId" 
  AND sa.provider = 'dropbox'
);