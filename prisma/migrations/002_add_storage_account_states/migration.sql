-- CreateEnum
CREATE TYPE "StorageAccountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DISCONNECTED', 'ERROR');

-- AlterTable
ALTER TABLE "StorageAccount" ADD COLUMN "status" "StorageAccountStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "StorageAccount" ADD COLUMN "lastError" TEXT;
ALTER TABLE "StorageAccount" ADD COLUMN "lastAccessedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "StorageAccount_status_idx" ON "StorageAccount"("status");

-- Data Migration: Set status based on existing isActive field
UPDATE "StorageAccount" SET "status" = 'ACTIVE' WHERE "isActive" = true;
UPDATE "StorageAccount" SET "status" = 'INACTIVE' WHERE "isActive" = false;