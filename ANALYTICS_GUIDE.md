# Analytics System Guide

## Overview

The analytics system provides comprehensive insights into platform performance, user behavior, and system health. It consists of multiple components working together to collect, store, and display analytics data.

## Components

### 1. Database Models

#### AnalyticsData
- Stores general analytics metrics (user registrations, file uploads, etc.)
- Supports different time periods (hourly, daily, weekly, monthly)
- Includes metadata for additional context

#### PerformanceMetric
- Tracks API response times and performance
- Records endpoint usage, status codes, and errors
- Includes user and IP tracking for detailed analysis

#### SystemHealth
- Monitors system component health (database, storage, email, API)
- Tracks uptime, response times, and error rates
- Provides real-time health status

### 2. API Endpoints

#### `/api/admin/analytics`
- Main analytics endpoint with comprehensive data
- Includes user, portal, upload, and billing metrics
- Provides trend data and top users/activity

#### `/api/admin/analytics/dashboard`
- Dashboard-specific analytics data
- Overview metrics and recent activity
- User growth and upload trends

#### `/api/admin/analytics/users`
- User-focused analytics
- Registration trends and role distribution
- User activity and engagement metrics

#### `/api/admin/analytics/uploads`
- Upload-focused analytics
- File type distribution and size analysis
- Upload trends and success rates

#### `/api/admin/analytics/performance`
- Performance monitoring data
- Response time distribution and error analysis
- Endpoint performance metrics

#### `/api/admin/analytics/export`
- Data export functionality
- Supports CSV and JSON formats
- Configurable data types and time periods

### 3. Frontend Components

#### Analytics Page (`/admin/analytics`)
- Multi-tab dashboard interface
- Real-time data fetching and display
- Interactive charts and metrics cards

#### Chart Components
- `AnalyticsChart`: Reusable chart component (line, bar, pie)
- `MetricCard`: KPI display with trend indicators
- `RecentActivity`: Activity feed component
- `TopPortals`: Portal ranking component

## Data Flow

1. **Data Collection**: Analytics data is collected through:
   - Automatic tracking (user registrations, uploads, etc.)
   - Performance monitoring middleware
   - System health checks
   - Manual data seeding for testing

2. **Data Storage**: All data is stored in PostgreSQL using Prisma ORM:
   - Indexed for efficient querying
   - Supports time-based filtering
   - Includes metadata for context

3. **Data Processing**: API endpoints process raw data:
   - Aggregate metrics by time periods
   - Calculate trends and growth rates
   - Generate distribution analysis
   - Handle missing data gracefully

4. **Data Display**: Frontend components render processed data:
   - Interactive charts using Recharts
   - Responsive metric cards
   - Real-time updates with error handling
   - Export functionality for reports

## Usage

### Running Analytics

1. **Start the application**:
   ```bash
   npm run dev
   ```

2. **Access analytics dashboard**:
   - Navigate to `/admin/analytics`
   - Requires admin role authentication

3. **View different analytics tabs**:
   - **Overview**: General platform metrics and trends
   - **Users**: User registration and activity analysis
   - **Uploads**: File upload patterns and statistics
   - **Performance**: System performance monitoring

### Seeding Sample Data

1. **Run the seed script**:
   ```bash
   npm run db:seed
   ```

2. **Verify data with health check**:
   ```bash
   npm run analytics:health
   ```

### Exporting Data

1. **Use the export button** in the analytics dashboard
2. **Or call the API directly**:
   ```bash
   GET /api/admin/analytics/export?period=30d&format=csv&type=all
   ```

## Monitoring and Maintenance

### Health Checks

Run the analytics health check to verify system status:
```bash
npm run analytics:health
```

This checks:
- Database connectivity
- Core data tables
- Analytics data availability
- Performance metrics
- System health records
- Billing data access
- Audit log functionality

### Performance Monitoring

The system automatically tracks:
- API response times
- Error rates by endpoint
- Status code distribution
- Request volume patterns

### Data Retention

- Analytics data is retained indefinitely by default
- Performance metrics are kept for analysis
- System health data provides historical trends
- Consider implementing data archival for large datasets

## Troubleshooting

### Common Issues

1. **No data showing**:
   - Run `npm run db:seed` to populate sample data
   - Check database connectivity
   - Verify admin authentication

2. **Performance issues**:
   - Check database indexes
   - Monitor query performance
   - Consider data pagination for large datasets

3. **Missing metrics**:
   - Verify all required tables exist
   - Check for database migration issues
   - Ensure proper data seeding

### Error Handling

The analytics system includes comprehensive error handling:
- Graceful fallbacks for missing data
- Default values for failed queries
- User-friendly error messages
- Detailed logging for debugging

## Security

- All analytics endpoints require admin authentication
- Data export is restricted to authorized users
- Sensitive information is excluded from exports
- Audit logging tracks all analytics access

## Future Enhancements

Potential improvements:
- Real-time analytics with WebSocket updates
- Custom dashboard creation
- Advanced filtering and segmentation
- Automated report generation
- Integration with external analytics tools
- Data visualization improvements