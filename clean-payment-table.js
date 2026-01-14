/**
 * Clean Payment Table
 * This script properly cleans up orphaned and unnecessary payments
 */

require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})
const prisma = new PrismaClient({ adapter })

async function cleanPaymentTable() {
  console.log('🧹 Cleaning Payment Table...\n')

  try {
    // 1. Get all payments
    const allPayments = await prisma.payment.findMany({
      include: {
        user: {
          select: {
            email: true
          }
        },
        subscription: {
          select: {
            id: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`📊 Total payments in database: ${allPayments.length}\n`)

    // 2. Categorize payments
    const orphanedPayments = allPayments.filter(p => !p.subscriptionId)
    const linkedToDeletedSubscriptions = allPayments.filter(p => p.subscriptionId && !p.subscription)
    const pendingPayments = allPayments.filter(p => p.status === 'pending' && p.subscriptionId)
    const succeededPayments = allPayments.filter(p => p.status === 'succeeded')

    console.log('📋 Payment Categories:')
    console.log(`   - Orphaned (no subscription): ${orphanedPayments.length}`)
    console.log(`   - Linked to deleted subscriptions: ${linkedToDeletedSubscriptions.length}`)
    console.log(`   - Pending with subscription: ${pendingPayments.length}`)
    console.log(`   - Succeeded: ${succeededPayments.length}`)

    // 3. Show orphaned payments details
    if (orphanedPayments.length > 0) {
      console.log(`\n🔍 Orphaned Payments (will be deleted):`)
      orphanedPayments.forEach((payment, index) => {
        console.log(`   ${index + 1}. ID: ${payment.id}`)
        console.log(`      User: ${payment.user.email}`)
        console.log(`      Amount: ${payment.amount} ${payment.currency}`)
        console.log(`      Status: ${payment.status}`)
        console.log(`      Reference: ${payment.providerPaymentRef}`)
        console.log(`      Created: ${payment.createdAt}`)
        console.log(`      ---`)
      })
    }

    // 4. Show pending payments linked to subscriptions
    if (pendingPayments.length > 0) {
      console.log(`\n⏳ Pending Payments (linked to subscriptions):`)
      pendingPayments.forEach((payment, index) => {
        console.log(`   ${index + 1}. ID: ${payment.id}`)
        console.log(`      User: ${payment.user.email}`)
        console.log(`      Amount: ${payment.amount} ${payment.currency}`)
        console.log(`      Subscription: ${payment.subscriptionId} (${payment.subscription?.status})`)
        console.log(`      Reference: ${payment.providerPaymentRef}`)
        console.log(`      ---`)
      })
    }

    // 5. Determine what to delete
    const paymentsToDelete = [
      ...orphanedPayments.map(p => p.id),
      ...linkedToDeletedSubscriptions.map(p => p.id)
    ]

    // Also delete pending payments that are linked to canceled or non-existent subscriptions
    const pendingToDelete = pendingPayments.filter(p => 
      !p.subscription || p.subscription.status === 'canceled'
    )
    paymentsToDelete.push(...pendingToDelete.map(p => p.id))

    console.log(`\n🗑️  Total payments to delete: ${paymentsToDelete.length}`)

    if (paymentsToDelete.length > 0) {
      // Confirm deletion
      console.log(`\n⚠️  About to delete ${paymentsToDelete.length} payments...`)
      
      // Delete payments
      const deleted = await prisma.payment.deleteMany({
        where: {
          id: { in: paymentsToDelete }
        }
      })

      console.log(`✅ Deleted ${deleted.count} payments`)
    } else {
      console.log(`\n✨ No payments to delete - table is clean`)
    }

    // 6. Show final state
    const finalPayments = await prisma.payment.findMany({
      include: {
        user: {
          select: {
            email: true
          }
        },
        subscription: {
          select: {
            id: true,
            status: true,
            plan: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`\n📊 FINAL STATE:`)
    console.log(`   Total payments: ${finalPayments.length}`)

    if (finalPayments.length > 0) {
      console.log(`\n📋 Remaining Payments:`)
      finalPayments.forEach((payment, index) => {
        console.log(`   ${index + 1}. ${payment.user.email} - ${payment.amount} ${payment.currency} - ${payment.status}`)
        if (payment.subscription) {
          console.log(`      → Subscription: ${payment.subscription.plan.name} (${payment.subscription.status})`)
        }
      })
    }

    console.log(`\n✅ Payment table cleanup completed!`)

  } catch (error) {
    console.error('❌ Error cleaning payment table:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the cleanup
cleanPaymentTable()
