-- Migration: Fix Data Integrity Issues
-- Remove redundant fields and consolidate data model

-- Step 1: Ensure all FileUploads have proper storageAccountId bindings
-- Update FileUploads that have storageProvider but no storageAccountId
UPDATE "FileUpload" 
SET "storageAccountId" = (
  SELECT sa.id 
  FROM "StorageAccount" sa 
  WHERE sa."userId" = "FileUpload"."userId" 
    AND (
      (sa.provider = 'google_drive' AND "FileUpload"."storageProvider" = 'google_drive') OR
      (sa.provider = 'dropbox' AND "FileUpload"."storageProvider" = 'dropbox')
    )
  LIMIT 1
)
WHERE "storageAccountId" IS NULL 
  AND "storageProvider" IN ('google_drive', 'dropbox')
  AND "userId" IS NOT NULL;

-- Step 2: Ensure all UploadPortals have proper storageAccountId bindings
-- Update UploadPortals that have storageProvider but no storageAccountId
UPDATE "UploadPortal" 
SET "storageAccountId" = (
  SELECT sa.id 
  FROM "StorageAccount" sa 
  WHERE sa."userId" = "UploadPortal"."userId" 
    AND (
      (sa.provider = 'google_drive' AND "UploadPortal"."storageProvider" = 'google_drive') OR
      (sa.provider = 'dropbox' AND "UploadPortal"."storageProvider" = 'dropbox')
    )
  LIMIT 1
)
WHERE "storageAccountId" IS NULL 
  AND "storageProvider" IN ('google_drive', 'dropbox');

-- Step 3: Sync isActive field with status enum for consistency
-- Set isActive = false where status is not ACTIVE
UPDATE "StorageAccount" 
SET "isActive" = false 
WHERE "status" != 'ACTIVE' AND "isActive" = true;

-- Set isActive = true where status is ACTIVE
UPDATE "StorageAccount" 
SET "isActive" = true 
WHERE "status" = 'ACTIVE' AND "isActive" = false;

-- Step 4: Create backup of redundant data before removal
-- Create a temporary table to store the redundant data for rollback if needed
CREATE TABLE IF NOT EXISTS "_migration_backup_004" (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(50),
  record_id VARCHAR(50),
  field_name VARCHAR(50),
  old_value TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Backup FileUpload.storageProvider values
INSERT INTO "_migration_backup_004" (table_name, record_id, field_name, old_value)
SELECT 'FileUpload', id, 'storageProvider', "storageProvider"
FROM "FileUpload" 
WHERE "storageProvider" IS NOT NULL;

-- Backup UploadPortal.storageProvider values
INSERT INTO "_migration_backup_004" (table_name, record_id, field_name, old_value)
SELECT 'UploadPortal', id, 'storageProvider', "storageProvider"
FROM "UploadPortal" 
WHERE "storageProvider" IS NOT NULL;

-- Step 5: Remove redundant storageProvider columns
-- Note: We'll keep these columns for now and mark them as deprecated
-- They can be removed in a future migration after ensuring all code is updated

-- Add comments to indicate deprecation
COMMENT ON COLUMN "FileUpload"."storageProvider" IS 'DEPRECATED: Use storageAccount.provider instead. Will be removed in future migration.';
COMMENT ON COLUMN "UploadPortal"."storageProvider" IS 'DEPRECATED: Use storageAccount.provider instead. Will be removed in future migration.';
COMMENT ON COLUMN "StorageAccount"."isActive" IS 'DEPRECATED: Use status enum instead. Kept for backward compatibility.';

-- Step 6: Add constraints to ensure data consistency
-- Ensure FileUploads with cloud storage have storageAccountId
-- (We'll add this as a check constraint that can be disabled if needed)
ALTER TABLE "FileUpload" 
ADD CONSTRAINT "chk_fileupload_storage_consistency" 
CHECK (
  ("storageProvider" NOT IN ('google_drive', 'dropbox')) OR 
  ("storageAccountId" IS NOT NULL)
) NOT VALID;

-- Ensure UploadPortals with cloud storage have storageAccountId
ALTER TABLE "UploadPortal" 
ADD CONSTRAINT "chk_uploadportal_storage_consistency" 
CHECK (
  ("storageProvider" NOT IN ('google_drive', 'dropbox')) OR 
  ("storageAccountId" IS NOT NULL)
) NOT VALID;

-- Step 7: Create indexes for better performance on the relationships
CREATE INDEX IF NOT EXISTS "idx_fileupload_storageaccountid" ON "FileUpload"("storageAccountId");
CREATE INDEX IF NOT EXISTS "idx_uploadportal_storageaccountid" ON "UploadPortal"("storageAccountId");

-- Step 8: Add a function to derive storageProvider from StorageAccount
-- This function can be used in queries to get the provider without storing it redundantly
CREATE OR REPLACE FUNCTION get_storage_provider_for_file(file_storage_account_id TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT provider 
    FROM "StorageAccount" 
    WHERE id = file_storage_account_id
  );
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_storage_provider_for_portal(portal_storage_account_id TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT provider 
    FROM "StorageAccount" 
    WHERE id = portal_storage_account_id
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 9: Create a view for backward compatibility
-- This view includes the derived storageProvider for existing queries
CREATE OR REPLACE VIEW "FileUploadWithProvider" AS
SELECT 
  fu.*,
  COALESCE(sa.provider, fu."storageProvider") as "derivedStorageProvider",
  sa.status as "storageAccountStatus",
  sa."isActive" as "storageAccountActive"
FROM "FileUpload" fu
LEFT JOIN "StorageAccount" sa ON fu."storageAccountId" = sa.id;

CREATE OR REPLACE VIEW "UploadPortalWithProvider" AS
SELECT 
  up.*,
  COALESCE(sa.provider, up."storageProvider") as "derivedStorageProvider",
  sa.status as "storageAccountStatus",
  sa."isActive" as "storageAccountActive"
FROM "UploadPortal" up
LEFT JOIN "StorageAccount" sa ON up."storageAccountId" = sa.id;

-- Step 10: Log migration completion
INSERT INTO "_migration_backup_004" (table_name, record_id, field_name, old_value)
VALUES ('_migration_log', '004', 'status', 'completed_' || NOW()::text);