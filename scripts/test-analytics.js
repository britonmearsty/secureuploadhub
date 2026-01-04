#!/usr/bin/env node

/**
 * Analytics Testing Script
 * Tests all analytics endpoints to ensure they're working properly
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testEndpoint(endpoint, description) {
  try {
    console.log(`Testing ${description}...`);
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ ${description} - Status: ${response.status}`);
      console.log(`   Data keys: ${Object.keys(data).join(', ')}`);
      return true;
    } else {
      console.log(`❌ ${description} - Status: ${response.status}`);
      const errorText = await response.text();
      console.log(`   Error: ${errorText}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${description} - Error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Analytics API Tests\n');
  
  const tests = [
    ['/api/admin/analytics', 'Main Analytics Endpoint'],
    ['/api/admin/analytics/dashboard?period=30d', 'Dashboard Analytics'],
    ['/api/admin/analytics/users?period=30d', 'User Analytics'],
    ['/api/admin/analytics/uploads?period=30d', 'Upload Analytics'],
    ['/api/admin/analytics/performance?period=24h', 'Performance Analytics'],
    ['/api/admin/analytics/export?period=30d&format=json&type=dashboard', 'Export Analytics'],
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const [endpoint, description] of tests) {
    const success = await testEndpoint(endpoint, description);
    if (success) passed++;
    console.log(''); // Empty line for readability
  }
  
  console.log(`📊 Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All analytics endpoints are working correctly!');
    process.exit(0);
  } else {
    console.log('⚠️  Some analytics endpoints need attention.');
    process.exit(1);
  }
}

// Run the tests
runTests().catch(console.error);