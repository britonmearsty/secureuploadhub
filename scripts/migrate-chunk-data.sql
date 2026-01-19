-- Migration to add ChunkData table for chunked upload storage
-- Run this manually in your database when ready

CREATE TABLE IF NOT EXISTS "ChunkData" (
    "id" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChunkData_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "ChunkData_uploadId_chunkIndex_key" ON "ChunkData"("uploadId", "chunkIndex");

-- Create index for performance
CREATE INDEX IF NOT EXISTS "ChunkData_uploadId_idx" ON "ChunkData"("uploadId");

-- Add foreign key constraint
ALTER TABLE "ChunkData" ADD CONSTRAINT "ChunkData_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "ChunkedUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add relation to ChunkedUpload table (this might already exist)
-- This is handled by Prisma schema, just documenting the relationship