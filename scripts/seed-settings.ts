import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { defaultSystemSettings, defaultEmailTemplates } from '../lib/default-settings';

// Create a simple Prisma client for seeding
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required for seeding');
}

const adapter = new PrismaPg({
  connectionString: connectionString,
});

const prisma = new PrismaClient({ adapter });

async function seedSettings() {
  console.log('🌱 Seeding system settings...');

  // Seed system settings
  for (const setting of defaultSystemSettings) {
    try {
      await prisma.systemSetting.upsert({
        where: { key: setting.key },
        update: {
          description: setting.description,
          category: setting.category,
          isPublic: setting.isPublic,
        },
        create: setting,
      });
      console.log(`✅ Created/updated setting: ${setting.key}`);
    } catch (error) {
      console.error(`❌ Failed to create setting ${setting.key}:`, error);
    }
  }

  // Seed email templates
  console.log('📧 Seeding email templates...');
  for (const template of defaultEmailTemplates) {
    try {
      await prisma.emailTemplate.upsert({
        where: { name: template.name },
        update: {
          subject: template.subject,
          htmlContent: template.htmlContent,
          textContent: template.textContent,
          variables: template.variables,
          category: template.category,
          description: template.description,
          isActive: template.isActive,
        },
        create: template,
      });
      console.log(`✅ Created/updated template: ${template.name}`);
    } catch (error) {
      console.error(`❌ Failed to create template ${template.name}:`, error);
    }
  }

  console.log('🎉 Seeding completed!');
}

seedSettings()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });