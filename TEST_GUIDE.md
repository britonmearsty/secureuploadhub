# Upload Speed Improvements - Test Suite Guide

This document describes the comprehensive test suite for all upload speed improvements.

## Test Files Overview

### 1. **Chunked Upload Tests** (`__tests__/lib/chunked-upload.test.ts`)

Tests for parallel chunk upload functionality.

**Test Coverage:**
- `createChunks()` - File splitting logic
  - ✅ Correct chunk size (5MB default)
  - ✅ Handles file smaller than chunk size
  - ✅ Preserves data across chunks
  - ✅ Handles very small chunk sizes

- `uploadFileInChunks()` - Main upload orchestrator
  - ✅ Initializes upload session
  - ✅ Handles single-chunk files
  - ✅ Gracefully handles errors
  - ✅ Tracks progress with callback
  - ✅ Can disable compression

**Run Tests:**
```bash
npm test -- chunked-upload.test
```

---

### 2. **Compression Tests** (`__tests__/lib/compression.test.ts`)

Tests for client-side file compression.

**Test Coverage:**
- `isCompressible()` - Type detection
  - ✅ Identifies image types
  - ✅ Identifies text types
  - ✅ Identifies document types
  - ✅ Rejects non-compressible types

- `compressText()` - Text/JSON minification
  - ✅ Minifies JSON
  - ✅ Minifies XML
  - ✅ Skips small files
  - ✅ Handles invalid JSON

- `preprocessFile()` - Main compression pipeline
  - ✅ Skips non-compressible types
  - ✅ Can be disabled
  - ✅ Handles compression errors
  - ✅ Preserves file types

**Run Tests:**
```bash
npm test -- compression.test
```

---

### 3. **Portal Cache Tests** (`__tests__/lib/portal-cache.test.ts`)

Tests for Redis-backed portal configuration caching.

**Test Coverage:**
- `getPortalWithCache()` - Cache retrieval
  - ✅ Returns cached portal
  - ✅ Fetches from database if not cached
  - ✅ Caches after database fetch
  - ✅ Returns null if not found
  - ✅ Handles Redis errors gracefully
  - ✅ Handles cache write errors

- `invalidatePortalCache()` - Cache invalidation
  - ✅ Deletes from cache
  - ✅ Handles deletion errors
  - ✅ Works with multiple portals

- **Performance Tests:**
  - ✅ Reduces database queries
  - ✅ Sets correct TTL (1 hour)

**Run Tests:**
```bash
npm test -- portal-cache.test
```

---

### 4. **Upload Metrics Tests** (`__tests__/lib/upload-metrics.test.ts`)

Tests for performance tracking and optimization recommendations.

**Test Coverage:**
- `calculateMetrics()` - Metric calculation
  - ✅ Calculates upload speed
  - ✅ Handles very fast uploads
  - ✅ Calculates compression ratio
  - ✅ Defaults compression ratio to 1
  - ✅ Includes all metric fields

- `recordUploadMetrics()` - Metric logging
  - ✅ Logs upload metrics
  - ✅ Includes file size in output
  - ✅ Includes duration in output
  - ✅ Includes upload speed in output

- `getAverageUploadSpeed()` - Speed averaging
  - ✅ Returns 0 for empty metrics
  - ✅ Calculates average of multiple uploads

- `getOptimizationRecommendations()` - Smart suggestions
  - ✅ Recommends parallel uploads for slow speeds
  - ✅ Recommends skipping compression for low ratio
  - ✅ Warns about slow network
  - ✅ Recommends larger chunks
  - ✅ No recommendations for ideal metrics

**Run Tests:**
```bash
npm test -- upload-metrics.test
```

---

### 5. **Upload API Tests** (`__tests__/api/upload-api.test.ts`)

Tests for API route behavior and validation.

**Test Coverage:**
- `POST /api/upload/chunked/init` - Session initialization
  - ✅ Validates required fields
  - ✅ Accepts valid requests
  - ✅ Handles password protected portals
  - ✅ Validates file size limits
  - ✅ Validates file type restrictions

- `POST /api/upload/chunked/chunk` - Chunk uploads
  - ✅ Requires upload session ID
  - ✅ Validates chunk index and count
  - ✅ Rejects invalid indices

- `POST /api/upload/chunked/complete` - Upload finalization
  - ✅ Requires upload and portal ID
  - ✅ Requires complete metadata

- **Integration Tests:**
  - ✅ Security scanning integration
  - ✅ Portal validation
  - ✅ Database operations
  - ✅ Error handling
  - ✅ Billing integration

**Run Tests:**
```bash
npm test -- upload-api.test
```

---

### 6. **Storage Services Tests** (`__tests__/lib/storage-services.test.ts`)

Tests for Google Drive and Dropbox integration.

**Test Coverage:**
- **Google Drive Service:**
  - ✅ Creates resumable upload sessions
  - ✅ Handles folder path creation
  - ✅ Sets correct headers
  - ✅ Uses multipart upload for large files
  - ✅ Includes file metadata
  - ✅ Handles shared link creation
  - ✅ Refreshes expired tokens
  - ✅ Lists/creates folders
  - ✅ Downloads/deletes files

- **Dropbox Service:**
  - ✅ Returns batch upload URL
  - ✅ Generates session ID
  - ✅ Uses correct upload endpoint
  - ✅ Sets Dropbox API headers
  - ✅ Uses paths instead of folder IDs
  - ✅ Creates shared links
  - ✅ Manages folders by path

- **Common Tests:**
  - ✅ Service selection by provider
  - ✅ Access token expiration handling
  - ✅ Token refresh before expiry
  - ✅ Error handling
  - ✅ Retry strategy

**Run Tests:**
```bash
npm test -- storage-services.test
```

---

### 7. **Upload Component Tests** (`__tests__/components/upload-component.test.ts`)

Tests for frontend upload component behavior.

**Test Coverage:**
- **File Selection:**
  - ✅ Single file selection
  - ✅ Multiple file selection
  - ✅ File size validation
  - ✅ File type validation

- **Drag and Drop:**
  - ✅ Detects drag over
  - ✅ Detects drag leave
  - ✅ Accepts dropped files

- **Upload Progress:**
  - ✅ Tracks progress percentage
  - ✅ Handles progress events
  - ✅ Updates UI during upload

- **Client Information:**
  - ✅ Collects name if required
  - ✅ Collects email if required
  - ✅ Allows optional message
  - ✅ Validates email format

- **Password Protection:**
  - ✅ Shows input if protected
  - ✅ Verifies before upload
  - ✅ Returns JWT token
  - ✅ Includes token in request

- **Upload States:**
  - ✅ Pending state (0% progress)
  - ✅ Uploading state (0-100% progress)
  - ✅ Complete state (100% progress)
  - ✅ Error state with message

- **File Removal:**
  - ✅ Removes from queue
  - ✅ Allows before upload
  - ✅ Prevents during upload

- **Success Feedback:**
  - ✅ Shows success message
  - ✅ Shows upload duration
  - ✅ Shows file details

- **Error Handling:**
  - ✅ Displays error messages
  - ✅ Allows retry after error
  - ✅ Shows retry count

- **Accessibility:**
  - ✅ Tab navigation
  - ✅ Enter key to upload
  - ✅ Escape key to cancel

**Run Tests:**
```bash
npm test -- upload-component.test
```

---

### 8. **Integration Tests** (`__tests__/integration/upload-flow.test.ts`)

End-to-end workflow tests combining all components.

**Test Coverage:**
- **Single File Flow:**
  - ✅ File selection → validation → upload → success

- **Large File Chunked Flow:**
  - ✅ Chunking → parallel uploads → progress → completion

- **Compression Flow:**
  - ✅ Image compression → faster upload

- **Password Protected Portal:**
  - ✅ Password entry → verification → token → upload

- **Client Info Collection:**
  - ✅ Form validation → upload → storage

- **Error Recovery:**
  - ✅ Retry on network failure
  - ✅ Skip failed chunks and retry

- **Multiple Files:**
  - ✅ Sequential upload of multiple files
  - ✅ Success summary

- **Performance Metrics:**
  - ✅ Track upload duration
  - ✅ Calculate upload speed
  - ✅ Log to console
  - ✅ Send to analytics

- **Cache Invalidation:**
  - ✅ Invalidate portal cache after upload
  - ✅ Fetch fresh data on next request

**Run Tests:**
```bash
npm test -- upload-flow.test
```

---

## Running All Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- chunked-upload

# Run tests matching pattern
npm test -- --grep "should compress"
```

---

## Test Coverage Goals

| Module | Coverage | Tests |
|--------|----------|-------|
| chunked-upload.ts | 95%+ | 7 |
| compression.ts | 90%+ | 10 |
| portal-cache.ts | 95%+ | 10 |
| upload-metrics.ts | 95%+ | 15 |
| API routes | 85%+ | 18 |
| Storage services | 90%+ | 25 |
| Upload component | 90%+ | 30 |
| Integration flows | 80%+ | 10 |
| **Total** | **~90%** | **~125 tests** |

---

## Performance Test Benchmarks

When running performance tests, expect these results:

### Upload Speeds
- Small file (< 5MB): ~1-2 seconds
- Medium file (10-50MB): ~2-5 seconds with compression
- Large file (100+ MB): ~5-15 seconds with parallel chunks

### Compression Ratios
- Images (JPEG → WebP): 30-50% reduction
- Text (JSON): 40-70% reduction  
- PDFs: 10-30% reduction

### Database Query Reduction
- Without cache: ~3-5 queries per upload
- With cache: ~0 queries per upload (after warmup)
- Cache hit rate: >95% for repeated portals

---

## Debugging Failed Tests

### Common Issues

1. **Mock setup errors:**
   ```bash
   # Ensure all imports are mocked before use
   # Check vi.mock() calls at top of test file
   ```

2. **Async timing issues:**
   ```bash
   # Use async/await properly
   await function()
   expect(result).toBe(expected)
   ```

3. **File size calculations:**
   ```bash
   # 1MB = 1024 * 1024 bytes (1,048,576)
   # 5MB = 5 * 1024 * 1024 = 5,242,880
   ```

4. **Progress calculation:**
   ```bash
   # Progress: Math.round((loaded / total) * 100)
   # Not: (loaded / total) * 100
   ```

---

## Test Best Practices

1. **Unit Tests:** Test individual functions in isolation
2. **Integration Tests:** Test workflows combining multiple modules
3. **Mocking:** Mock external dependencies (redis, prisma)
4. **Cleanup:** Always use `beforeEach()` to reset mocks
5. **Assertions:** Be specific about expected values
6. **Edge Cases:** Test boundary conditions and errors

---

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: Run tests
  run: npm test -- --coverage
  
- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/coverage-final.json
```

---

## Monitoring Tests in Production

After deployment, monitor these metrics:

1. **Upload success rate:** Should be > 99%
2. **Average upload time:** Should be 3-5x faster
3. **Parallel chunk efficiency:** Should be 3-4x
4. **Compression effectiveness:** Images 30-50% smaller
5. **Cache hit rate:** Should be > 95%
6. **Error rates:** Should be < 0.5%

---

## Continuous Improvement

Based on test results, consider:

1. **Increase chunk parallelism** if not hitting network limits
2. **Improve compression** for common file types
3. **Optimize cache TTL** based on portal update frequency
4. **Add more retry logic** for unreliable networks
5. **Implement bandwidth throttling** per user

---

## Questions & Support

For test issues or improvements:
1. Check test output for specific failures
2. Review related source code for context
3. Run tests in watch mode for debugging
4. Use `console.log()` in tests (visible with `-t` flag)

---

**Total Test Count:** ~125 tests
**Estimated Execution Time:** < 30 seconds
**Coverage Target:** 90%+
