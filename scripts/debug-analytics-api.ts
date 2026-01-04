#!/usr/bin/env tsx

/**
 * Debug Analytics API Script
 * Tests the analytics API endpoints to identify issues
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function testDashboardDataGeneration() {
  console.log('🔍 Testing Dashboard Data Generation\n');
  
  try {
    // Test the same logic as the dashboard API
    const period = '30d';
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - 30);

    console.log(`Period: ${period}`);
    console.log(`Start Date: ${startDate.toISOString()}`);
    console.log(`End Date: ${now.toISOString()}\n`);

    // Test basic counts
    const [
      totalUsers,
      totalPortals,
      totalUploads,
      totalStorage,
      activeUsers,
      newUsers,
      newPortals,
      newUploads,
    ] = await Promise.allSettled([
      prisma.user.count(),
      prisma.uploadPortal.count(),
      prisma.fileUpload.count(),
      prisma.fileUpload.aggregate({
        _sum: { fileSize: true },
      }),
      
      // Active users (users with recent activity)
      prisma.user.count({
        where: {
          OR: [
            {
              uploadPortals: {
                some: {
                  createdAt: { gte: startDate }
                }
              }
            },
            {
              fileUploads: {
                some: {
                  createdAt: { gte: startDate }
                }
              }
            }
          ]
        }
      }),
      
      // New users in period
      prisma.user.count({
        where: {
          createdAt: { gte: startDate },
        },
      }),
      
      // New portals in period
      prisma.uploadPortal.count({
        where: {
          createdAt: { gte: startDate },
        },
      }),
      
      // New uploads in period
      prisma.fileUpload.count({
        where: {
          createdAt: { gte: startDate },
        },
      }),
    ]);

    console.log('📊 Basic Metrics:');
    console.log(`Total Users: ${totalUsers.status === 'fulfilled' ? totalUsers.value : 'ERROR'}`);
    console.log(`Total Portals: ${totalPortals.status === 'fulfilled' ? totalPortals.value : 'ERROR'}`);
    console.log(`Total Uploads: ${totalUploads.status === 'fulfilled' ? totalUploads.value : 'ERROR'}`);
    console.log(`Total Storage: ${totalStorage.status === 'fulfilled' ? (totalStorage.value._sum.fileSize || 0) : 'ERROR'} bytes`);
    console.log(`Active Users: ${activeUsers.status === 'fulfilled' ? activeUsers.value : 'ERROR'}`);
    console.log(`New Users: ${newUsers.status === 'fulfilled' ? newUsers.value : 'ERROR'}`);
    console.log(`New Portals: ${newPortals.status === 'fulfilled' ? newPortals.value : 'ERROR'}`);
    console.log(`New Uploads: ${newUploads.status === 'fulfilled' ? newUploads.value : 'ERROR'}\n`);

    // Test recent uploads
    console.log('📋 Testing Recent Uploads:');
    try {
      const recentUploads = await prisma.fileUpload.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          portal: {
            select: { name: true },
          },
        },
      });

      console.log(`Found ${recentUploads.length} recent uploads:`);
      recentUploads.forEach((upload, index) => {
        console.log(`  ${index + 1}. ${upload.fileName} (${upload.fileSize} bytes) - Portal: ${upload.portal.name}`);
      });
    } catch (error) {
      console.log(`❌ Error fetching recent uploads: ${error}`);
    }

    console.log('\n📈 Testing Top Portals:');
    try {
      const topPortals = await prisma.uploadPortal.findMany({
        take: 5,
        include: {
          _count: {
            select: { uploads: true },
          },
          user: {
            select: { name: true, email: true },
          },
        },
        orderBy: {
          uploads: {
            _count: 'desc',
          },
        },
      });

      console.log(`Found ${topPortals.length} portals:`);
      topPortals.forEach((portal, index) => {
        console.log(`  ${index + 1}. ${portal.name} - ${portal._count.uploads} uploads - Owner: ${portal.user.email}`);
      });
    } catch (error) {
      console.log(`❌ Error fetching top portals: ${error}`);
    }

    console.log('\n📊 Testing Analytics Data:');
    try {
      const analyticsCount = await prisma.analyticsData.count();
      const recentAnalytics = await prisma.analyticsData.findMany({
        take: 5,
        orderBy: { recordedAt: 'desc' }
      });

      console.log(`Found ${analyticsCount} analytics records:`);
      recentAnalytics.forEach((record, index) => {
        console.log(`  ${index + 1}. ${record.metric}: ${record.value} (${record.period}) - ${record.recordedAt.toISOString().split('T')[0]}`);
      });
    } catch (error) {
      console.log(`❌ Error fetching analytics data: ${error}`);
    }

    console.log('\n✅ Dashboard data generation test completed successfully!');

  } catch (error) {
    console.error('❌ Error in dashboard data generation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testDashboardDataGeneration().catch(console.error);