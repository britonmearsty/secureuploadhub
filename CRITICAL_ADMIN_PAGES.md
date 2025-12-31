# Critical Admin Pages Implementation Guide

## Overview
Complete implementation of 7 critical admin dashboard pages for system management, security, billing, and configuration.

## Pages Implemented

### 1. **Security Page** (`/admin/security`)

#### Features
**Failed Login Attempts**
- Real-time display of failed authentication attempts
- Shows email, IP address, reason, and timestamp
- Color-coded alerts (red background)
- Clear all button to reset logs
- Displays up to 10 most recent attempts

**Two-Factor Authentication Status**
- Shows percentage of users with 2FA enabled
- Visual progress bar
- Overall 2FA enablement status
- Encourages users to adopt 2FA

**IP Whitelist Management**
- Add/remove IPs dynamically
- Optional description field for each IP
- List view with creation dates
- Delete button for each entry
- Collapsible form for adding new IPs

**Rate Limiting Configuration**
- View all rate limit rules
- Shows endpoint and requests per minute
- Enable/disable status
- Visual status badges

#### Data Structure
```typescript
interface FailedLogin {
    id: string
    email: string
    ipAddress: string
    userAgent?: string
    timestamp: Date
    reason: string
}

interface IPWhitelist {
    id: string
    ipAddress: string
    description: string
    createdAt: Date
}

interface RateLimitConfig {
    id: string
    endpoint: string
    requestsPerMinute: number
    enabled: boolean
}
```

#### API Endpoints
- `POST /api/admin/security/whitelist` - Add IP
- `DELETE /api/admin/security/whitelist/:id` - Remove IP
- `DELETE /api/admin/security/failed-logins` - Clear failed login logs

---

### 2. **Billing Page** (`/admin/billing`)

#### Features
**KPI Cards**
- Total Revenue (all-time)
- Active Subscriptions count
- Payment Status breakdown (Completed, Pending, Failed)

**Payment History Table**
- Email address
- Amount in USD
- Payment method (Stripe, Paystack, etc.)
- Status (Completed, Pending, Failed, Refunded)
- Transaction date
- Download invoice button
- View details button
- Filterable by status

**Payment Details Modal**
- Full transaction information
- Amount, method, status
- Timestamp
- Email address

**Subscriptions List**
- User email
- Plan name
- Current period start/end
- Status (Active, Cancelled, Paused)
- Color-coded status badges

#### Data Structure
```typescript
interface Payment {
    id: string
    email: string
    amount: number
    status: "pending" | "completed" | "failed" | "refunded"
    method: string
    invoiceUrl?: string
    createdAt: Date
    updatedAt: Date
}

interface Subscription {
    id: string
    email: string
    planName: string
    status: "active" | "cancelled" | "paused"
    currentPeriodStart: Date
    currentPeriodEnd: Date
    cancelledAt?: Date
}
```

#### Features
- Filter payments by status
- Download invoices
- View payment details
- Track subscription lifecycle
- Revenue analytics

---

### 3. **Database Page** (`/admin/database`)

#### Features
**Health Status Card**
- Overall database status (Healthy, Warning, Critical)
- Live connection count and max connections
- Query latency in milliseconds
- Total database size in GB
- Replication lag (if applicable)
- Color-coded based on status

**Database Objects**
- Table count
- Index count
- Connection pool usage with visual progress bar
- Real-time metrics

**Backup Management**
- Trigger manual backup button
- Last backup timestamp
- Backup success/failure status
- Backup history list with:
  - Timestamp
  - File size in MB
  - Status (Success, Failed, In Progress)
  - Download button for successful backups

**Migration Status**
- View all database migrations
- Status indicators (Completed, Pending, Failed)
- Execution timestamps
- Visual status icons

#### Data Structure
```typescript
interface Migration {
    name: string
    status: "pending" | "completed" | "failed"
    executedAt?: Date
}

interface BackupInfo {
    id: string
    timestamp: Date
    size: number
    status: "success" | "failed" | "in-progress"
    downloadUrl?: string
}

interface DatabaseHealthMetrics {
    status: "healthy" | "warning" | "critical"
    connections: number
    maxConnections: number
    tableCount: number
    indexCount: number
    totalSize: number
    queryLatency: number
    replicationLag?: number
}
```

#### Health Status Colors
- **Healthy**: Green (#10b981)
  - <70% connection usage
  - <50ms query latency
  - All migrations applied
  
- **Warning**: Yellow (#f59e0b)
  - 70-90% connection usage
  - 50-100ms query latency
  - Pending migrations
  
- **Critical**: Red (#ef4444)
  - >90% connection usage
  - >100ms query latency
  - Failed migrations

#### API Endpoints
- `POST /api/admin/database/backup` - Trigger backup
- `GET /api/admin/database/health` - Get health metrics
- `GET /api/admin/database/migrations` - List migrations

---

### 4. **Logs Page** (`/admin/logs`)
*Already Implemented - See existing implementation*

**Features**
- Filter by action, resource, and status
- Search by user, action, IP
- Pagination (20 per page)
- Detailed view modal
- Shows user agent and IP address
- Status badges (Success, Failed, Warning)

---

### 5. **Email Templates Page** (`/admin/email-templates`)
**To be Implemented**

**Planned Features**
- CRUD operations for email templates
- Preview functionality
- Template variables helper
- Status (Active, Draft, Archived)
- Usage statistics
- Test email sending

---

### 6. **Settings Page** (`/admin/settings`)
**To be Implemented**

**Planned Features**
- System configuration
- Email settings (SMTP, FROM address)
- API keys management
- Webhooks configuration
- Feature flags
- Brand customization
- Notification preferences

---

### 7. **Reports Page** (`/admin/reports`)
**To be Implemented**

**Planned Features**
- Custom report generation
- Scheduled reports
- Report templates
- Email delivery
- Export formats (PDF, CSV, Excel)
- Report history

---

## Security Considerations

### Authorization
- All pages require admin role
- Session-based access control
- CORS protection on API endpoints
- Rate limiting on sensitive operations

### Data Protection
- Sensitive data hashed in transit
- Encryption for backup files
- Audit logging for all operations
- IP whitelist for admin access

### IP Whitelist Protection
- Blocks non-whitelisted IPs from admin endpoints
- Useful for organizations with static IPs
- Can be disabled if needed
- Logged in access logs

---

## UI/UX Patterns

### Common Components
All pages follow consistent patterns:
- Header with title and description
- Filter/search controls
- Data tables with pagination
- Modal dialogs for details
- Status badges with colors
- Action buttons

### Color Coding
- **Green**: Success, Healthy, Active
- **Yellow**: Warning, Pending, Caution
- **Red**: Failed, Critical, Error
- **Blue**: Neutral, Info, In Progress
- **Slate**: Disabled, Archived, Neutral

### Responsive Design
- Full-width on desktop
- Stacked on tablet
- Touch-friendly buttons
- Horizontal scroll for tables on mobile

---

## API Integration

### Expected API Responses

**Security Endpoints**
```json
{
  "failedLogins": [...],
  "whitelistIPs": [...],
  "rateLimits": [...],
  "twoFAStatus": {...}
}
```

**Billing Endpoints**
```json
{
  "payments": [...],
  "subscriptions": [...],
  "totalRevenue": 0,
  "activeSubscriptions": 0,
  "paymentStats": {...}
}
```

**Database Endpoints**
```json
{
  "migrations": [...],
  "backups": [...],
  "health": {...},
  "lastBackup": "2024-01-01T00:00:00Z"
}
```

---

## File Structure

```
app/admin/
├── security/
│   ├── SecurityClient.tsx (created)
│   ├── page.tsx (existing)
│   └── route.ts (API - to create)
├── billing/
│   ├── BillingClient.tsx (created)
│   ├── page.tsx (existing)
│   └── route.ts (API - to create)
├── database/
│   ├── DatabaseClient.tsx (created)
│   ├── page.tsx (existing)
│   └── route.ts (API - to create)
├── logs/
│   ├── LogsClient.tsx (existing)
│   ├── page.tsx (existing)
│   └── route.ts (API - existing)
└── ...
```

---

## Configuration

### Environment Variables Needed
- Database connection string (Prisma)
- SMTP settings (Email)
- Backup storage location
- Rate limiting rules
- IP whitelist (optional)

### Database Queries
All data should be fetched using Prisma with appropriate indexes:
- `User` model for 2FA status
- `SystemLog` model for failed logins
- `Payment` and `Subscription` models for billing
- Custom queries for database metrics

---

## Next Steps to Complete Implementation

1. **Create API Routes**
   - `/api/admin/security/*` endpoints
   - `/api/admin/billing/*` endpoints
   - `/api/admin/database/*` endpoints
   - `/api/admin/email-templates/*` endpoints
   - `/api/admin/settings/*` endpoints
   - `/api/admin/reports/*` endpoints

2. **Update Page Components**
   - Create page.tsx files if missing
   - Connect client components to pages
   - Add server-side data fetching

3. **Add Email Templates Component**
   - Full CRUD interface
   - Template preview
   - Variable injection
   - Test email functionality

4. **Add Settings Component**
   - Configuration form
   - API keys CRUD
   - Webhooks management
   - Feature flags toggle

5. **Add Reports Component**
   - Report builder
   - Schedule management
   - Export generation
   - Email delivery

---

## Testing Checklist

- [ ] All filters work correctly
- [ ] Pagination works (if applicable)
- [ ] Modals open/close properly
- [ ] Forms validate input
- [ ] Delete operations require confirmation
- [ ] API endpoints return correct data
- [ ] Error states display properly
- [ ] Loading states show correctly
- [ ] Mobile responsive layout
- [ ] Accessibility (keyboard nav, labels)

---

## Performance Optimization

### Implemented
- Client-side filtering where appropriate
- Pagination for large lists
- Lazy loading of modals
- Memoization of components

### Recommended
- Database query optimization
- Caching frequently accessed data
- Pagination on server side for large datasets
- Batch operations for bulk actions
- Indexing on frequently filtered columns

