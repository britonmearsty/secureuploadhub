/**
 * Test Webhook Endpoint Accessibility from External
 * This tests if Paystack can reach your webhook endpoint
 */

const https = require('https');

async function testWebhookEndpoint() {
  console.log('🔍 Testing Webhook Endpoint Accessibility...\n');
  
  const webhookUrl = 'secureuploadhub.vercel.app';
  const webhookPath = '/api/billing/webhook';
  
  console.log(`Testing: https://${webhookUrl}${webhookPath}\n`);

  // Test 1: Basic connectivity
  console.log('Test 1: Basic POST request (should return 400 for invalid signature)');
  await testBasicPost(webhookUrl, webhookPath);
  
  console.log('\n---\n');
  
  // Test 2: With signature (will still fail but different error)
  console.log('Test 2: POST with signature header');
  await testWithSignature(webhookUrl, webhookPath);
  
  console.log('\n---\n');
  
  // Test 3: Check if endpoint exists
  console.log('Test 3: Check endpoint existence');
  await testEndpointExists(webhookUrl, webhookPath);
}

function testBasicPost(hostname, path) {
  return new Promise((resolve) => {
    const options = {
      hostname,
      port: 443,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      console.log(`   Status Code: ${res.statusCode}`);
      console.log(`   Status Message: ${res.statusMessage}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log(`   Response:`, parsed);
          
          if (res.statusCode === 400 && parsed.error === 'Invalid signature') {
            console.log('   ✅ Endpoint is accessible and validating signatures');
          } else if (res.statusCode === 404) {
            console.log('   ❌ Endpoint not found - webhook route may not be deployed');
          } else {
            console.log('   ⚠️  Unexpected response');
          }
        } catch (e) {
          console.log(`   Response (raw):`, data);
        }
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error('   ❌ Connection Error:', error.message);
      resolve();
    });

    req.write(JSON.stringify({
      event: 'charge.success',
      data: { reference: 'test_external' }
    }));
    
    req.end();
  });
}

function testWithSignature(hostname, path) {
  return new Promise((resolve) => {
    const crypto = require('crypto');
    const payload = JSON.stringify({
      event: 'charge.success',
      data: { 
        reference: 'test_with_sig',
        status: 'success',
        amount: 100000
      }
    });
    
    // Create a test signature (will be wrong but shows header is accepted)
    const testSignature = crypto
      .createHmac('sha512', 'test_secret')
      .update(payload)
      .digest('hex');

    const options = {
      hostname,
      port: 443,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': testSignature
      }
    };

    const req = https.request(options, (res) => {
      console.log(`   Status Code: ${res.statusCode}`);
      console.log(`   Status Message: ${res.statusMessage}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log(`   Response:`, parsed);
          
          if (res.statusCode === 400 && parsed.error === 'Invalid signature') {
            console.log('   ✅ Signature validation is working (expected to fail with test signature)');
          }
        } catch (e) {
          console.log(`   Response (raw):`, data);
        }
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error('   ❌ Connection Error:', error.message);
      resolve();
    });

    req.write(payload);
    req.end();
  });
}

function testEndpointExists(hostname, path) {
  return new Promise((resolve) => {
    const options = {
      hostname,
      port: 443,
      path,
      method: 'OPTIONS',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      console.log(`   Status Code: ${res.statusCode}`);
      
      if (res.statusCode === 200 || res.statusCode === 204 || res.statusCode === 405) {
        console.log('   ✅ Endpoint exists and is reachable');
      } else if (res.statusCode === 404) {
        console.log('   ❌ Endpoint not found');
      }
      
      resolve();
    });

    req.on('error', (error) => {
      console.error('   ❌ Connection Error:', error.message);
      resolve();
    });

    req.end();
  });
}

// Run the tests
console.log('═══════════════════════════════════════════════════════');
console.log('  WEBHOOK ENDPOINT EXTERNAL ACCESSIBILITY TEST');
console.log('═══════════════════════════════════════════════════════\n');

testWebhookEndpoint()
  .then(() => {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  TEST COMPLETE');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('📋 NEXT STEPS:\n');
    console.log('1. If endpoint is accessible (✅):');
    console.log('   → Check Paystack Dashboard webhook configuration');
    console.log('   → Check Paystack webhook delivery logs');
    console.log('   → Verify webhook secret matches\n');
    
    console.log('2. If endpoint not found (❌):');
    console.log('   → Verify deployment on Vercel');
    console.log('   → Check if route file exists');
    console.log('   → Redeploy the application\n');
    
    console.log('3. Check Vercel logs for webhook attempts:');
    console.log('   → https://vercel.com/your-project/logs');
    console.log('   → Filter by: /api/billing/webhook\n');
  })
  .catch(console.error);
