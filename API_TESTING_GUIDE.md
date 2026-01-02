# API Testing Guide

This guide provides comprehensive information about the API test suite for the SecureUploadHub application.

## 🎯 Overview

The API test suite provides complete coverage for all API routes in the application, including:

- **Authentication & Authorization** - NextAuth integration, session management, role-based access
- **Portal Management** - CRUD operations, validation, configuration
- **File Upload System** - Standard, resumable, and chunked uploads with validation
- **Upload Management** - Listing, filtering, deletion, downloads
- **Dashboard** - Data aggregation, statistics, caching
- **Billing System** - Plans, subscriptions, payments, webhooks
- **Admin Operations** - User management, analytics, audit logging
- **Storage Management** - Cloud storage integration, folder operations
- **Public API** - Portal access, password verification
- **Newsletter** - Subscription management

## 🏗️ Test Architecture

### Test Structure
```
__tests__/api/
├── auth.test.ts           # Authentication routes
├── portals.test.ts        # Portal management
├── upload.test.ts         # File upload functionality
├── uploads.test.ts        # Upload management
├── dashboard.test.ts      # Dashboard data
├── billing.test.ts        # Billing & subscriptions
├── admin.test.ts          # Admin operations
├── storage.test.ts        # Storage management
├── public.test.ts         # Public portal access
├── newsletter.test.ts     # Newsletter subscriptions
├── test-runner.ts         # Test execution utilities
└── README.md             # Test documentation
```

### Test Categories

#### 🔐 Authentication Tests (`auth.test.ts`)
- NextAuth handler exports (GET/POST)
- Request/response handling
- Error scenarios

#### 🏢 Portal Management (`portals.test.ts`)
- Portal creation with validation
- Slug uniqueness checks
- Storage provider validation
- Password hashing
- Portal limits enforcement
- Cache invalidation

#### 📤 Upload System (`upload.test.ts`)
- File validation (size, type, format)
- Client information validation
- Portal password verification
- Malware scanning integration
- Cloud storage upload
- Email notifications
- Billing limit checks

#### 📋 Upload Management (`uploads.test.ts`)
- Upload listing and filtering
- Portal ownership validation
- File downloads with streaming
- Google Drive file recovery
- Upload deletion with cleanup
- Client-based filtering

#### 📊 Dashboard (`dashboard.test.ts`)
- Data aggregation from multiple sources
- Statistics calculation
- Redis caching with TTL
- Cache invalidation
- Performance optimization

#### 💳 Billing System (`billing.test.ts`)
- Plan management
- Subscription lifecycle (create/cancel)
- Paystack integration
- Webhook signature verification
- Payment processing
- Invoice generation

#### 👨‍💼 Admin Operations (`admin.test.ts`)
- User management (CRUD, bulk operations)
- Role and status management
- Portal administration
- Analytics and reporting
- Audit logging
- System settings

#### ☁️ Storage Management (`storage.test.ts`)
- Connected account management
- Folder operations (CRUD)
- Provider-specific error handling
- Sync settings management
- Token validation

#### 🌐 Public API (`public.test.ts`)
- Portal configuration exposure
- Password verification with JWT
- Security validation
- Error handling

#### 📧 Newsletter (`newsletter.test.ts`)
- Email subscription/unsubscription
- Email format validation
- Welcome email integration
- Status management

## 🧪 Test Patterns

### Mocking Strategy

#### External Services
```typescript
vi.mock('@/lib/storage', () => ({
  uploadToCloudStorage: vi.fn(),
  downloadFromCloudStorage: vi.fn(),
  deleteFromCloudStorage: vi.fn(),
}))

vi.mock('@/lib/billing', () => ({
  getPaystack: vi.fn(),
  assertUploadAllowed: vi.fn(),
}))
```

#### Database Operations
```typescript
vi.mock('@/lib/prisma', () => ({
  default: {
    uploadPortal: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    // ... other models
  },
}))
```

#### Authentication
```typescript
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

// Usage in tests
vi.mocked(auth).mockResolvedValue({
  user: { id: 'user-1', role: 'admin' }
})
```

### Error Testing Patterns

#### Authentication Errors
```typescript
it('should return 401 when user is not authenticated', async () => {
  vi.mocked(auth).mockResolvedValue(null)
  
  const response = await GET()
  const data = await response.json()
  
  expect(response.status).toBe(401)
  expect(data.error).toBe('Unauthorized')
})
```

#### Validation Errors
```typescript
it('should return 400 when required fields are missing', async () => {
  const request = new NextRequest('http://localhost:3000/api/portals', {
    method: 'POST',
    body: JSON.stringify({ name: 'Test' }), // Missing required fields
  })
  
  const response = await POST(request)
  const data = await response.json()
  
  expect(response.status).toBe(400)
  expect(data.error).toContain('required')
})
```

#### Database Errors
```typescript
it('should handle database errors', async () => {
  vi.mocked(prisma.uploadPortal.findMany).mockRejectedValue(new Error('DB Error'))
  
  const response = await GET()
  const data = await response.json()
  
  expect(response.status).toBe(500)
  expect(data.error).toBe('Internal server error')
})
```

### File Upload Testing

#### FormData Creation
```typescript
const createMockFormData = (overrides: Record<string, any> = {}) => {
  const formData = new FormData()
  formData.append('file', new File(['content'], 'test.txt', { type: 'text/plain' }))
  formData.append('portalId', 'portal-1')
  
  Object.entries(overrides).forEach(([key, value]) => {
    if (value === null) {
      formData.delete(key)
    } else {
      formData.set(key, value)
    }
  })
  
  return formData
}
```

#### Stream Testing
```typescript
const mockFileStream = new ReadableStream({
  start(controller) {
    controller.enqueue(new TextEncoder().encode('file content'))
    controller.close()
  },
})

vi.mocked(downloadFromCloudStorage).mockResolvedValue(mockFileStream)
```

## 🚀 Running Tests

### Quick Commands
```bash
# Run all API tests
npm run test:api

# Run with coverage
npm run test:api:coverage

# Watch mode
npm run test:api:watch

# Run all tests (including non-API)
npm run test:all
```

### Test Runner Utility
```bash
# List available test suites
npx tsx __tests__/api/test-runner.ts --list

# Run specific suite
npx tsx __tests__/api/test-runner.ts --suite core-functionality

# Run specific file
npx tsx __tests__/api/test-runner.ts --file portals.test.ts --watch

# Generate comprehensive report
npx tsx __tests__/api/test-runner.ts --report
```

### Individual Test Files
```bash
# Run specific test file
npx vitest __tests__/api/portals.test.ts

# Run with coverage
npx vitest __tests__/api/upload.test.ts --coverage

# Watch mode
npx vitest __tests__/api/dashboard.test.ts --watch
```

## 📊 Test Coverage

### Coverage Targets
- **Lines**: > 90%
- **Functions**: > 90%
- **Branches**: > 85%
- **Statements**: > 90%

### Coverage Reports
```bash
# Generate coverage report
npm run test:api:coverage

# View HTML report
open coverage/index.html
```

### Excluded from Coverage
- Node modules
- Build artifacts
- Test files themselves
- Configuration files

## 🔧 Configuration

### Vitest Configuration (`vitest.config.ts`)
```typescript
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    testTimeout: 30000,
    setupFiles: ['__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
})
```

### Test Setup (`__tests__/setup.ts`)
- Environment variables
- Global mocks
- Console suppression
- DOM utilities

## 🛠️ Best Practices

### Test Organization
1. **Group by functionality** - Related tests in same file
2. **Descriptive names** - Clear test descriptions
3. **Arrange-Act-Assert** - Consistent test structure
4. **Mock management** - Clean setup/teardown

### Mock Management
```typescript
describe('API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })
})
```

### Error Testing
- Test all error paths
- Verify error messages
- Check HTTP status codes
- Validate error response format

### Data Validation
- Test input validation
- Check boundary conditions
- Verify data transformations
- Ensure proper sanitization

## 🐛 Debugging Tests

### Common Issues

#### Mock Not Working
```typescript
// ❌ Wrong - mock after import
import { auth } from '@/lib/auth'
vi.mock('@/lib/auth')

// ✅ Correct - mock before import
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))
import { auth } from '@/lib/auth'
```

#### Async Issues
```typescript
// ❌ Wrong - not awaiting async mock
vi.mocked(auth).mockResolvedValue(session)
const response = GET() // Missing await

// ✅ Correct - await async operations
vi.mocked(auth).mockResolvedValue(session)
const response = await GET()
```

#### FormData Issues
```typescript
// ❌ Wrong - incorrect FormData usage
const formData = { file: mockFile }

// ✅ Correct - proper FormData
const formData = new FormData()
formData.append('file', mockFile)
```

### Debug Commands
```bash
# Run single test with debug output
npx vitest __tests__/api/portals.test.ts --reporter=verbose

# Run with console output
npx vitest __tests__/api/upload.test.ts --no-coverage --reporter=verbose
```

## 📈 Continuous Integration

### GitHub Actions Integration
```yaml
- name: Run API Tests
  run: npm run test:api:coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```

### Pre-commit Hooks
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:api"
    }
  }
}
```

## 🔄 Maintenance

### Adding New Tests
1. Create test file following naming convention
2. Include comprehensive error testing
3. Add to appropriate test suite
4. Update documentation

### Updating Existing Tests
1. Update tests when API changes
2. Maintain mock compatibility
3. Verify coverage remains high
4. Update documentation

### Performance Monitoring
- Monitor test execution time
- Optimize slow tests
- Use parallel execution
- Cache test dependencies

## 📚 Resources

### Documentation
- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Next.js Testing](https://nextjs.org/docs/testing)

### Tools
- **Vitest**: Test runner and assertions
- **jsdom**: DOM environment simulation
- **@testing-library/jest-dom**: DOM matchers
- **tsx**: TypeScript execution

### Examples
See individual test files for comprehensive examples of:
- Authentication testing
- File upload testing
- Database operation testing
- Error handling testing
- Mock management
- Async operation testing