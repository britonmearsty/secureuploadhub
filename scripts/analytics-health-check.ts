#!/usr/bin/env tsx

/**
 * Analytics Health Check Script
 * Verifies that all analytics data is being fetched and displayed correctly
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface HealthCheckResult {
  component: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  data?: any;
}

async function checkDatabaseConnection(): Promise<HealthCheckResult> {
  try {
    await prisma.$connect();
    return {
      component: 'Database Connection',
      status: 'healthy',
      message: 'Successfully connected to database'
    };
  } catch (error) {
    return {
      component: 'Database Connection',
      status: 'error',
      message: `Failed to connect to database: ${error}`
    };
  }
}

async function checkCoreDataTables(): Promise<HealthCheckResult> {
  try {
    const [userCount, portalCount, uploadCount] = await Promise.all([
      prisma.user.count(),
      prisma.uploadPortal.count(),
      prisma.fileUpload.count()
    ]);

    return {
      component: 'Core Data Tables',
      status: 'healthy',
      message: 'All core tables accessible',
      data: {
        users: userCount,
        portals: portalCount,
        uploads: uploadCount
      }
    };
  } catch (error) {
    return {
      component: 'Core Data Tables',
      status: 'error',
      message: `Failed to access core tables: ${error}`
    };
  }
}

async function checkAnalyticsDataTable(): Promise<HealthCheckResult> {
  try {
    const analyticsCount = await prisma.analyticsData.count();
    const recentAnalytics = await prisma.analyticsData.findMany({
      take: 5,
      orderBy: { recordedAt: 'desc' }
    });

    if (analyticsCount === 0) {
      return {
        component: 'Analytics Data Table',
        status: 'warning',
        message: 'No analytics data found - consider running seed script',
        data: { count: analyticsCount }
      };
    }

    return {
      component: 'Analytics Data Table',
      status: 'healthy',
      message: `Found ${analyticsCount} analytics records`,
      data: {
        count: analyticsCount,
        recentMetrics: recentAnalytics.map(a => a.metric)
      }
    };
  } catch (error) {
    return {
      component: 'Analytics Data Table',
      status: 'error',
      message: `Failed to access analytics data: ${error}`
    };
  }
}

async function checkPerformanceMetrics(): Promise<HealthCheckResult> {
  try {
    const metricsCount = await prisma.performanceMetric.count();
    const recentMetrics = await prisma.performanceMetric.findMany({
      take: 5,
      orderBy: { recordedAt: 'desc' }
    });

    if (metricsCount === 0) {
      return {
        component: 'Performance Metrics',
        status: 'warning',
        message: 'No performance metrics found - consider running seed script',
        data: { count: metricsCount }
      };
    }

    return {
      component: 'Performance Metrics',
      status: 'healthy',
      message: `Found ${metricsCount} performance metrics`,
      data: {
        count: metricsCount,
        recentEndpoints: recentMetrics.map(m => m.endpoint)
      }
    };
  } catch (error) {
    return {
      component: 'Performance Metrics',
      status: 'error',
      message: `Failed to access performance metrics: ${error}`
    };
  }
}

async function checkSystemHealth(): Promise<HealthCheckResult> {
  try {
    const healthCount = await prisma.systemHealth.count();
    const recentHealth = await prisma.systemHealth.findMany({
      take: 5,
      orderBy: { checkedAt: 'desc' }
    });

    if (healthCount === 0) {
      return {
        component: 'System Health',
        status: 'warning',
        message: 'No system health data found - consider running seed script',
        data: { count: healthCount }
      };
    }

    return {
      component: 'System Health',
      status: 'healthy',
      message: `Found ${healthCount} health records`,
      data: {
        count: healthCount,
        recentComponents: recentHealth.map(h => h.component)
      }
    };
  } catch (error) {
    return {
      component: 'System Health',
      status: 'error',
      message: `Failed to access system health: ${error}`
    };
  }
}

async function checkBillingTables(): Promise<HealthCheckResult> {
  try {
    const [planCount, subscriptionCount, paymentCount] = await Promise.all([
      prisma.billingPlan.count(),
      prisma.subscription.count(),
      prisma.payment.count()
    ]);

    return {
      component: 'Billing Tables',
      status: 'healthy',
      message: 'All billing tables accessible',
      data: {
        plans: planCount,
        subscriptions: subscriptionCount,
        payments: paymentCount
      }
    };
  } catch (error) {
    return {
      component: 'Billing Tables',
      status: 'warning',
      message: `Billing tables may not exist or be accessible: ${error}`,
      data: { plans: 0, subscriptions: 0, payments: 0 }
    };
  }
}

async function checkAuditLogs(): Promise<HealthCheckResult> {
  try {
    const auditCount = await prisma.auditLog.count();
    
    return {
      component: 'Audit Logs',
      status: auditCount > 0 ? 'healthy' : 'warning',
      message: auditCount > 0 ? `Found ${auditCount} audit log entries` : 'No audit logs found',
      data: { count: auditCount }
    };
  } catch (error) {
    return {
      component: 'Audit Logs',
      status: 'warning',
      message: `Audit logs may not be accessible: ${error}`,
      data: { count: 0 }
    };
  }
}

async function runHealthCheck() {
  console.log('🏥 Starting Analytics Health Check\n');
  
  const checks = [
    checkDatabaseConnection,
    checkCoreDataTables,
    checkAnalyticsDataTable,
    checkPerformanceMetrics,
    checkSystemHealth,
    checkBillingTables,
    checkAuditLogs
  ];
  
  const results: HealthCheckResult[] = [];
  
  for (const check of checks) {
    const result = await check();
    results.push(result);
    
    const statusIcon = result.status === 'healthy' ? '✅' : 
                      result.status === 'warning' ? '⚠️' : '❌';
    
    console.log(`${statusIcon} ${result.component}: ${result.message}`);
    if (result.data) {
      console.log(`   Data: ${JSON.stringify(result.data, null, 2)}`);
    }
    console.log('');
  }
  
  // Summary
  const healthy = results.filter(r => r.status === 'healthy').length;
  const warnings = results.filter(r => r.status === 'warning').length;
  const errors = results.filter(r => r.status === 'error').length;
  
  console.log('📊 Health Check Summary:');
  console.log(`   ✅ Healthy: ${healthy}`);
  console.log(`   ⚠️  Warnings: ${warnings}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log('');
  
  if (errors > 0) {
    console.log('🚨 Critical issues found! Analytics may not work properly.');
    console.log('   Please fix the errors above before using analytics.');
  } else if (warnings > 0) {
    console.log('⚠️  Some components have warnings but analytics should still work.');
    console.log('   Consider running: npm run db:seed to populate sample data.');
  } else {
    console.log('🎉 All analytics components are healthy!');
  }
  
  await prisma.$disconnect();
  process.exit(errors > 0 ? 1 : 0);
}

// Run the health check
runHealthCheck().catch(console.error);