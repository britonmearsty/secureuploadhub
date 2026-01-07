import prisma from '../lib/prisma'

async function seedBlogData() {
  console.log('🌱 Seeding blog data...')

  try {
    // Create default categories
    const categories = [
      {
        name: 'Tutorials',
        slug: 'tutorials',
        description: 'Step-by-step guides and how-to articles',
        color: '#3B82F6'
      },
      {
        name: 'Security',
        slug: 'security',
        description: 'Security best practices and tips',
        color: '#EF4444'
      },
      {
        name: 'Features',
        slug: 'features',
        description: 'New features and product updates',
        color: '#10B981'
      },
      {
        name: 'Tips & Tricks',
        slug: 'tips-tricks',
        description: 'Helpful tips and productivity tricks',
        color: '#F59E0B'
      },
      {
        name: 'Industry News',
        slug: 'industry-news',
        description: 'Latest news and trends in file sharing',
        color: '#8B5CF6'
      }
    ]

    for (const categoryData of categories) {
      await prisma.category.upsert({
        where: { slug: categoryData.slug },
        update: categoryData,
        create: categoryData
      })
    }

    console.log(`✅ Created ${categories.length} categories`)

    // Create default tags
    const tags = [
      { name: 'File Sharing', slug: 'file-sharing', color: '#3B82F6' },
      { name: 'Cloud Storage', slug: 'cloud-storage', color: '#10B981' },
      { name: 'Productivity', slug: 'productivity', color: '#F59E0B' },
      { name: 'Collaboration', slug: 'collaboration', color: '#8B5CF6' },
      { name: 'Privacy', slug: 'privacy', color: '#EF4444' },
      { name: 'Encryption', slug: 'encryption', color: '#DC2626' },
      { name: 'Workflow', slug: 'workflow', color: '#059669' },
      { name: 'Integration', slug: 'integration', color: '#7C3AED' },
      { name: 'API', slug: 'api', color: '#1F2937' },
      { name: 'Mobile', slug: 'mobile', color: '#0891B2' },
      { name: 'Desktop', slug: 'desktop', color: '#4B5563' },
      { name: 'Web', slug: 'web', color: '#DC2626' }
    ]

    for (const tagData of tags) {
      await prisma.tag.upsert({
        where: { slug: tagData.slug },
        update: tagData,
        create: tagData
      })
    }

    console.log(`✅ Created ${tags.length} tags`)

    console.log('🎉 Blog data seeding completed successfully!')
  } catch (error) {
    console.error('❌ Error seeding blog data:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seed function
seedBlogData()