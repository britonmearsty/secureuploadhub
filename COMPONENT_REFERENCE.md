# Admin Dashboard Components - Quick Reference

## Components Overview

### 1. SystemHealthStatus
**Path:** `app/admin/components/SystemHealthStatus.tsx`
**Type:** Server + Client Component
**Props:**
```typescript
interface SystemHealthStatusProps {
    statuses?: HealthStatus[]
}
```

**Usage:**
```tsx
<SystemHealthStatus />
// Shows: API, Database, Cache, Storage health
```

**Output:**
- 4 service cards with health status
- Response times and uptime %
- Manual refresh button
- Last check timestamp

---

### 2. DateRangeFilter
**Path:** `app/admin/components/DateRangeFilter.tsx`
**Type:** Client Component
**Props:**
```typescript
interface DateRangeFilterProps {
    onFilter: (startDate: Date | null, endDate: Date | null) => void
    onClear?: () => void
    label?: string // default: "Filter by Date"
}
```

**Usage:**
```tsx
<DateRangeFilter
    label="Filter by Date Range"
    onFilter={(start, end) => setDateRange({start, end})}
    onClear={() => clearFilter()}
/>
```

**Output:**
- Button with calendar icon
- Dropdown with preset ranges
- Custom date inputs
- Visual filter indicator

**Presets:**
- Today
- Week (last 7 days)
- Month (last 30 days)
- Quarter (last 90 days)
- Year (last 365 days)

---

### 3. ExportButton
**Path:** `app/admin/components/ExportButton.tsx`
**Type:** Client Component
**Props:**
```typescript
interface ExportButtonProps {
    data: any[]
    filename?: string
    format?: "csv" | "json"
    label?: string
    onExport?: (format: "csv" | "json") => Promise<void>
}
```

**Usage:**
```tsx
<ExportButton
    data={filteredLogs}
    filename="audit-logs"
    label="Export"
/>
```

**Output:**
- Download button with icon
- Format selection dropdown (CSV/JSON)
- Automatic date-stamped filename
- Browser native download

**Example Files:**
- `audit-logs-2024-01-15.csv`
- `audit-logs-2024-01-15.json`

---

### 4. AuditLog
**Path:** `app/admin/components/AuditLog.tsx`
**Type:** Client Component
**Props:**
```typescript
interface AuditLogProps {
    logs: AuditLogEntry[]
    onFilterChange?: (filtered: AuditLogEntry[]) => void
}
```

**Usage:**
```tsx
<AuditLog
    logs={auditLogs}
    onFilterChange={(filtered) => console.log(filtered)}
/>
```

**Output:**
- Search bar
- Status filter dropdown
- Action type filter dropdown
- Date range filter
- Export button
- Paginated log entries (10 per page)

**Filters:**
- Full-text search
- Status: All, Success, Error, Pending
- Action: All, [dynamic list]
- Date Range: [DateRangeFilter]

---

### 5. PaginatedList
**Path:** `app/admin/components/PaginatedList.tsx`
**Type:** Generic Client Component
**Props:**
```typescript
interface PaginatedListProps<T> {
    items: T[]
    itemsPerPage?: number // default: 10
    renderItem: (item: T, index: number) => React.ReactNode
    renderHeader?: () => React.ReactNode
    emptyMessage?: string
}
```

**Usage:**
```tsx
<PaginatedList
    items={users}
    itemsPerPage={5}
    emptyMessage="No users found"
    renderItem={(user) => (
        <div>{user.name} - {user.email}</div>
    )}
/>
```

**Output:**
- Paginated items display
- Navigation buttons (prev/next)
- Page number buttons
- Item counter "1 to 5 of 20"
- Page indicator "Page 1 of 4"

---

### 6. CacheIndicator
**Path:** `app/admin/components/CacheIndicator.tsx`
**Type:** Client Component
**Props:**
```typescript
interface CacheIndicatorProps {
    lastUpdated: Date
    isLoading?: boolean
    onRefresh?: () => Promise<void>
}
```

**Usage:**
```tsx
<CacheIndicator
    lastUpdated={new Date()}
    isLoading={isRefreshing}
    onRefresh={handleRefresh}
/>
```

**Output:**
- Clock icon
- Time ago text ("5m ago", "2h ago")
- Refresh button
- Loading state

**Time Format:**
- "just now" (<1 min)
- "5m ago" (minutes)
- "2h ago" (hours)
- "3d ago" (days)

---

### 7. RateLimitIndicator
**Path:** `app/admin/components/RateLimitIndicator.tsx`
**Type:** Client Component
**Props:**
```typescript
interface RateLimitIndicatorProps {
    remaining: number
    limit: number
    resetTime?: Date
    severity?: "ok" | "warning" | "critical"
}
```

**Usage:**
```tsx
<RateLimitIndicator
    remaining={750}
    limit={1000}
    resetTime={new Date(Date.now() + 3600000)}
    severity="ok"
/>
```

**Output:**
- Status badge (OK/Warning/Critical)
- Remaining/limit text
- Progress bar
- Reset time
- Color-coded card

**Severity Logic:**
- **OK** (green): >50% remaining
- **Warning** (yellow): 20-50% remaining
- **Critical** (red): <20% remaining

---

### 8. PerformanceMonitor
**Path:** `app/admin/components/PerformanceMonitor.tsx`
**Type:** Client Component
**Props:**
```typescript
interface PerformanceMonitorProps {
    metrics?: PerformanceMetric[]
}
```

**Usage:**
```tsx
<PerformanceMonitor />
// Uses default metrics

<PerformanceMonitor metrics={customMetrics} />
```

**Output:**
- 2x2 grid of metric cards
- Each shows: label, value, unit, status
- Status badge (Healthy/Warning/Critical)

**Default Metrics:**
1. API Response Time (45ms)
2. Database Queries/sec (156 q/s)
3. Cache Hit Rate (94%)
4. Error Rate (0.2%)

---

## Pages

### AuditLogsPage
**Path:** `/admin/audit-logs`
**Type:** Server Component
**Features:**
- Stats cards (total, success, failed, pending)
- Comprehensive AuditLog component
- 90-day history
- Multi-filter interface

**Output:**
```
[Stats Cards]
[Search | Status Filter | Action Filter | Date Range | Export]
[Paginated Audit Log Entries]
```

---

## Utilities

### AdminLogger
**Path:** `lib/admin-logger.ts`
**Type:** Server-side utility functions

**Key Functions:**
```typescript
logAdminAction()          // Generic logging
logUserCreated()          // Track user creation
logUserUpdated()          // Track user updates
logUserDeleted()          // Track user deletion
logUserRoleChanged()      // Track role changes
logPortalCreated()        // Track portal creation
logPortalUpdated()        // Track portal updates
logPortalDeleted()        // Track portal deletion
logSubscriptionCreated()  // Track subscriptions
logSubscriptionCancelled()// Track cancellations
logDataExport()          // Track exports
logAdminLogin()          // Track admin logins
logSettingsUpdated()     // Track settings changes
logError()               // Track errors
```

**Usage:**
```typescript
import { logUserCreated } from "@/lib/admin-logger"

await logUserCreated(userId, userName, adminId)
```

**Auto-Captured:**
- Timestamp
- IP address
- User agent
- User ID/name
- Before/after changes

---

## Integration Points

### In Dashboard
```tsx
import DateRangeFilter from "@/admin/components/DateRangeFilter"
import SystemHealthStatus from "@/admin/components/SystemHealthStatus"
import PerformanceMonitor from "@/admin/components/PerformanceMonitor"
import RateLimitIndicator from "@/admin/components/RateLimitIndicator"
import CacheIndicator from "@/admin/components/CacheIndicator"

// In component JSX:
<DateRangeFilter onFilter={handleFilter} />
<SystemHealthStatus />
<PerformanceMonitor />
<RateLimitIndicator remaining={950} limit={1000} severity="ok" />
<CacheIndicator lastUpdated={new Date()} onRefresh={handleRefresh} />
```

### In Any Table/List
```tsx
import PaginatedList from "@/admin/components/PaginatedList"
import ExportButton from "@/admin/components/ExportButton"

<ExportButton data={items} filename="export" />
<PaginatedList
    items={items}
    itemsPerPage={10}
    renderItem={(item) => <ItemRow item={item} />}
/>
```

### In Audit Page
```tsx
import AuditLog from "@/admin/components/AuditLog"

<AuditLog logs={auditLogs} />
```

### In Any Action
```typescript
import { logUserDeleted } from "@/lib/admin-logger"

async function deleteUser(userId: string) {
    await db.deleteUser(userId)
    await logUserDeleted(userId, userEmail, adminId)
}
```

---

## Styling

All components use:
- **Tailwind CSS 4** classes
- **Slate color palette** (primary)
- **Semantic colors** (green/yellow/red for status)
- **Rounded corners** (lg/xl borders)
- **Hover states** (all interactive elements)
- **Transition effects** (200ms duration)

### Colors Used
```css
/* Primary */
bg-slate-900, text-slate-900 /* Buttons, headers */
bg-slate-50, bg-white /* Backgrounds */

/* Status */
bg-green-100, text-green-700 /* Success */
bg-yellow-100, text-yellow-700 /* Warning */
bg-red-100, text-red-700 /* Error */

/* Accents */
bg-blue-100, bg-purple-100, bg-orange-100
```

---

## Icons Used

All from **lucide-react**:
```
Clock, Download, Search, Filter, Bell
AlertTriangle, CheckCircle, ChevronLeft, ChevronRight
Calendar, Activity, Zap, Database, BookOpen
RefreshCw, Loader, ArrowUpRight, ArrowDownRight
```

---

## Type Definitions

### AuditLogEntry
```typescript
interface AuditLogEntry {
    id: string
    action: string
    resource: string
    userName?: string
    userEmail?: string
    status: "success" | "error" | "pending"
    ipAddress?: string
    details?: string
    timestamp: Date
    changes?: {
        before?: Record<string, any>
        after?: Record<string, any>
    }
}
```

### HealthStatus
```typescript
interface HealthStatus {
    service: string
    status: "healthy" | "degraded" | "down"
    responseTime?: number
    uptime?: number
    details?: string
    lastChecked?: Date
}
```

### PerformanceMetric
```typescript
interface PerformanceMetric {
    label: string
    value: string | number
    unit: string
    status: "healthy" | "warning" | "critical"
    icon: React.ReactNode
}
```

---

## Error Handling

All components include:
- ✅ Loading states
- ✅ Error boundaries
- ✅ Empty states
- ✅ Fallback UI
- ✅ Graceful degradation

Example:
```tsx
{isLoading ? (
    <Loader className="animate-spin" />
) : error ? (
    <div className="text-red-600">Error: {error.message}</div>
) : items.length === 0 ? (
    <p className="text-slate-500">No items found</p>
) : (
    <ItemList />
)}
```

---

## Performance Notes

- PaginatedList limits DOM nodes
- DateRangeFilter uses dropdown (not always visible)
- Export happens client-side (no server load)
- Filters applied client-side for instant response
- 30-second cache refresh interval (configurable)

---

## Accessibility

Components include:
- ✅ ARIA labels
- ✅ Semantic HTML
- ✅ Keyboard navigation
- ✅ Focus states
- ✅ Color contrast ratios
- ✅ Screen reader support

---

**Last Updated:** 2024
**Status:** ✅ Complete and documented
