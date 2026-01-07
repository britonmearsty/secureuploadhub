#!/usr/bin/env tsx

/**
 * Data Integrity Fix Script
 * 
 * This script fixes the data integrity issues by:
 * 1. Ensuring all FileUploads have proper storageAccountId bindings
 * 2. Ensuring all UploadPortals have proper storageAccountId bindings  
 * 3. Syncing isActive field with status enum for consistency
 * 4. Validating data integrity across the system
 */

// Load environment variables FIRST
require('dotenv').config()

import prisma from "../lib/prisma"
import { StorageAccountStatus } from "@prisma/client"
import { 
  validateFileUploadIntegrity, 
  validateUploadPortalIntegrity,
  syncStorageAccountActiveStatus 
} from "../lib/storage/data-integrity-helpers"

interface FixResult {
  step: string
  success: boolean
  details: any
  error?: string
}

class DataIntegrityFixer {
  private results: FixResult[] = []

  async logStep(step: string, operation: () => Promise<any>): Promise<void> {
    console.log(`\n🔧 ${step}`)
    
    try {
      const result = await operation()
      
      this.results.push({
        step,
        success: true,
        details: result
      })
      
      console.log(`✅ ${step} - Success`)
      console.log(`   Result:`, result)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      this.results.push({
        step,
        success: false,
        details: null,
        error: errorMessage
      })
      
      console.log(`❌ ${step} - Failed`)
      console.log(`   Error: ${errorMessage}`)
    }
  }

  /**
   * Step 1: Fix FileUpload storageAccountId bindings
   */
  async fixFileUploadBindings(): Promise<void> {
    await this.logStep("Fix FileUpload StorageAccount Bindings", async () => {
      // Find FileUploads with cloud storage but no storageAccountId
      const problematicFiles = await prisma.fileUpload.findMany({
        where: {
          storageProvider: { in: ['google_drive', 'dropbox'] },
          storageAccountId: null,
          userId: { not: null }
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

      console.log(`   Found ${problematicFiles.length} FileUploads needing StorageAccount binding`)

      let fixed = 0
      let errors = 0

      for (const file of problematicFiles) {
        try {
          // Find matching StorageAccount
          const matchingAccount = file.user?.storageAccounts.find(sa => 
            (sa.provider === 'google_drive' && file.storageProvider === 'google_drive') ||
            (sa.provider === 'dropbox' && file.storageProvider === 'dropbox')
          )

          if (matchingAccount) {
            await prisma.fileUpload.update({
              where: { id: file.id },
              data: { storageAccountId: matchingAccount.id }
            })
            fixed++
          } else {
            console.warn(`   No matching StorageAccount for FileUpload ${file.id} (${file.storageProvider})`)
          }
        } catch (error) {
          console.error(`   Error fixing FileUpload ${file.id}:`, error)
          errors++
        }
      }

      return {
        totalProblematic: problematicFiles.length,
        fixed,
        errors,
        unfixable: problematicFiles.length - fixed - errors
      }
    })
  }

  /**
   * Step 2: Fix UploadPortal storageAccountId bindings
   */
  async fixUploadPortalBindings(): Promise<void> {
    await this.logStep("Fix UploadPortal StorageAccount Bindings", async () => {
      // Find UploadPortals with cloud storage but no storageAccountId
      const problematicPortals = await prisma.uploadPortal.findMany({
        where: {
          storageProvider: { in: ['google_drive', 'dropbox'] },
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

      console.log(`   Found ${problematicPortals.length} UploadPortals needing StorageAccount binding`)

      let fixed = 0
      let errors = 0

      for (const portal of problematicPortals) {
        try {
          // Find matching StorageAccount
          const matchingAccount = portal.user.storageAccounts.find(sa => 
            (sa.provider === 'google_drive' && portal.storageProvider === 'google_drive') ||
            (sa.provider === 'dropbox' && portal.storageProvider === 'dropbox')
          )

          if (matchingAccount) {
            await prisma.uploadPortal.update({
              where: { id: portal.id },
              data: { storageAccountId: matchingAccount.id }
            })
            fixed++
          } else {
            console.warn(`   No matching StorageAccount for UploadPortal ${portal.id} (${portal.storageProvider})`)
          }
        } catch (error) {
          console.error(`   Error fixing UploadPortal ${portal.id}:`, error)
          errors++
        }
      }

      return {
        totalProblematic: problematicPortals.length,
        fixed,
        errors,
        unfixable: problematicPortals.length - fixed - errors
      }
    })
  }

  /**
   * Step 3: Sync isActive field with status enum
   */
  async syncActiveStatus(): Promise<void> {
    await this.logStep("Sync isActive Field with Status Enum", async () => {
      // Find StorageAccounts where isActive doesn't match status
      const inconsistentAccounts = await prisma.storageAccount.findMany({
        where: {
          OR: [
            { status: StorageAccountStatus.ACTIVE, isActive: false },
            { status: { not: StorageAccountStatus.ACTIVE }, isActive: true }
          ]
        }
      })

      console.log(`   Found ${inconsistentAccounts.length} StorageAccounts with inconsistent active status`)

      let synced = 0
      let errors = 0

      for (const account of inconsistentAccounts) {
        try {
          const shouldBeActive = account.status === StorageAccountStatus.ACTIVE
          
          await prisma.storageAccount.update({
            where: { id: account.id },
            data: { isActive: shouldBeActive }
          })
          
          synced++
          console.log(`   Synced ${account.id}: status=${account.status} -> isActive=${shouldBeActive}`)
        } catch (error) {
          console.error(`   Error syncing StorageAccount ${account.id}:`, error)
          errors++
        }
      }

      return {
        totalInconsistent: inconsistentAccounts.length,
        synced,
        errors
      }
    })
  }

  /**
   * Step 4: Validate data integrity
   */
  async validateIntegrity(): Promise<void> {
    await this.logStep("Validate Data Integrity", async () => {
      // Sample validation of FileUploads
      const sampleFiles = await prisma.fileUpload.findMany({
        where: {
          storageProvider: { in: ['google_drive', 'dropbox'] }
        },
        take: 10
      })

      const fileValidations = await Promise.all(
        sampleFiles.map(async (file) => {
          const validation = await validateFileUploadIntegrity(file.id)
          return {
            fileId: file.id,
            isValid: validation.isValid,
            issues: validation.issues.length,
            suggestions: validation.suggestions.length
          }
        })
      )

      // Sample validation of UploadPortals
      const samplePortals = await prisma.uploadPortal.findMany({
        where: {
          storageProvider: { in: ['google_drive', 'dropbox'] }
        },
        take: 10
      })

      const portalValidations = await Promise.all(
        samplePortals.map(async (portal) => {
          const validation = await validateUploadPortalIntegrity(portal.id)
          return {
            portalId: portal.id,
            isValid: validation.isValid,
            issues: validation.issues.length,
            suggestions: validation.suggestions.length
          }
        })
      )

      const validFiles = fileValidations.filter(v => v.isValid).length
      const validPortals = portalValidations.filter(v => v.isValid).length

      return {
        filesSampled: fileValidations.length,
        filesValid: validFiles,
        filesInvalid: fileValidations.length - validFiles,
        portalsSampled: portalValidations.length,
        portalsValid: validPortals,
        portalsInvalid: portalValidations.length - validPortals,
        fileValidations,
        portalValidations
      }
    })
  }

  /**
   * Step 5: Generate summary report
   */
  async generateReport(): Promise<void> {
    await this.logStep("Generate Summary Report", async () => {
      // Count total records by type
      const totalFiles = await prisma.fileUpload.count()
      const cloudFiles = await prisma.fileUpload.count({
        where: { storageProvider: { in: ['google_drive', 'dropbox'] } }
      })
      const boundFiles = await prisma.fileUpload.count({
        where: { 
          storageProvider: { in: ['google_drive', 'dropbox'] },
          storageAccountId: { not: null }
        }
      })

      const totalPortals = await prisma.uploadPortal.count()
      const cloudPortals = await prisma.uploadPortal.count({
        where: { storageProvider: { in: ['google_drive', 'dropbox'] } }
      })
      const boundPortals = await prisma.uploadPortal.count({
        where: { 
          storageProvider: { in: ['google_drive', 'dropbox'] },
          storageAccountId: { not: null }
        }
      })

      const totalStorageAccounts = await prisma.storageAccount.count()
      const activeStorageAccounts = await prisma.storageAccount.count({
        where: { status: StorageAccountStatus.ACTIVE }
      })
      const syncedStorageAccounts = await prisma.storageAccount.count({
        where: {
          OR: [
            { status: StorageAccountStatus.ACTIVE, isActive: true },
            { status: { not: StorageAccountStatus.ACTIVE }, isActive: false }
          ]
        }
      })

      return {
        files: {
          total: totalFiles,
          cloudStorage: cloudFiles,
          properlyBound: boundFiles,
          bindingRate: cloudFiles > 0 ? (boundFiles / cloudFiles * 100).toFixed(1) + '%' : 'N/A'
        },
        portals: {
          total: totalPortals,
          cloudStorage: cloudPortals,
          properlyBound: boundPortals,
          bindingRate: cloudPortals > 0 ? (boundPortals / cloudPortals * 100).toFixed(1) + '%' : 'N/A'
        },
        storageAccounts: {
          total: totalStorageAccounts,
          active: activeStorageAccounts,
          synced: syncedStorageAccounts,
          syncRate: totalStorageAccounts > 0 ? (syncedStorageAccounts / totalStorageAccounts * 100).toFixed(1) + '%' : 'N/A'
        }
      }
    })
  }

  /**
   * Run all fixes
   */
  async runAllFixes(): Promise<void> {
    console.log('🚀 Starting Data Integrity Fix...\n')
    
    await this.fixFileUploadBindings()
    await this.fixUploadPortalBindings()
    await this.syncActiveStatus()
    await this.validateIntegrity()
    await this.generateReport()

    // Print summary
    console.log('\n📊 Fix Summary:')
    console.log('================')
    
    const successful = this.results.filter(r => r.success).length
    const failed = this.results.filter(r => !r.success).length
    
    console.log(`Total Steps: ${this.results.length}`)
    console.log(`Successful: ${successful}`)
    console.log(`Failed: ${failed}`)
    
    if (failed > 0) {
      console.log('\n❌ Failed Steps:')
      this.results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`  - ${r.step}: ${r.error}`)
        })
    }
    
    console.log(`\n${failed === 0 ? '✅ All fixes completed successfully!' : '⚠️ Some fixes failed - check logs above'}`)
    
    if (failed > 0) {
      process.exit(1)
    }
  }
}

// Run fixes if this script is executed directly
if (require.main === module) {
  const fixer = new DataIntegrityFixer()
  fixer.runAllFixes().catch(error => {
    console.error('❌ Fix execution failed:', error)
    process.exit(1)
  })
}

export { DataIntegrityFixer }