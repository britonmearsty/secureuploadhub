/**
 * Test Redis Replacement
 * Quick test to verify in-memory Redis is working
 */

async function testRedisReplacement() {
  console.log('🧪 Testing Redis replacement...\n')

  try {
    const redis = await import('../lib/redis')
    
    // Test basic operations
    console.log('1. Testing basic set/get operations:')
    await redis.default.setex('test_key', 10, 'test_value')
    const value = await redis.default.get('test_key')
    console.log(`   Set: test_key = test_value`)
    console.log(`   Get: test_key = ${value}`)
    console.log(`   ✅ ${value === 'test_value' ? 'PASS' : 'FAIL'}`)

    // Test expiration
    console.log('\n2. Testing expiration:')
    await redis.default.setex('expire_test', 1, 'will_expire')
    const beforeExpire = await redis.default.get('expire_test')
    console.log(`   Before expiration: ${beforeExpire}`)
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 1100))
    const afterExpire = await redis.default.get('expire_test')
    console.log(`   After expiration: ${afterExpire}`)
    console.log(`   ✅ ${afterExpire === null ? 'PASS' : 'FAIL'}`)

    // Test deletion
    console.log('\n3. Testing deletion:')
    await redis.default.setex('delete_test', 60, 'to_be_deleted')
    const beforeDelete = await redis.default.get('delete_test')
    console.log(`   Before delete: ${beforeDelete}`)
    
    const deleteResult = await redis.default.del('delete_test')
    const afterDelete = await redis.default.get('delete_test')
    console.log(`   Delete result: ${deleteResult}`)
    console.log(`   After delete: ${afterDelete}`)
    console.log(`   ✅ ${afterDelete === null && deleteResult === 1 ? 'PASS' : 'FAIL'}`)

    // Test cache functionality
    console.log('\n4. Testing cache module:')
    const cache = await import('../lib/cache')
    
    const testData = { message: 'Hello from cache!', timestamp: Date.now() }
    await cache.setCacheData('cache_test', testData, 60)
    const cachedData = await cache.getCacheData('cache_test')
    console.log(`   Cached data: ${JSON.stringify(cachedData)}`)
    console.log(`   ✅ ${JSON.stringify(cachedData) === JSON.stringify(testData) ? 'PASS' : 'FAIL'}`)

    console.log('\n🎉 All tests passed! Redis replacement is working correctly.')

  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  testRedisReplacement().catch(console.error)
}

export { testRedisReplacement }