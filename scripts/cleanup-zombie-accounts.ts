/**
 * CLEANUP SCRIPT: ZOMBIE ACCOUNTS
 * 
 * This script finds and removes "zombie" OAuth accounts.
 * A "zombie" account is a duplicate account record for the same provider
 * that is NOT linked to the active storage account.
 * 
 * Usage: npx tsx scripts/cleanup-zombie-accounts.ts [--dry-run]
 */

import { config } from "dotenv"
import path from "path"

// Attempt to load from current directory
const result = config()

console.log('DEBUG: CWD:', process.cwd())
console.log('DEBUG: Dotenv result:', result.error ? result.error.message : 'Loaded')
console.log('DEBUG: DATABASE_URL exists?', !!process.env.DATABASE_URL)

async function cleanupZombieAccounts() {
    const isDryRun = process.argv.includes('--dry-run')
    const { default: prisma } = await import("../lib/prisma")
    console.log(`💀 ZOMBIE HUNT: Starting cleanup... ${isDryRun ? '(DRY RUN)' : ''}`)

    try {
        // 1. Find users with multiple accounts for the same provider
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                accounts: {
                    select: {
                        provider: true,
                        providerAccountId: true,
                        createdAt: true
                    }
                },
                storageAccounts: {
                    select: {
                        provider: true,
                        providerAccountId: true
                    }
                }
            }
        })

        let totalZombies = 0
        let totalRemoved = 0

        for (const user of users) {
            // Group accounts by provider
            const accountsByProvider: Record<string, typeof user.accounts> = {}

            for (const acc of user.accounts) {
                if (!accountsByProvider[acc.provider]) {
                    accountsByProvider[acc.provider] = []
                }
                accountsByProvider[acc.provider].push(acc)
            }

            // Check for duplicates
            for (const [provider, accounts] of Object.entries(accountsByProvider)) {
                if (accounts.length > 1) {
                    console.log(`\n👤 User ${user.email} has ${accounts.length} ${provider} accounts`)
                    totalZombies += (accounts.length - 1)

                    // Determine which is the "Active" one
                    const storageProvider = provider === "google" ? "google_drive" : "dropbox"
                    const linkedStorage = user.storageAccounts.find(sa => sa.provider === storageProvider)

                    let activeAccount = null

                    if (linkedStorage) {
                        // If storage exists, the one matching its ID is the active one
                        activeAccount = accounts.find(a => a.providerAccountId === linkedStorage.providerAccountId)
                        if (activeAccount) {
                            console.log(`   ✅ Kept Active (Linked): ${activeAccount.providerAccountId} (Created: ${activeAccount.createdAt.toISOString()})`)
                        } else {
                            // Mismatch! Storage points to an ID that doesn't exist in accounts? 
                            // Or storage points to one, but user logged in with another?
                            // Fallback: Keep the NEWEST one
                            console.log(`   ⚠️ Mismatch: Storage linked to ${linkedStorage.providerAccountId} but not found in accounts.`)
                        }
                    }

                    // If no linked storage (or link broken), keep the NEWEST account
                    if (!activeAccount) {
                        // Sort by createdAt DESC
                        accounts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                        activeAccount = accounts[0]
                        console.log(`   ✅ Kept Active (Newest): ${activeAccount.providerAccountId} (Created: ${activeAccount.createdAt.toISOString()})`)
                    }

                    // Delete the others
                    const accountsToDelete = accounts.filter(a => a.providerAccountId !== activeAccount!.providerAccountId)

                    for (const zombie of accountsToDelete) {
                        console.log(`   🗑️  Deleting Zombie: ${zombie.providerAccountId} (Created: ${zombie.createdAt.toISOString()})`)
                        if (!isDryRun) {
                            await prisma.account.delete({
                                where: {
                                    provider_providerAccountId: {
                                        provider: zombie.provider,
                                        providerAccountId: zombie.providerAccountId
                                    }
                                }
                            })
                            totalRemoved++
                        }
                    }
                }
            }
        }

        console.log(`\n🎉 DONE!`)
        console.log(`   Zombies Found: ${totalZombies}`)
        console.log(`   Zombies Removed: ${totalRemoved}`)

    } catch (error) {
        console.error("❌ Error during cleanup:", error)
    } finally {
        await prisma.$disconnect()
    }
}

cleanupZombieAccounts()
