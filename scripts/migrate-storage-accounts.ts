#!/usr/bin/env tsx

/**
 * Migration Script: Populate StorageAccount from existing Account records
 * 
 * This script creates StorageAccount records for existing OAuth accounts
 * and optionally binds existing portals and files to storage accounts.
 * 
 * Run with: npx tsx scripts/migrate-storage-accounts.ts
 */

import prisma from "../lib/prisma"
import { StorageAccountStatus } from "@prisma/client"

async function main() {
  console.log("🚀 Starting storage account migration...")

  try {
    // Step 1: Create StorageAccount records from existing Account records
    console.log("\n📋 Step 1: Creating StorageAccount records...")
    
    const oauthAccounts = await prisma.account.findMany({
      where: {
        provider: {
          in: ["google", "dropbox"]
        }
      },
      include: {
        user: {
          select: { email: true, name: true }
        }
      }
    })

    console.log(`Found ${oauthAccounts.length} OAuth accounts to migrate`)

    let createdCount = 0
    let skippedCount = 0

    for (const account of oauthAccounts) {
      try {
        // Check if StorageAccount already exists
        const existingStorageAccount = await prisma.storageAccount.findUnique({
          where: {
            userId_providerAccountId_provider: {
              userId: account.userId,
              providerAccountId: account.providerAccountId,
              provider: account.provider
            }
          }
        })

        if (existingStorageAccount) {
          console.log(`  ⏭️  Skipping existing storage account for ${account.user.email} (${account.provider})`)
          skippedCount++
          continue
        }

        // Create StorageAccount record
        // Create StorageAccount record with correct provider mapping
        const storageProvider = account.provider === "google" ? "google_drive" : "dropbox";
        const storageAccount = await prisma.storageAccount.create({
          data: {
            userId: account.userId,
            provider: storageProvider, // Use storage provider name, not OAuth provider name
            providerAccountId: account.providerAccountId,
            displayName: account.user.name || account.user.email || "Unknown",
            email: account.user.email,
            status: StorageAccountStatus.ACTIVE, // Assume existing accounts are active
            isActive: true,
            createdAt: account.createdAt || new Date(),
            updatedAt: new Date()
          }
        })

        console.log(`  ✅ Created storage account: ${storageAccount.displayName} (${storageAccount.provider})`)
        createdCount++

      } catch (error) {
        console.error(`  ❌ Failed to create storage account for ${account.user.email} (${account.provider}):`, error)
      }
    }

    console.log(`\n📊 Step 1 Results: Created ${createdCount}, Skipped ${skippedCount}`)

    // Step 2: Bind existing portals to storage accounts
    console.log("\n📋 Step 2: Binding existing portals to storage accounts...")
    
    const unboundPortals = await prisma.uploadPortal.findMany({
      where: {
        storageAccountId: null
      },
      include: {
        user: {
          include: {
            storageAccounts: {
              where: {
                status: StorageAccountStatus.ACTIVE
              }
            }
          }
        }
      }
    })

    console.log(`Found ${unboundPortals.length} portals without storage account binding`)

    let boundPortalsCount = 0
    let unbindablePortalsCount = 0

    for (const portal of unboundPortals) {
      try {
        // Find matching storage account for portal's provider
        const storageProvider = portal.storageProvider === "google_drive" ? "google" : "dropbox"
        const matchingAccount = portal.user.storageAccounts.find(
          acc => acc.provider === storageProvider
        )

        if (matchingAccount) {
          await prisma.uploadPortal.update({
            where: { id: portal.id },
            data: { storageAccountId: matchingAccount.id }
          })
          
          console.log(`  ✅ Bound portal "${portal.name}" to ${matchingAccount.provider} account`)
          boundPortalsCount++
        } else {
          console.log(`  ⚠️  No matching storage account for portal "${portal.name}" (${portal.storageProvider})`)
          unbindablePortalsCount++
        }

      } catch (error) {
        console.error(`  ❌ Failed to bind portal "${portal.name}":`, error)
        unbindablePortalsCount++
      }
    }

    console.log(`\n📊 Step 2 Results: Bound ${boundPortalsCount}, Unbindable ${unbindablePortalsCount}`)

    // Step 3: Bind existing files to storage accounts (optional - can be heavy)
    const shouldBindFiles = process.argv.includes("--bind-files")
    let boundFilesCount = 0
    
    if (shouldBindFiles) {
      console.log("\n📋 Step 3: Binding existing files to storage accounts...")
      
      const unboundFiles = await prisma.fileUpload.findMany({
        where: {
          storageAccountId: null,
          status: "uploaded"
        },
        include: {
          portal: {
            include: {
              user: {
                include: {
                  storageAccounts: {
                    where: {
                      status: StorageAccountStatus.ACTIVE
                    }
                  }
                }
              }
            }
          }
        },
        take: 1000 // Process in batches to avoid memory issues
      })

      console.log(`Found ${unboundFiles.length} files without storage account binding (processing first 1000)`)

      let unbindableFilesCount = 0

      for (const file of unboundFiles) {
        try {
          // Find matching storage account for file's provider
          const storageProvider = file.storageProvider === "google_drive" ? "google" : "dropbox"
          const matchingAccount = file.portal.user.storageAccounts.find(
            acc => acc.provider === storageProvider
          )

          if (matchingAccount) {
            await prisma.fileUpload.update({
              where: { id: file.id },
              data: { storageAccountId: matchingAccount.id }
            })
            
            boundFilesCount++
            if (boundFilesCount % 100 === 0) {
              console.log(`  📈 Bound ${boundFilesCount} files...`)
            }
          } else {
            unbindableFilesCount++
          }

        } catch (error) {
          console.error(`  ❌ Failed to bind file "${file.fileName}":`, error)
          unbindableFilesCount++
        }
      }

      console.log(`\n📊 Step 3 Results: Bound ${boundFilesCount}, Unbindable ${unbindableFilesCount}`)
    } else {
      console.log("\n⏭️  Step 3: Skipping file binding (use --bind-files flag to enable)")
    }

    console.log("\n🎉 Migration completed successfully!")
    console.log("\n📋 Summary:")
    console.log(`  • Storage accounts created: ${createdCount}`)
    console.log(`  • Portals bound: ${boundPortalsCount}`)
    if (shouldBindFiles) {
      console.log(`  • Files bound: ${boundFilesCount}`)
    }
    console.log("\n✅ The storage account system is now ready to use!")

  } catch (error) {
    console.error("❌ Migration failed:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run migration if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Migration failed:", error)
    process.exit(1)
  })
}

export { main as migrateStorageAccounts }