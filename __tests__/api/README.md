# API Route Tests

This directory contains comprehensive test suites for all API routes in the application.

## Test Structure

### Test Files
- `auth.test.ts` - Authentication routes (`/api/auth/[...nextauth]`)
- `portals.test.ts` - Portal management (`/api/portals`)
- `upload.test.ts` - File upload functionality (`/api/upload`)
- `uploads.test.ts` - Upload management (`/api/uploads`)
- `dashboard.test.ts` - Dashboard data (`/api/dashboard`)
- `billing.test.ts` - Billing and subscriptions (`/api/billing`)
- `admin.test.ts` - Admin operations (`/api/admin`)
- `storage.test.ts` - Storage management (`/api/storage`)
- `public.test.ts` - Public portal access (`/api/public`)
- `newsletter.test.ts` - Newsletter subscriptions (`/api/newsletter`)

## Test Coverage

### Authentication & Authorization
- ✅ NextAuth handlers (GET/POST)
- ✅ Session validation
- ✅ Role-based access control
- ✅ JWT token verification

### Portal Management
- ✅ Portal CRUD operations
- ✅ Portal configuration validation
- ✅ Slug uniqueness checks
- ✅ Storage provider validation
- ✅ Password protection
- ✅ Portal limits enforcement

### File Upload System
- ✅ Standard file uploads
- ✅ Resumable uploads
- ✅ Chunked uploads
- ✅ File validation (size, type)
- ✅ Malware scanning
- ✅ Client information validation
- ✅ Upload limits enforcement
- ✅ Cloud storage integration

### Upload Management
- ✅ Upload listing and filtering
- ✅ Upload deletion
- ✅ File downloads
- ✅ Client-based filtering
- ✅ Portal ownership validation
- ✅ Google Drive file recovery

### Dashboard
- ✅ Dashboard data aggregation
- ✅ Statistics calculation
- ✅ Cache management
- ✅ Performance optimization

### Billing System
- ✅ Plan management
- ✅ Subscription creation/cancellation
- ✅ Paystack integration
- ✅ Webhook processing
- ✅ Invoice generation
- ✅ Payment tracking

### Admin Operations
- ✅ User management (CRUD)
- ✅ Bulk user operations
- ✅ Portal management
- ✅ Analytics and reporting
- ✅ Audit logging
- ✅ System settings
- ✅ Email templates

### Storage Management
- ✅ Connected accounts
- ✅ Account disconnection
- ✅ Folder operations (list, create, rename, delete)
- ✅ Sync settings
- ✅ Provider-specific error handling

### Public Access
- ✅ Public portal configuration
- ✅ Password verification
- ✅ JWT token generation
- ✅ Security validation

### Newsletter
- ✅ Email subscription
- ✅ Email unsubscription
- ✅ Email validation
- ✅ Welcome email sending

## Test Patterns

### Mocking Strategy
- **External Services**: Paystack, email services, cloud storage
- **Database**: Prisma client with mock implementations
- **Authentication**: NextAuth session mocking
- **File System**: File operations and streams
- **Cache**: Redis cache operations

### Error Handling Tests
- **Authentication Errors**: 401 Unauthorized
- **Authorization Errors**: 403 Forbidden
- **Validation Errors**: 400 Bad Request
- **Not Found Errors**: 404 Not Found
- **Server Errors**: 500 Internal Server Error
- **Conflict Errors**: 409 Conflict

### Edge Cases Covered
- Missing required fields
- Invalid data formats
- Boundary value testing
- Concurrent operations
- Network failures
- Database constraints
- File system errors
- Memory limitations

## Running Tests

### All API Tests
```bash
npm run test:api
```

### Watch Mode
```bash
npm run test:api:watch
```

### With Coverage
```bash
npm run test:api:coverage
```

### Individual Test Files
```bash
npx vitest __tests__/api/portals.test.ts
npx vitest __tests__/api/upload.test.ts
```

## Test Configuration

Tests use the following configuration:
- **Environment**: jsdom
- **Timeout**: 30 seconds
- **Setup**: `__tests__/setup.ts`
- **Mocks**: Comprehensive mocking of external dependencies
- **Coverage**: v8 provider with detailed reporting

## Best Practices

### Test Structure
1. **Arrange**: Set up mocks and test data
2. **Act**: Execute the function under test
3. **Assert**: Verify expected outcomes

### Mock Management
- Clear mocks between tests
- Restore mocks after tests
- Use specific mock implementations
- Verify mock calls and arguments

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

## Maintenance

### Adding New Tests
1. Create test file in appropriate category
2. Follow existing naming conventions
3. Include comprehensive error testing
4. Add documentation for complex scenarios

### Updating Tests
1. Update tests when API changes
2. Maintain mock compatibility
3. Verify test coverage remains high
4. Update documentation as needed

## Dependencies

### Test Framework
- **Vitest**: Test runner and assertion library
- **@testing-library/jest-dom**: DOM testing utilities
- **jsdom**: DOM environment simulation

### Mocking
- **vi.mock()**: Module mocking
- **vi.fn()**: Function mocking
- **vi.spyOn()**: Method spying

### Utilities
- **NextRequest**: HTTP request simulation
- **FormData**: File upload testing
- **ReadableStream**: Stream testing