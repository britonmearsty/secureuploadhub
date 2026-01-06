import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import AssetsClient from "./AssetsClient"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Assets | SecureUploadHub",
  description: "Manage and monitor your uploaded client documents.",
}

export default async function AssetsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  // Get user's file visibility preference
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { showConnectedFilesOnly: true }
  })

  const showConnectedFilesOnly = user?.showConnectedFilesOnly ?? true

  // FIXED: Always show all files, let the UI handle status display
  // The previous logic was incorrectly filtering out files based on storage account status
  // This caused Dropbox files to disappear when Google Drive was disconnected
  const whereClause: any = {
    portal: {
      userId: session.user.id,
    },
  }

  // Only apply filtering if user specifically wants to hide disconnected files
  if (showConnectedFilesOnly) {
    whereClause.OR = [
      // Files without storage account (legacy files)
      { storageAccountId: null },
      // Files with active storage accounts
      {
        storageAccount: {
          status: "ACTIVE"
        }
      }
    ]
  }

  // Fetch file uploads based on user preference
  const uploads = await prisma.fileUpload.findMany({
    where: whereClause,
    select: {
      id: true,
      fileName: true,
      fileSize: true,
      mimeType: true,
      clientName: true,
      clientEmail: true,
      storageProvider: true,
      storagePath: true,
      storageAccountId: true,
      createdAt: true,
      portal: {
        select: {
          name: true,
          slug: true,
          primaryColor: true,
        },
      },
      storageAccount: {
        select: {
          id: true,
          status: true,
          provider: true,
          displayName: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  return <AssetsClient initialUploads={uploads as any} />
}