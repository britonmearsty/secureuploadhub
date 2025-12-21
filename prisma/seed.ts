import { PrismaClient } from '../app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding billing plans...')

  // Create billing plans
  const plans = [
    {
      name: 'Starter',
      description: 'Perfect for small businesses and freelancers',
      price: 9.99,
      currency: 'USD',
      features: [
        'Up to 3 upload portals',
        '1GB storage',
        '100 uploads per month',
        'Basic file scanning',
        'Email notifications'
      ],
      maxPortals: 3,
      maxStorageGB: 1,
      maxUploadsMonth: 100
    },
    {
      name: 'Professional',
      description: 'Ideal for growing businesses',
      price: 29.99,
      currency: 'USD',
      features: [
        'Up to 10 upload portals',
        '10GB storage',
        '1000 uploads per month',
        'Advanced file scanning',
        'Priority support',
        'Custom branding',
        'Analytics dashboard'
      ],
      maxPortals: 10,
      maxStorageGB: 10,
      maxUploadsMonth: 1000
    },
    {
      name: 'Enterprise',
      description: 'For large organizations with high volume needs',
      price: 99.99,
      currency: 'USD',
      features: [
        'Unlimited upload portals',
        '100GB storage',
        'Unlimited uploads',
        'Advanced security features',
        'Dedicated support',
        'API access',
        'Custom integrations',
        'SLA guarantee'
      ],
      maxPortals: 999999, // Effectively unlimited
      maxStorageGB: 100,
      maxUploadsMonth: 999999 // Effectively unlimited
    }
  ]

  for (const plan of plans) {
    await prisma.billingPlan.upsert({
      where: { name: plan.name },
      update: {},
      create: plan
    })
  }

  console.log('Billing plans seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })