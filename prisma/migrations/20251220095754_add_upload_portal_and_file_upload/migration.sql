-- CreateTable
CREATE TABLE "UploadPortal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#4F46E5',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxFileSize" INTEGER NOT NULL DEFAULT 104857600,
    "allowedFileTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requireClientName" BOOLEAN NOT NULL DEFAULT true,
    "requireClientEmail" BOOLEAN NOT NULL DEFAULT false,
    "passwordHash" TEXT,
    "storageProvider" TEXT NOT NULL DEFAULT 'local',
    "storageFolderId" TEXT,
    "storageFolderPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UploadPortal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileUpload" (
    "id" TEXT NOT NULL,
    "portalId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "clientName" TEXT,
    "clientEmail" TEXT,
    "clientMessage" TEXT,
    "storageProvider" TEXT NOT NULL,
    "storageFileId" TEXT,
    "storagePath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedAt" TIMESTAMP(3),

    CONSTRAINT "FileUpload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UploadPortal_slug_key" ON "UploadPortal"("slug");

-- CreateIndex
CREATE INDEX "UploadPortal_userId_idx" ON "UploadPortal"("userId");

-- CreateIndex
CREATE INDEX "FileUpload_portalId_idx" ON "FileUpload"("portalId");

-- CreateIndex
CREATE INDEX "FileUpload_createdAt_idx" ON "FileUpload"("createdAt");

-- AddForeignKey
ALTER TABLE "UploadPortal" ADD CONSTRAINT "UploadPortal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileUpload" ADD CONSTRAINT "FileUpload_portalId_fkey" FOREIGN KEY ("portalId") REFERENCES "UploadPortal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
