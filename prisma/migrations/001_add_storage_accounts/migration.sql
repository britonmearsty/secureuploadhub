-- CreateTable
CREATE TABLE "StorageAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorageAccount_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StorageAccount" ADD CONSTRAINT "StorageAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "StorageAccount_userId_providerAccountId_provider_key" ON "StorageAccount"("userId", "providerAccountId", "provider");

-- CreateIndex
CREATE INDEX "StorageAccount_userId_idx" ON "StorageAccount"("userId");

-- CreateIndex
CREATE INDEX "StorageAccount_provider_idx" ON "StorageAccount"("provider");

-- CreateIndex
CREATE INDEX "StorageAccount_isActive_idx" ON "StorageAccount"("isActive");

-- AlterTable
ALTER TABLE "UploadPortal" ADD COLUMN "storageAccountId" TEXT;

-- AlterTable
ALTER TABLE "FileUpload" ADD COLUMN "storageAccountId" TEXT;

-- AddForeignKey
ALTER TABLE "UploadPortal" ADD CONSTRAINT "UploadPortal_storageAccountId_fkey" FOREIGN KEY ("storageAccountId") REFERENCES "StorageAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileUpload" ADD CONSTRAINT "FileUpload_storageAccountId_fkey" FOREIGN KEY ("storageAccountId") REFERENCES "StorageAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;