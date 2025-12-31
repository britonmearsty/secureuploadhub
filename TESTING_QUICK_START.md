# Testing Quick Start Guide

## 30-Second Setup

```bash
# Install dependencies (if not done)
npm install

# Run all tests
npm test

# Done! You should see ~125 tests passing in 12-15 seconds
```

## Run Specific Feature Tests

```bash
# Test 1: Parallel Chunk Uploads
npm test -- chunked-upload

# Test 2: Compression
npm test -- compression

# Test 3: Caching
npm test -- portal-cache

# Test 4: Metrics
npm test -- upload-metrics

# Test 5: API Routes
npm test -- upload-api

# Test 6: Storage Services
npm test -- storage-services

# Test 7: Component
npm test -- upload-component

# Test 8: Integration
npm test -- upload-flow
```

## Watch Mode (Live Reload)

```bash
npm test -- --watch
# Press:
# - a to run all tests
# - f to run only failed tests
# - q to quit
```

## Coverage Report

```bash
npm test -- --coverage

# Output file: coverage/index.html
# Open in browser to see detailed coverage report
```

## Specific Test By Name

```bash
npm test -- -t "should compress image"
npm test -- -t "should track progress"
npm test -- -t "cache"
```

## Run Tests in Order

```bash
# Sequential execution (slower but clearer output)
npm test -- --run

# Parallel execution (faster, default)
npm test
```

## Debug a Failing Test

```bash
# 1. Find the failing test name
npm test

# 2. Run just that test with verbose output
npm test -- -t "test name" --reporter=verbose

# 3. Check the console.log() output in the test
npm test -- -t "test name" --reporter=verbose --no-coverage
```

## Check Test Files

All test files are in `__tests__/`:

```
__tests__/
├── lib/
│   ├── chunked-upload.test.ts       (7 tests)
│   ├── compression.test.ts          (10 tests)
│   ├── portal-cache.test.ts         (10 tests)
│   ├── upload-metrics.test.ts       (15 tests)
│   └── storage-services.test.ts     (25 tests)
├── api/
│   └── upload-api.test.ts           (18 tests)
├── components/
│   └── upload-component.test.ts     (30 tests)
└── integration/
    └── upload-flow.test.ts          (10 tests)
```

## Expected Output

```
 ✓ __tests__/lib/chunked-upload.test.ts (7)
 ✓ __tests__/lib/compression.test.ts (10)
 ✓ __tests__/lib/portal-cache.test.ts (10)
 ✓ __tests__/lib/upload-metrics.test.ts (15)
 ✓ __tests__/api/upload-api.test.ts (18)
 ✓ __tests__/lib/storage-services.test.ts (25)
 ✓ __tests__/components/upload-component.test.ts (30)
 ✓ __tests__/integration/upload-flow.test.ts (10)

Test Files  8 passed (8)
     Tests  125 passed (125)
  Start at  XX:XX:XX
  Duration  12.34s
```

## Quick Feature Check

Each test file validates one feature:

| Feature | Test File | Key Tests |
|---------|-----------|-----------|
| 5MB chunks | `chunked-upload.test.ts` | File splitting, parallel |
| Image compression | `compression.test.ts` | WebP conversion, size reduction |
| Redis cache | `portal-cache.test.ts` | Cache hit/miss, TTL |
| Performance tracking | `upload-metrics.test.ts` | Speed calculation, recommendations |
| API validation | `upload-api.test.ts` | Input validation, security |
| Cloud storage | `storage-services.test.ts` | Google Drive, Dropbox |
| UI behavior | `upload-component.test.ts` | File selection, progress, states |
| Full workflow | `upload-flow.test.ts` | End-to-end scenarios |

## Test Pass Criteria

All 125 tests must pass with:
- ✅ No failures
- ✅ No timeout errors
- ✅ ~90% coverage
- ✅ Execution time < 20 seconds

## Troubleshooting

### Tests hang
```bash
# Increase timeout
npm test -- --testTimeout=30000
```

### Module not found
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
```

### Coverage too low
```bash
# Check which files lack coverage
npm test -- --coverage
# Review coverage/lcov-report/index.html
```

### Individual test failing
```bash
# Run with verbose output
npm test -- -t "specific test name" --reporter=verbose

# Add console.log in test or source code
# Remove --no-coverage to see output
```

## CI/CD Integration

Tests automatically run on:
- Every push to main branch
- Every pull request
- Manual trigger in Actions tab

View results in GitHub Actions → Tests workflow

## Files Modified/Created

**Test files (new):**
- `__tests__/lib/chunked-upload.test.ts`
- `__tests__/lib/compression.test.ts`
- `__tests__/lib/portal-cache.test.ts`
- `__tests__/lib/upload-metrics.test.ts`
- `__tests__/api/upload-api.test.ts`
- `__tests__/lib/storage-services.test.ts`
- `__tests__/components/upload-component.test.ts`
- `__tests__/integration/upload-flow.test.ts`

**Documentation (new):**
- `TEST_GUIDE.md` - Detailed test documentation
- `TEST_SUMMARY.md` - Test suite overview
- `TESTING_QUICK_START.md` - This file

**Implementation files (modified):**
- `lib/chunked-upload.ts` - Chunking logic
- `lib/compression.ts` - Compression utilities
- `lib/portal-cache.ts` - Redis caching
- `lib/upload-metrics.ts` - Metrics tracking
- And 5 more files (see `UPLOAD_SPEED_IMPROVEMENTS.md`)

## Next Steps

1. ✅ Run tests to verify implementation
2. ✅ Review coverage report
3. ✅ Deploy to staging
4. ✅ Test in production
5. ✅ Monitor metrics

## Support

For test failures or issues:
1. Check test output for specific error
2. Review test file comments
3. Read `TEST_GUIDE.md` for detailed info
4. Check implementation file comments
5. Review `UPLOAD_SPEED_IMPROVEMENTS.md`

---

**Total Tests:** 125  
**Expected Time:** 12-15 seconds  
**Coverage Target:** 90%+  
**Status:** ✅ Ready for deployment
