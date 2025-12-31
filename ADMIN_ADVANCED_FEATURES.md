# Admin Dashboard - Advanced Features Documentation

## Overview
Comprehensive admin features for system monitoring, compliance, and data management with real-time status indicators, filtering, export capabilities, and audit logging.

## Features Implemented

### 1. **Real-Time System Health Status** (`SystemHealthStatus.tsx`)
Displays comprehensive system health monitoring at a glance.

**Services Monitored:**
- API Server (response time, uptime %)
- Database (connection health, query performance)
- Cache Layer (Redis hit rates, response time)
- Storage Backend (utilization, availability)

**Features:**
- Real-time health indicators (healthy/degraded/down)
- Response time metrics
- Uptime percentage
- Service-specific details
- Manual refresh with status check
- Last checked timestamp

**Usage:**
```tsx
<SystemHealthStatus 
    statuses={customStatuses}
/>
// Uses defaults if not provided
```

### 2. **Date Range Filtering** (`DateRangeFilter.tsx`)
Flexible date range picker with preset options and custom range support.

**Preset Ranges:**
- Today
- Last 7 days (Week)
- Last 30 days (Month)
- Last 90 days (Quarter)
- Last 365 days (Year)
- Custom date range

**Features:**
- Calendar date picker for custom ranges
- Visual indicator of active filter
- One-click clear
- Callback on filter change
- Responsive dropdown menu

**Usage:**
```tsx
<DateRangeFilter
    label="Filter by Date"
    onFilter={(start, end) => handleFilter(start, end)}
    onClear={() => handleClear()}
/>
```

### 3. **Data Export Capabilities** (`ExportButton.tsx`)
Export dashboard data in multiple formats.

**Supported Formats:**
- CSV (with proper escaping and formatting)
- JSON (pretty-printed)

**Features:**
- Dropdown menu for format selection
- Automatic filename with date
- Disabled state when no data
- Loading state during export
- Proper data transformation
- Browser-native download

**Usage:**
```tsx
<ExportButton
    data={filteredLogs}
    filename="audit-logs"
    label="Export"
    onExport={async (format) => { /* custom export */ }}
/>
```

### 4. **Comprehensive Audit Logging** (`AuditLog.tsx` + Admin Logger)

#### Audit Log Component
Multi-filter audit log viewer with search, status filtering, and date range support.

**Features:**
- Full-text search across all fields
- Status filter (success/error/pending)
- Action type filter
- Date range filter integration
- CSV/JSON export
- Paginated display (10 items per page)
- Color-coded status badges
- IP address tracking
- Detailed change logs

**Usage:**
```tsx
<AuditLog
    logs={auditLogs}
    onFilterChange={(filtered) => console.log(filtered)}
/>
```

#### Admin Logger (`admin-logger.ts`)
Server-side logging utilities for tracking all admin actions.

**Logged Actions:**
- User management (create, update, delete, role changes)
- Portal management (create, update, delete)
- Subscription events (creation, cancellation)
- Payment processing
- Admin logins
- Settings updates
- Data exports
- System health checks
- Error events

**Auto-Captured Data:**
- User ID and name
- Action timestamp
- IP address
- User agent
- Action status (success/error/pending)
- Before/after changes
- Detailed descriptions

**Usage:**
```tsx
import { logAdminAction, logUserCreated, logUserDeleted } from "@/lib/admin-logger"

// Log specific action
await logUserCreated(userId, userName, adminId)

// Log generic action
await logAdminAction(
    "custom_action",
    "resource",
    userId,
    userName,
    "Description",
    "success",
    { before: {...}, after: {...} }
)
```

### 5. **Audit Logs Page** (`/admin/audit-logs`)
Dedicated page for viewing and managing system audit logs.

**Features:**
- Summary statistics (total events, success rate, failed, pending)
- 90-day historical logs
- Multi-filter interface
- Paginated results (10 per page)
- CSV export with filtered results
- Search across user, action, resource
- Status and action filtering
- Date range filtering

**Page URL:** `/admin/audit-logs`

## Architecture Overview

```
Admin Dashboard Features
├── System Health
│   ├── SystemHealthStatus (real-time monitoring)
│   └── PerformanceMonitor (metrics dashboard)
├── Filtering & Dates
│   ├── DateRangeFilter (preset + custom)
│   └── Dashboard integration
├── Data Export
│   ├── ExportButton (CSV/JSON)
│   └── Format conversion
├── Audit & Compliance
│   ├── AuditLog (viewer + filters)
│   ├── AuditLogsPage (dedicated page)
│   └── AdminLogger (server-side logging)
└── Integration Points
    ├── Sidebar navigation
    ├── Main dashboard
    └── All admin pages
```

## Integration Guide

### Adding Audit Logging to Admin Actions

**Step 1:** Import the logger utility
```ts
import { logAdminAction } from "@/lib/admin-logger"
```

**Step 2:** Log the action when it completes
```ts
await logAdminAction(
    "user_updated",
    "user",
    session.user.id,
    session.user.name,
    `Updated user ${userId}`,
    "success"
)
```

### Adding Export to a Table/List

**Step 1:** Import ExportButton
```tsx
import ExportButton from "@/admin/components/ExportButton"
```

**Step 2:** Add to component
```tsx
<ExportButton
    data={items}
    filename="my-data"
    label="Export"
/>
```

### Adding Date Filtering to Stats

**Step 1:** Add state for date range
```tsx
const [dateRange, setDateRange] = useState({ start: null, end: null })
```

**Step 2:** Filter data by date
```tsx
const filtered = data.filter(item => {
    if (!dateRange.start || !dateRange.end) return true
    const itemDate = new Date(item.timestamp)
    return itemDate >= dateRange.start && itemDate <= dateRange.end
})
```

**Step 3:** Add filter component
```tsx
<DateRangeFilter
    onFilter={(start, end) => setDateRange({ start, end })}
/>
```

## Database Schema

The system uses the existing `SystemLog` model:

```prisma
model SystemLog {
    id        String   @id @default(cuid())
    action    String
    resource  String
    userId    String?
    userName  String?
    details   String?
    status    String   @default("success")
    ipAddress String?
    userAgent String?
    createdAt DateTime @default(now())

    @@index([userId])
    @@index([action])
    @@index([createdAt])
}
```

## Security Considerations

1. **Role-Based Access:** All audit pages require admin role
2. **IP Tracking:** Captures user IP for security monitoring
3. **User Agent:** Tracks browser/client information
4. **Status Tracking:** Records success/error for all operations
5. **Change History:** Before/after data for compliance
6. **Read-Only Audit Logs:** Cannot be deleted, only viewed

## Performance Optimizations

1. **Pagination:** Limits data shown per page (10 items default)
2. **Date Range Filtering:** Reduces queried data
3. **Indexed Queries:** `userId`, `action`, `createdAt` are indexed
4. **Client-Side Filtering:** Applied after server fetch
5. **Lazy Loading:** Export only filtered data

## API Endpoints

### Dashboard Refresh
- **Endpoint:** `POST /api/admin/dashboard-refresh`
- **Auth:** Admin only
- **Response:** `{ success: true, timestamp: string }`

## Future Enhancements

- [ ] Real-time WebSocket updates for system health
- [ ] Advanced analytics with charts and trends
- [ ] Email alerts for critical system events
- [ ] Compliance report generation
- [ ] Role-based action filtering
- [ ] Bulk action reviews
- [ ] Scheduled exports
- [ ] Webhook integration for external logging
- [ ] Data retention policies
- [ ] Advanced search with regex support

## Files Created/Modified

### New Files
- `app/admin/components/SystemHealthStatus.tsx` - System health display
- `app/admin/components/DateRangeFilter.tsx` - Date range picker
- `app/admin/components/ExportButton.tsx` - Data export
- `app/admin/components/AuditLog.tsx` - Audit log viewer
- `app/admin/audit-logs/page.tsx` - Audit logs page
- `app/admin/audit-logs/AuditLogClient.tsx` - Audit logs client
- `lib/admin-logger.ts` - Admin logging utilities

### Modified Files
- `app/admin/AdminDashboardClient.tsx` - Added components and filters
- `app/admin/components/AdminSidebar.tsx` - Added Audit Logs link

## Testing Checklist

- [ ] System health indicators update correctly
- [ ] Date range filters apply to all data
- [ ] Export creates properly formatted files
- [ ] Audit logs capture all admin actions
- [ ] Filters work on audit log page
- [ ] Pagination works with large datasets
- [ ] Role-based access control enforced
- [ ] IP addresses captured correctly
- [ ] Search functionality works across fields
