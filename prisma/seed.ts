
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
    const plans = [
        {
            id: 'free',
            name: 'Free',
            description: 'Default free tier',
            price: 0,
            currency: 'USD',
            features: [
                '1 portal',
                '1GB total storage',
                '100 uploads per month',
            ],
            maxPortals: 1,
            maxStorageGB: 1,
            maxUploadsMonth: 100,
        },
        {
            name: 'Starter',
            description: 'Perfect for individuals and small projects.',
            price: 15,
            currency: 'USD',
            features: [
                '3 Portals',
                '10GB Storage',
                '500 Uploads / month',
                'Custom Branding (Logo & Colors)',
                'Email Support',
            ],
            maxPortals: 3,
            maxStorageGB: 10,
            maxUploadsMonth: 500,
        },
        {
            name: 'Pro',
            description: 'Ideal for growing businesses needing more capacity.',
            price: 49,
            currency: 'USD',
            features: [
                '10 Portals',
                '50GB Storage',
                '2,000 Uploads / month',
                'Advanced Branding (Backgrounds)',
                'Priority Support',
                'Password Protected Portals',
            ],
            maxPortals: 10,
            maxStorageGB: 50,
            maxUploadsMonth: 2000,
        },
        {
            name: 'Enterprise',
            description: 'Full power for large organizations.',
            price: 199,
            currency: 'USD',
            features: [
                'Unlimited Portals',
                '500GB Storage',
                'Unlimited Uploads',
                'Dedicated Support',
                'SLA Guarantee',
                'API Access',
            ],
            maxPortals: 999,
            maxStorageGB: 500,
            maxUploadsMonth: 999999,
        },
    ]

    console.log('Seeding billing plans...')

    for (const plan of plans) {
        await prisma.billingPlan.upsert({
            where: { name: plan.name },
            update: plan,
            create: plan,
        })
    }

    console.log('Seeding completed successfully.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
