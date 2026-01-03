#!/usr/bin/env tsx

import 'dotenv/config'
import prisma from '../lib/prisma'

async function createAdmin() {
  const email = process.argv[2]
  
  if (!email) {
    console.error('Usage: npm run create-admin <email>')
    console.error('Example: npm run create-admin admin@example.com')
    process.exit(1)
  }

  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true }
    })

    if (!existingUser) {
      console.error(`❌ User with email "${email}" not found.`)
      console.log('💡 The user must sign in at least once before being made an admin.')
      process.exit(1)
    }

    if (existingUser.role === 'admin') {
      console.log(`✅ User "${email}" is already an admin.`)
      process.exit(0)
    }

    // Update user to admin
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { role: 'admin' },
      select: { id: true, email: true, name: true, role: true }
    })

    console.log('✅ Admin user created successfully!')
    console.log(`📧 Email: ${updatedUser.email}`)
    console.log(`👤 Name: ${updatedUser.name || 'Not set'}`)
    console.log(`🔑 Role: ${updatedUser.role}`)
    console.log(`🆔 ID: ${updatedUser.id}`)
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()