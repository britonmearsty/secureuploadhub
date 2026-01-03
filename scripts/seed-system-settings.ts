#!/usr/bin/env tsx

import 'dotenv/config'
import prisma from '../lib/prisma'

async function seedSystemSettings() {
  try {
    console.log('🌱 Seeding system settings...')

    const settings = [
      {
        key: 'max_upload_size',
        value: '100',
        type: 'number',
        description: 'Maximum file upload size in MB',
        category: 'storage',
        isPublic: true
      },
      {
        key: 'maintenance_mode',
        value: 'false',
        type: 'boolean',
        description: 'Enable maintenance mode to prevent new uploads',
        category: 'general',
        isPublic: false
      },
      {
        key: 'smtp_host',
        value: 'smtp.gmail.com',
        type: 'string',
        description: 'SMTP server hostname for email delivery',
        category: 'email',
        isPublic: false
      },
      {
        key: 'default_portal_expiry',
        value: '30',
        type: 'number',
        description: 'Default portal expiry in days',
        category: 'general',
        isPublic: true
      },
      {
        key: 'security_headers',
        value: '{"X-Frame-Options": "DENY", "X-Content-Type-Options": "nosniff"}',
        type: 'json',
        description: 'Security headers to include in responses',
        category: 'security',
        isPublic: false
      }
    ]

    for (const setting of settings) {
      await prisma.systemSetting.upsert({
        where: { key: setting.key },
        update: setting,
        create: setting
      })
    }

    console.log(`✅ Seeded ${settings.length} system settings`)
    console.log('📊 System settings seeded successfully!')

  } catch (error) {
    console.error('❌ Error seeding system settings:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seedSystemSettings()