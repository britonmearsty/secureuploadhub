/**
 * Fix Billing Issues Script
 * This script cleans up incomplete subscriptions and orphaned payments
 */

require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})
const prisma = new PrismaClient({ adapter })

async function fixBillingIssues() {
  console.log('🔧 Starting Billing System Cleanup...\n')

  try {
    // 1. Clean up incomplete subscriptions for the main user
    const userEmail = 'kiplaekc@gmail.com'
    
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    })

    if (!user) {
      console.log('❌ User not found')
      return
    }

    console.log(`👤 Working with user: ${userEmail} (ID: ${user.id})`)

    // 2. Find all subscriptions for this user
    const allSubscriptions = await prisma.subscription.findMany({
      where: { userId: user.id },
      include: {
        plan: true,
        payments: true
      },
      orderBy: { createdAt: 'desc' }
    })

    console.log(`\n📊 Found ${allSubscriptions.length} total subscriptions for user:`)
    allSubscriptions.forEach((sub, index) => {
      console.log(`   ${index + 1}. ${sub.id} - ${sub.status} - ${sub.plan.name} (${sub.payments.length} payments)`)
    })

    // 3. Keep only the most recent active subscription and one most recent incomplete
    const activeSubscriptions = allSubscriptions.filter(s => s.status === 'active')
    const incompleteSubscriptions = allSubscriptions.filter(s => s.status === 'incomplete')
    const canceledSubscriptions = allSubscriptions.filter(s => s.status === 'canceled')

    console.log(`\n📈 Status breakdown:`)
    console.log(`   - Active: ${activeSubscriptions.length}`)
    console.log(`   - Incomplete: ${incompleteSubscriptions.length}`)
    console.log(`   - Canceled: ${canceledSubscriptions.length}`)

    // 4. Clean up strategy:
    // - Keep the most recent active subscription
    // - Remove all incomplete subscriptions (they're causing the recovery modal)
    // - Remove old canceled subscriptions
    
    const subscriptionsToDelete = []
    
    // Delete all incomplete subscriptions (they're causing the recovery modal issue)
    if (incompleteSubscriptions.length > 0) {
      console.log(`\n🗑️  Will delete ${incompleteSubscriptions.length} incomplete subscriptions:`)
      incompleteSubscriptions.forEach(sub => {
        console.log(`   - ${sub.id} (${sub.plan.name}) - Created: ${sub.createdAt}`)
        subscriptionsToDelete.push(sub.id)
      })
    }

    // Delete old canceled subscriptions (keep data clean)
    if (canceledSubscriptions.length > 1) {
      const oldCanceled = canceledSubscriptions.slice(1) // Keep the most recent canceled
      console.log(`\n🗑️  Will delete ${oldCanceled.length} old canceled subscriptions:`)
      oldCanceled.forEach(sub => {
        console.log(`   - ${sub.id} (${sub.plan.name}) - Created: ${sub.createdAt}`)
        subscriptionsToDelete.push(sub.id)
      })
    }

    // 5. Delete orphaned payments (payments not linked to any subscription or linked to subscriptions we're deleting)
    const orphanedPayments = await prisma.payment.findMany({
      where: {
        userId: user.id,
        OR: [
          { subscriptionId: null },
          { subscriptionId: { in: subscriptionsToDelete } }
        ]
      }
    })

    console.log(`\n💳 Found ${orphanedPayments.length} orphaned payments to clean up`)

    // 6. Perform the cleanup
    if (subscriptionsToDelete.length > 0 || orphanedPayments.length > 0) {
      console.log(`\n🚀 Starting cleanup process...`)
      
      // Delete orphaned payments first
      if (orphanedPayments.length > 0) {
        const deletedPayments = await prisma.payment.deleteMany({
          where: {
            id: { in: orphanedPayments.map(p => p.id) }
          }
        })
        console.log(`✅ Deleted ${deletedPayments.count} orphaned payments`)
      }

      // Delete subscription history for subscriptions we're deleting
      if (subscriptionsToDelete.length > 0) {
        const deletedHistory = await prisma.subscriptionHistory.deleteMany({
          where: {
            subscriptionId: { in: subscriptionsToDelete }
          }
        })
        console.log(`✅ Deleted ${deletedHistory.count} subscription history records`)

        // Delete the subscriptions
        const deletedSubscriptions = await prisma.subscription.deleteMany({
          where: {
            id: { in: subscriptionsToDelete }
          }
        })
        console.log(`✅ Deleted ${deletedSubscriptions.count} subscriptions`)
      }

      console.log(`\n🎉 Cleanup completed successfully!`)
    } else {
      console.log(`\n✨ No cleanup needed - billing system is already clean`)
    }

    // 7. Show final state
    const finalSubscriptions = await prisma.subscription.findMany({
      where: { userId: user.id },
      include: {
        plan: true,
        payments: true
      },
      orderBy: { createdAt: 'desc' }
    })

    const finalPayments = await prisma.payment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    })

    console.log(`\n📊 FINAL STATE:`)
    console.log(`   - Subscriptions: ${finalSubscriptions.length}`)
    console.log(`   - Payments: ${finalPayments.length}`)

    if (finalSubscriptions.length > 0) {
      console.log(`\n📋 Remaining subscriptions:`)
      finalSubscriptions.forEach((sub, index) => {
        console.log(`   ${index + 1}. ${sub.id} - ${sub.status} - ${sub.plan.name}`)
      })
    }

    console.log(`\n✅ Billing system cleanup completed!`)
    console.log(`\n💡 The recovery modal should no longer appear when selecting payment plans.`)
    console.log(`💡 Subscription cancellation should now work properly.`)

  } catch (error) {
    console.error('❌ Error during billing cleanup:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the fix
fixBillingIssues()