'use client';

import { useState, useEffect } from 'react';
import { AdminErrorBoundary } from '@/components/admin/AdminErrorBoundary';
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
  Download,
  RefreshCw
} from 'lucide-react';
import { formatBytes, formatNumber } from '@/lib/utils';
import { AnalyticsChart } from '@/components/admin/analytics/AnalyticsChart';
import { MetricCard } from '@/components/admin/analytics/MetricCard';
import { RecentActivity } from '@/components/admin/analytics/RecentActivity';
import { TopPortals } from '@/components/admin/analytics/TopPortals';

// Helper function to format bytes if not available in utils
const formatBytesLocal = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper function to format numbers if not available in utils
const formatNumberLocal = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

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

function AnalyticsPageContent() {
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
      } else {
        console.error('Failed to fetch dashboard data:', dashboardRes.status);
        // Set default empty data structure
        setDashboardData({
          overview: {
            totalUsers: 0,
            totalPortals: 0,
            totalUploads: 0,
            totalStorageGB: 0,
            activeUsers: 0,
            newUsers: 0,
            newPortals: 0,
            newUploads: 0,
          },
          recentActivity: { uploads: [] },
          topPortals: [],
          trends: {
            userGrowth: [],
            uploadTrends: [],
          },
          period,
          generatedAt: new Date().toISOString(),
        });
      }

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUserAnalytics(data);
      } else {
        console.error('Failed to fetch user analytics:', usersRes.status);
        // Set default empty data structure
        setUserAnalytics({
          summary: { totalUsers: 0, period, groupBy: 'day' },
          trends: { registrations: [] },
          distribution: { roles: [], status: [] },
          activity: {
            total_users: 0,
            active_users: 0,
            users_with_portals: 0,
            users_with_uploads: 0,
          },
          topUsers: [],
        });
      }

      if (uploadsRes.ok) {
        const data = await uploadsRes.json();
        setUploadAnalytics(data);
      } else {
        console.error('Failed to fetch upload analytics:', uploadsRes.status);
        // Set default empty data structure
        setUploadAnalytics({
          summary: {
            totalUploads: 0,
            totalSize: 0,
            totalSizeGB: 0,
            averageSize: 0,
            period,
            groupBy: 'day',
          },
          trends: { uploads: [] },
          distribution: {
            fileTypes: [],
            fileSizes: [],
            status: [],
          },
          topPortals: [],
        });
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      // Set default empty data structures for all
      setDashboardData({
        overview: {
          totalUsers: 0,
          totalPortals: 0,
          totalUploads: 0,
          totalStorageGB: 0,
          activeUsers: 0,
          newUsers: 0,
          newPortals: 0,
          newUploads: 0,
        },
        recentActivity: { uploads: [] },
        topPortals: [],
        trends: {
          userGrowth: [],
          uploadTrends: [],
        },
        period,
        generatedAt: new Date().toISOString(),
      });
      
      setUserAnalytics({
        summary: { totalUsers: 0, period, groupBy: 'day' },
        trends: { registrations: [] },
        distribution: { roles: [], status: [] },
        activity: {
          total_users: 0,
          active_users: 0,
          users_with_portals: 0,
          users_with_uploads: 0,
        },
        topUsers: [],
      });
      
      setUploadAnalytics({
        summary: {
          totalUploads: 0,
          totalSize: 0,
          totalSizeGB: 0,
          averageSize: 0,
          period,
          groupBy: 'day',
        },
        trends: { uploads: [] },
        distribution: {
          fileTypes: [],
          fileSizes: [],
          status: [],
        },
        topPortals: [],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const exportData = async () => {
    try {
      const response = await fetch(`/api/admin/analytics/export?period=${period}&format=csv&type=all`);
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
      } else {
        const errorData = await response.json();
        console.error('Failed to export data:', errorData);
        alert('Failed to export analytics data. Please try again.');
      }
    } catch (error) {
      console.error('Failed to export data:', error);
      alert('Failed to export analytics data. Please try again.');
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
          {/* Overview Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Users"
              value={formatNumberLocal(dashboardData?.overview.totalUsers || 0)}
              change={dashboardData?.overview.newUsers || 0}
              changeLabel={`+${dashboardData?.overview.newUsers || 0} this ${period}`}
              icon={Users}
            />
            <MetricCard
              title="Total Portals"
              value={formatNumberLocal(dashboardData?.overview.totalPortals || 0)}
              change={dashboardData?.overview.newPortals || 0}
              changeLabel={`+${dashboardData?.overview.newPortals || 0} this ${period}`}
              icon={BarChart3}
            />
            <MetricCard
              title="Total Uploads"
              value={formatNumberLocal(dashboardData?.overview.totalUploads || 0)}
              change={dashboardData?.overview.newUploads || 0}
              changeLabel={`+${dashboardData?.overview.newUploads || 0} this ${period}`}
              icon={Upload}
            />
            <MetricCard
              title="Storage Used"
              value={`${dashboardData?.overview.totalStorageGB || 0} GB`}
              change={dashboardData?.overview.activeUsers || 0}
              changeLabel={`${dashboardData?.overview.activeUsers || 0} active users`}
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
                  data={dashboardData?.trends.userGrowth || []}
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
                  data={dashboardData?.trends.uploadTrends || []}
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
            <RecentActivity uploads={dashboardData?.recentActivity.uploads || []} />
            <TopPortals portals={dashboardData?.topPortals || []} />
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          {/* User Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Users"
              value={formatNumberLocal(userAnalytics?.summary.totalUsers || 0)}
              icon={Users}
            />
            <MetricCard
              title="Active Users"
              value={formatNumberLocal(userAnalytics?.activity.active_users || 0)}
              icon={Activity}
            />
            <MetricCard
              title="Users with Portals"
              value={formatNumberLocal(userAnalytics?.activity.users_with_portals || 0)}
              icon={BarChart3}
            />
            <MetricCard
              title="Users with Uploads"
              value={formatNumberLocal(userAnalytics?.activity.users_with_uploads || 0)}
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
                  data={userAnalytics?.trends.registrations || []}
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
                {userAnalytics?.distribution.roles && userAnalytics.distribution.roles.length > 0 ? (
                  <div className="space-y-2">
                    {userAnalytics.distribution.roles.map((role) => (
                      <div key={role.role} className="flex items-center justify-between">
                        <span className="capitalize">{role.role}</span>
                        <Badge variant="secondary">{role.count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No role distribution data available</p>
                    </div>
                  </div>
                )}
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
              {userAnalytics?.topUsers && userAnalytics.topUsers.length > 0 ? (
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
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No user data available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="uploads" className="space-y-6">
          {/* Upload Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Uploads"
              value={formatNumberLocal(uploadAnalytics?.summary.totalUploads || 0)}
              icon={Upload}
            />
            <MetricCard
              title="Total Size"
              value={`${uploadAnalytics?.summary.totalSizeGB || 0} GB`}
              icon={HardDrive}
            />
            <MetricCard
              title="Average Size"
              value={formatBytesLocal((uploadAnalytics?.summary.averageSize || 0) * 1024)}
              icon={BarChart3}
            />
            <MetricCard
              title="Success Rate"
              value={`${uploadAnalytics?.distribution.status.find(s => s.status === 'completed')?.percentage || 0}%`}
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
                  data={uploadAnalytics?.trends.uploads || []}
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
                {uploadAnalytics?.distribution.fileSizes && uploadAnalytics.distribution.fileSizes.length > 0 ? (
                  <div className="space-y-2">
                    {uploadAnalytics.distribution.fileSizes.map((size) => (
                      <div key={size.range} className="flex items-center justify-between">
                        <span>{size.range}</span>
                        <Badge variant="secondary">{size.count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No file size distribution data available</p>
                    </div>
                  </div>
                )}
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
              {uploadAnalytics?.distribution.fileTypes && uploadAnalytics.distribution.fileTypes.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {uploadAnalytics.distribution.fileTypes.slice(0, 9).map((type) => (
                    <div key={type.mimeType} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{type.mimeType}</span>
                        <Badge variant="secondary">{type.percentage}%</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {type.count} files • {formatBytesLocal(type.totalSize)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Upload className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No file type data available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
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

export default function AnalyticsPage() {
  return (
    <AdminErrorBoundary>
      <AnalyticsPageContent />
    </AdminErrorBoundary>
  );
}