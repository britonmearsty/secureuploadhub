
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function seedBillingPlans() {
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
}

async function seedAnalyticsData() {
    console.log('Seeding analytics data...')
    
    // Create sample analytics data for the last 30 days
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    // Generate daily analytics data
    for (let i = 0; i < 30; i++) {
        const date = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000)
        date.setHours(0, 0, 0, 0) // Set to start of day
        
        // Check if data already exists for this date and metric
        const existingUserData = await prisma.analyticsData.findFirst({
            where: {
                metric: 'user_registrations',
                period: 'daily',
                recordedAt: date
            }
        })
        
        if (!existingUserData) {
            // User registrations (random between 5-25 per day)
            const userRegistrations = Math.floor(Math.random() * 20) + 5
            await prisma.analyticsData.create({
                data: {
                    metric: 'user_registrations',
                    value: userRegistrations,
                    period: 'daily',
                    recordedAt: date,
                    metadata: { date: date.toISOString().split('T')[0] }
                }
            })
        }
        
        const existingUploadData = await prisma.analyticsData.findFirst({
            where: {
                metric: 'file_uploads',
                period: 'daily',
                recordedAt: date
            }
        })
        
        if (!existingUploadData) {
            // File uploads (random between 50-200 per day)
            const fileUploads = Math.floor(Math.random() * 150) + 50
            await prisma.analyticsData.create({
                data: {
                    metric: 'file_uploads',
                    value: fileUploads,
                    period: 'daily',
                    recordedAt: date,
                    metadata: { date: date.toISOString().split('T')[0] }
                }
            })
        }
        
        const existingStorageData = await prisma.analyticsData.findFirst({
            where: {
                metric: 'storage_usage_gb',
                period: 'daily',
                recordedAt: date
            }
        })
        
        if (!existingStorageData) {
            // Storage usage in GB (random between 10-100 GB per day)
            const storageUsage = Math.floor(Math.random() * 90) + 10
            await prisma.analyticsData.create({
                data: {
                    metric: 'storage_usage_gb',
                    value: storageUsage,
                    period: 'daily',
                    recordedAt: date,
                    metadata: { date: date.toISOString().split('T')[0] }
                }
            })
        }
        
        const existingPortalData = await prisma.analyticsData.findFirst({
            where: {
                metric: 'portal_creations',
                period: 'daily',
                recordedAt: date
            }
        })
        
        if (!existingPortalData) {
            // Portal creations (random between 2-15 per day)
            const portalCreations = Math.floor(Math.random() * 13) + 2
            await prisma.analyticsData.create({
                data: {
                    metric: 'portal_creations',
                    value: portalCreations,
                    period: 'daily',
                    recordedAt: date,
                    metadata: { date: date.toISOString().split('T')[0] }
                }
            })
        }
    }
}

async function seedPerformanceMetrics() {
    console.log('Seeding performance metrics...')
    
    const endpoints = [
        '/api/upload',
        '/api/admin/analytics',
        '/api/admin/users',
        '/api/admin/portals',
        '/api/dashboard',
        '/api/portals'
    ]
    
    const methods = ['GET', 'POST', 'PUT', 'DELETE']
    const statusCodes = [200, 201, 400, 401, 404, 500]
    
    // Generate performance metrics for the last 7 days
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(sevenDaysAgo.getTime() + i * 24 * 60 * 60 * 1000)
        
        // Generate 20-50 performance metrics per day
        const metricsCount = Math.floor(Math.random() * 30) + 20
        
        for (let j = 0; j < metricsCount; j++) {
            const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)]
            const method = methods[Math.floor(Math.random() * methods.length)]
            const statusCode = statusCodes[Math.floor(Math.random() * statusCodes.length)]
            const responseTime = Math.floor(Math.random() * 2000) + 50 // 50-2050ms
            
            const recordTime = new Date(date.getTime() + Math.random() * 24 * 60 * 60 * 1000)
            
            await prisma.performanceMetric.create({
                data: {
                    endpoint,
                    method,
                    responseTime,
                    statusCode,
                    recordedAt: recordTime,
                    errorMessage: statusCode >= 400 ? `Error ${statusCode}` : null
                }
            })
        }
    }
}

async function seedSystemHealth() {
    console.log('Seeding system health data...')
    
    const components = ['database', 'storage', 'email', 'api']
    
    for (const component of components) {
        // Check if recent health data exists (within last hour)
        const recentHealth = await prisma.systemHealth.findFirst({
            where: {
                component,
                checkedAt: {
                    gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
                }
            }
        })
        
        if (!recentHealth) {
            // Mostly healthy with occasional warnings
            const status = Math.random() > 0.8 ? 'warning' : 'healthy'
            
            await prisma.systemHealth.create({
                data: {
                    component,
                    status,
                    metrics: {
                        uptime: Math.random() * 100,
                        responseTime: Math.random() * 500,
                        errorRate: Math.random() * 5
                    },
                    checkedAt: new Date()
                }
            })
        }
    }
}

async function main() {
    await seedBillingPlans()
    await seedAnalyticsData()
    await seedPerformanceMetrics()
    await seedSystemHealth()
    
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
