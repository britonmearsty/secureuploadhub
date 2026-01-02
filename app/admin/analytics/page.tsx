'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Users, 
  Upload, 
  HardDrive, 
  Activity,
  TrendingUp,
  Clock,
  AlertTriangle,
  Download,
  RefreshCw
} from 'lucide-react';
import { formatBytes, formatNumber } from '@/lib/utils';
import { AnalyticsChart } from '@/components/admin/analytics/AnalyticsChart';
import { MetricCard } from '@/components/admin/analytics/MetricCard';
import { RecentActivity } from '@/components/admin/analytics/RecentActivity';
import { TopPortals } from '@/components/admin/analytics/TopPortals';

interface DashboardData {
  overview: {
    totalUsers: number;
    totalPortals: number;
    totalUploads: number;
    totalStorageGB: number;
    activeUsers: number;
    newUsers: number;
    newPortals: number;
    newUploads: number;
  };
  recentActivity: {
    uploads: Array<{
      id: string;
      fileName: string;
      fileSize: number;
      portalName: string;
      clientName: string;
      createdAt: string;
    }>;
  };
  topPortals: Array<{
    id: string;
    name: string;
    ownerName: string;
    ownerEmail: string;
    uploadCount: number;
    createdAt: string;
  }>;
  trends: {
    userGrowth: Array<{ date: string; count: number }>;
    uploadTrends: Array<{ date: string; count: number; total_size: number }>;
  };
  period: string;
  generatedAt: string;
}

interface UserAnalytics {
  summary: {
    totalUsers: number;
    period: string;
    groupBy: string;
  };
  trends: {
    registrations: Array<{ period: string; registrations: number }>;
  };
  distribution: {
    roles: Array<{ role: string; count: number }>;
    status: Array<{ status: string; count: number }>;
  };
  activity: {
    total_users: number;
    active_users: number;
    users_with_portals: number;
    users_with_uploads: number;
  };
  topUsers: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    createdAt: string;
    stats: {
      portals: number;
      uploads: number;
      sessions: number;
    };
  }>;
}

interface UploadAnalytics {
  summary: {
    totalUploads: number;
    totalSize: number;
    totalSizeGB: number;
    averageSize: number;
    period: string;
    groupBy: string;
  };
  trends: {
    uploads: Array<{
      period: string;
      uploadCount: number;
      totalSize: number;
      averageSize: number;
    }>;
  };
  distribution: {
    fileTypes: Array<{
      mimeType: string;
      count: number;
      totalSize: number;
      percentage: number;
    }>;
    fileSizes: Array<{
      range: string;
      count: number;
      totalSize: number;
    }>;
    status: Array<{
      status: string;
      count: number;
      percentage: number;
    }>;
  };
  topPortals: Array<{
    id: string;
    name: string;
    ownerName: string;
    ownerEmail: string;
    uploadCount: number;
    createdAt: string;
  }>;
}

export default function AnalyticsPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics | null>(null);
  const [uploadAnalytics, setUploadAnalytics] = useState<UploadAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [dashboardRes, usersRes, uploadsRes] = await Promise.all([
        fetch(`/api/admin/analytics/dashboard?period=${period}`),
        fetch(`/api/admin/analytics/users?period=${period}`),
        fetch(`/api/admin/analytics/uploads?period=${period}`),
      ]);

      if (dashboardRes.ok) {
        const data = await dashboardRes.json();
        setDashboardData(data);
      }

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUserAnalytics(data);
      }

      if (uploadsRes.ok) {
        const data = await uploadsRes.json();
        setUploadAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const exportData = async () => {
    try {
      const response = await fetch(`/api/admin/analytics/export?period=${period}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${period}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to export data:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into platform performance and usage
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchAnalytics} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportData} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="uploads">Uploads</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {dashboardData && (
            <>
              {/* Overview Metrics */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  title="Total Users"
                  value={formatNumber(dashboardData.overview.totalUsers)}
                  change={dashboardData.overview.newUsers}
                  changeLabel={`+${dashboardData.overview.newUsers} this ${period}`}
                  icon={Users}
                />
                <MetricCard
                  title="Total Portals"
                  value={formatNumber(dashboardData.overview.totalPortals)}
                  change={dashboardData.overview.newPortals}
                  changeLabel={`+${dashboardData.overview.newPortals} this ${period}`}
                  icon={BarChart3}
                />
                <MetricCard
                  title="Total Uploads"
                  value={formatNumber(dashboardData.overview.totalUploads)}
                  change={dashboardData.overview.newUploads}
                  changeLabel={`+${dashboardData.overview.newUploads} this ${period}`}
                  icon={Upload}
                />
                <MetricCard
                  title="Storage Used"
                  value={`${dashboardData.overview.totalStorageGB} GB`}
                  change={dashboardData.overview.activeUsers}
                  changeLabel={`${dashboardData.overview.activeUsers} active users`}
                  icon={HardDrive}
                />
              </div>

              {/* Charts */}
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>User Growth</CardTitle>
                    <CardDescription>New user registrations over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AnalyticsChart
                      data={dashboardData.trends.userGrowth}
                      xKey="date"
                      yKey="count"
                      type="line"
                      color="#4F46E5"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Upload Trends</CardTitle>
                    <CardDescription>File uploads over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AnalyticsChart
                      data={dashboardData.trends.uploadTrends}
                      xKey="date"
                      yKey="count"
                      type="bar"
                      color="#10B981"
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Activity Tables */}
              <div className="grid gap-6 md:grid-cols-2">
                <RecentActivity uploads={dashboardData.recentActivity.uploads} />
                <TopPortals portals={dashboardData.topPortals} />
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          {userAnalytics && (
            <>
              {/* User Metrics */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  title="Total Users"
                  value={formatNumber(userAnalytics.summary.totalUsers)}
                  icon={Users}
                />
                <MetricCard
                  title="Active Users"
                  value={formatNumber(userAnalytics.activity.active_users)}
                  icon={Activity}
                />
                <MetricCard
                  title="Users with Portals"
                  value={formatNumber(userAnalytics.activity.users_with_portals)}
                  icon={BarChart3}
                />
                <MetricCard
                  title="Users with Uploads"
                  value={formatNumber(userAnalytics.activity.users_with_uploads)}
                  icon={Upload}
                />
              </div>

              {/* User Charts */}
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Registration Trends</CardTitle>
                    <CardDescription>New user registrations over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AnalyticsChart
                      data={userAnalytics.trends.registrations}
                      xKey="period"
                      yKey="registrations"
                      type="line"
                      color="#4F46E5"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Role Distribution</CardTitle>
                    <CardDescription>User roles breakdown</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {userAnalytics.distribution.roles.map((role) => (
                        <div key={role.role} className="flex items-center justify-between">
                          <span className="capitalize">{role.role}</span>
                          <Badge variant="secondary">{role.count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Users */}
              <Card>
                <CardHeader>
                  <CardTitle>Most Active Users</CardTitle>
                  <CardDescription>Users with the most portals and uploads</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {userAnalytics.topUsers.slice(0, 10).map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{user.name || 'Anonymous'}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                        <div className="flex space-x-4 text-sm">
                          <span>{user.stats.portals} portals</span>
                          <span>{user.stats.uploads} uploads</span>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="uploads" className="space-y-6">
          {uploadAnalytics && (
            <>
              {/* Upload Metrics */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  title="Total Uploads"
                  value={formatNumber(uploadAnalytics.summary.totalUploads)}
                  icon={Upload}
                />
                <MetricCard
                  title="Total Size"
                  value={`${uploadAnalytics.summary.totalSizeGB} GB`}
                  icon={HardDrive}
                />
                <MetricCard
                  title="Average Size"
                  value={formatBytes(uploadAnalytics.summary.averageSize * 1024)}
                  icon={BarChart3}
                />
                <MetricCard
                  title="Success Rate"
                  value={`${uploadAnalytics.distribution.status.find(s => s.status === 'completed')?.percentage || 0}%`}
                  icon={TrendingUp}
                />
              </div>

              {/* Upload Charts */}
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Upload Trends</CardTitle>
                    <CardDescription>File uploads over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AnalyticsChart
                      data={uploadAnalytics.trends.uploads}
                      xKey="period"
                      yKey="uploadCount"
                      type="bar"
                      color="#10B981"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>File Size Distribution</CardTitle>
                    <CardDescription>Distribution of file sizes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {uploadAnalytics.distribution.fileSizes.map((size) => (
                        <div key={size.range} className="flex items-center justify-between">
                          <span>{size.range}</span>
                          <Badge variant="secondary">{size.count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* File Types */}
              <Card>
                <CardHeader>
                  <CardTitle>Popular File Types</CardTitle>
                  <CardDescription>Most uploaded file types</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {uploadAnalytics.distribution.fileTypes.slice(0, 9).map((type) => (
                      <div key={type.mimeType} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{type.mimeType}</span>
                          <Badge variant="secondary">{type.percentage}%</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {type.count} files • {formatBytes(type.totalSize)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Monitoring</CardTitle>
              <CardDescription>System performance metrics and monitoring</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <div className="text-center">
                  <Clock className="h-8 w-8 mx-auto mb-2" />
                  <p>Performance monitoring will be available soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}