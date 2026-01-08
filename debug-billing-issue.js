/**
 * Debug script to investigate billing issues
 * Run with: node debug-billing-issue.js <userId>
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function debugBillingIssue(userId) {
  console.log(`\n🔍 Debugging billing issue for user: ${userId}`)
  
  try {
    // 1. Check user's subscriptions
    const subscriptions = await prisma.subscription.findMany({
      where: { userId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`\n📋 User Subscriptions (${subscriptions.length}):`)
    subscriptions.forEach((sub, i) => {
      console.log(`  ${i + 1}. ID: ${sub.id}`)
      console.log(`     Status: ${sub.status}`)
      console.log(`     Plan: ${sub.plan.name}`)
      console.log(`     Created: ${sub.createdAt}`)
      console.log(`     Provider Sub ID: ${sub.providerSubscriptionId || 'None'}`)
    })
    
    // 2. Check all payments for this user
    const allPayments = await prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
    
    console.log(`\n💳 Recent Payments (${allPayments.length}):`)
    allPayments.forEach((payment, i) => {
      console.log(`  ${i + 1}. ID: ${payment.id}`)
      console.log(`     Status: ${payment.status}`)
      console.log(`     Amount: ${payment.amount} ${payment.currency}`)
      console.log(`     Subscription ID: ${payment.subscriptionId || 'UNLINKED'}`)
      console.log(`     Provider Ref: ${payment.providerPaymentRef}`)
      console.log(`     Created: ${payment.createdAt}`)
      console.log(`     ---`)
    })
    
    // 3. Check for unlinked successful payments in last 30 days
    const unlinkedPayments = await prisma.payment.findMany({
      where: {
        userId,
        status: 'succeeded',
        subscriptionId: null,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`\n🔗 Unlinked Successful Payments (Last 30 days): ${unlinkedPayments.length}`)
    unlinkedPayments.forEach((payment, i) => {
      console.log(`  ${i + 1}. ID: ${payment.id}`)
      console.log(`     Amount: ${payment.amount} ${payment.currency}`)
      console.log(`     Provider Ref: ${payment.providerPaymentRef}`)
      console.log(`     Created: ${payment.createdAt}`)
    })
    
    // 4. Check for incomplete subscriptions
    const incompleteSubscriptions = subscriptions.filter(s => s.status === 'incomplete')
    
    if (incompleteSubscriptions.length > 0 && unlinkedPayments.length > 0) {
      console.log(`\n✅ POTENTIAL FIX AVAILABLE:`)
      console.log(`   - Found ${incompleteSubscriptions.length} incomplete subscription(s)`)
      console.log(`   - Found ${unlinkedPayments.length} unlinked successful payment(s)`)
      console.log(`   - These can potentially be linked manually`)
      
      console.log(`\n🔧 Suggested Actions:`)
      console.log(`   1. Use payment reference: ${unlinkedPayments[0]?.providerPaymentRef}`)
      console.log(`   2. Or run recovery API with subscription ID: ${incompleteSubscriptions[0]?.id}`)
    } else if (incompleteSubscriptions.length > 0) {
      console.log(`\n❌ ISSUE CONFIRMED:`)
      console.log(`   - Found incomplete subscription(s) but no unlinked payments`)
      console.log(`   - User may need to make a new payment`)
    } else {
      console.log(`\n✅ NO ISSUES FOUND:`)
      console.log(`   - No incomplete subscriptions found`)
    }
    
  } catch (error) {
    console.error('Error debugging billing issue:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Get userId from command line argument
const userId = process.argv[2]
if (!userId) {
  console.log('Usage: node debug-billing-issue.js <userId>')
  process.exit(1)
}

debugBillingIssue(userId)