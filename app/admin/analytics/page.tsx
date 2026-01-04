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
  RefreshCw,
  Sparkles,
  Zap,
  Target,
  AlertTriangle
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

function AnalyticsPageContent() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics | null>(null);
  const [uploadAnalytics, setUploadAnalytics] = useState<UploadAnalytics | null>(null);
  const [performanceAnalytics, setPerformanceAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    console.log('🔍 Fetching analytics data for period:', period);
    
    try {
      console.log('Making API calls...');
      const [dashboardRes, usersRes, uploadsRes, performanceRes] = await Promise.all([
        fetch(`/api/admin/analytics/dashboard-simple?period=${period}`),
        fetch(`/api/admin/analytics/users?period=${period}&groupBy=day`),
        fetch(`/api/admin/analytics/uploads?period=${period}&groupBy=day`),
        fetch(`/api/admin/analytics/performance-simple?period=7d`),
      ]);

      console.log('API responses:', {
        dashboard: { status: dashboardRes.status, ok: dashboardRes.ok },
        users: { status: usersRes.status, ok: usersRes.ok },
        uploads: { status: uploadsRes.status, ok: uploadsRes.ok }
      });

      if (dashboardRes.ok) {
        const data = await dashboardRes.json();
        console.log('✅ Dashboard data received:', data);
        setDashboardData(data);
      } else {
        console.error('❌ Failed to fetch dashboard data:', dashboardRes.status);
        const errorText = await dashboardRes.text();
        console.error('Dashboard error details:', errorText);
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
        console.log('✅ User analytics data received:', data);
        setUserAnalytics(data);
      } else {
        console.error('❌ Failed to fetch user analytics:', usersRes.status);
        const errorText = await usersRes.text();
        console.error('Users error details:', errorText);
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
        console.log('✅ Upload analytics data received:', data);
        setUploadAnalytics(data);
      } else {
        console.error('❌ Failed to fetch upload analytics:', uploadsRes.status);
        const errorText = await uploadsRes.text();
        console.error('Uploads error details:', errorText);
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

      if (performanceRes.ok) {
        const data = await performanceRes.json();
        console.log('✅ Performance analytics data received:', data);
        setPerformanceAnalytics(data);
      } else {
        console.error('❌ Failed to fetch performance analytics:', performanceRes.status);
        const errorText = await performanceRes.text();
        console.error('Performance error details:', errorText);
        // Set default empty data structure
        setPerformanceAnalytics({
          summary: {
            totalRequests: 0,
            averageResponseTime: 0,
            errorRate: 0,
            errorCount: 0
          },
          distribution: {
            responseTime: [],
            statusCodes: []
          },
          endpoints: [],
          errors: []
        });
      }
    } catch (error) {
      console.error('❌ Failed to fetch analytics:', error);
      setError(`Failed to fetch analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      
      setPerformanceAnalytics({
        summary: {
          totalRequests: 0,
          averageResponseTime: 0,
          errorRate: 0,
          errorCount: 0
        },
        distribution: {
          responseTime: [],
          statusCodes: []
        },
        endpoints: [],
        errors: []
      });
    } finally {
      console.log('✅ Analytics fetch completed');
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
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-slate-200 rounded w-64"></div>
          </div>
          <div className="h-10 bg-slate-200 rounded w-40 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6 border border-slate-200 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 bg-slate-200 rounded-lg"></div>
                <div className="h-4 bg-slate-200 rounded w-20"></div>
              </div>
              <div className="space-y-2">
                <div className="h-8 bg-slate-200 rounded w-24"></div>
                <div className="h-4 bg-slate-200 rounded w-32"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="text-center text-slate-600">
          <div className="mb-4">
            <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Unable to load analytics data</h3>
            <p className="text-slate-500 mb-4 max-w-md mx-auto">{error}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={fetchAnalytics}
                className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2 inline" />
                Try Again
              </button>
              <a 
                href="/admin/analytics/debug" 
                className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors inline-flex items-center"
              >
                <Target className="h-4 w-4 mr-2" />
                Debug Mode
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Analytics Dashboard</h1>
          <p className="text-slate-600 mt-1">
            Comprehensive insights into platform performance and usage
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40 border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={fetchAnalytics} 
            variant="outline" 
            size="sm"
            className="border-slate-200 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            onClick={exportData} 
            size="sm"
            className="bg-slate-900 hover:bg-slate-800 text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <div className="flex justify-center">
          <TabsList className="grid w-full max-w-md grid-cols-4 bg-slate-100 border border-slate-200">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">
              Users
            </TabsTrigger>
            <TabsTrigger value="uploads" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">
              Uploads
            </TabsTrigger>
            <TabsTrigger value="performance" className="data-[state=active]:bg-white data-[state=active]:text-slate-900">
              Performance
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-8">
          {/* Overview Metrics */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-blue-50 text-blue-600 border-blue-100">
                  <Users className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">{formatNumber(dashboardData?.overview.totalUsers || 0)}</p>
                  <p className="text-sm text-slate-600">Total Users</p>
                </div>
              </div>
              <div className="text-sm text-slate-600">
                +{dashboardData?.overview.newUsers || 0} this {period}
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-green-50 text-green-600 border-green-100">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">{formatNumber(dashboardData?.overview.totalPortals || 0)}</p>
                  <p className="text-sm text-slate-600">Total Portals</p>
                </div>
              </div>
              <div className="text-sm text-slate-600">
                +{dashboardData?.overview.newPortals || 0} this {period}
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-purple-50 text-purple-600 border-purple-100">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">{formatNumber(dashboardData?.overview.totalUploads || 0)}</p>
                  <p className="text-sm text-slate-600">Total Uploads</p>
                </div>
              </div>
              <div className="text-sm text-slate-600">
                +{dashboardData?.overview.newUploads || 0} this {period}
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-orange-50 text-orange-600 border-orange-100">
                  <HardDrive className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">{dashboardData?.overview.totalStorageGB || 0} GB</p>
                  <p className="text-sm text-slate-600">Storage Used</p>
                </div>
              </div>
              <div className="text-sm text-slate-600">
                {dashboardData?.overview.activeUsers || 0} active users
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid gap-8 md:grid-cols-2">
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900">User Growth</h3>
                <Users className="w-5 h-5 text-slate-400" />
              </div>
              <AnalyticsChart
                data={dashboardData?.trends.userGrowth || []}
                xKey="date"
                yKey="count"
                type="line"
                color="#4F46E5"
              />
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900">Upload Trends</h3>
                <Upload className="w-5 h-5 text-slate-400" />
              </div>
              <AnalyticsChart
                data={dashboardData?.trends.uploadTrends || []}
                xKey="date"
                yKey="count"
                type="bar"
                color="#10B981"
              />
            </div>
          </div>

          {/* Activity Tables */}
          <div className="grid gap-8 md:grid-cols-2">
            <div className="bg-white rounded-xl border border-slate-200">
              <RecentActivity uploads={dashboardData?.recentActivity.uploads || []} />
            </div>
            <div className="bg-white rounded-xl border border-slate-200">
              <TopPortals portals={dashboardData?.topPortals || []} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-8">
          {/* User Metrics */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-blue-50 text-blue-600 border-blue-100">
                  <Users className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">{formatNumber(userAnalytics?.summary.totalUsers || 0)}</p>
                  <p className="text-sm text-slate-600">Total Users</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-green-50 text-green-600 border-green-100">
                  <Activity className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">{formatNumber(userAnalytics?.activity.active_users || 0)}</p>
                  <p className="text-sm text-slate-600">Active Users</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-purple-50 text-purple-600 border-purple-100">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">{formatNumber(userAnalytics?.activity.users_with_portals || 0)}</p>
                  <p className="text-sm text-slate-600">Users with Portals</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-orange-50 text-orange-600 border-orange-100">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">{formatNumber(userAnalytics?.activity.users_with_uploads || 0)}</p>
                  <p className="text-sm text-slate-600">Users with Uploads</p>
                </div>
              </div>
            </div>
          </div>

          {/* User Charts */}
          <div className="grid gap-8 md:grid-cols-2">
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900">Registration Trends</h3>
                <Users className="w-5 h-5 text-slate-400" />
              </div>
              <AnalyticsChart
                data={userAnalytics?.trends.registrations || []}
                xKey="period"
                yKey="registrations"
                type="line"
                color="#4F46E5"
              />
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900">Role Distribution</h3>
                <BarChart3 className="w-5 h-5 text-slate-400" />
              </div>
              {userAnalytics?.distribution.roles && userAnalytics.distribution.roles.length > 0 ? (
                <div className="space-y-3">
                  {userAnalytics.distribution.roles.map((role) => (
                    <div key={role.role} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="capitalize font-medium text-slate-900">{role.role}</span>
                      <Badge variant="secondary" className="bg-slate-200 text-slate-700">{role.count}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-500">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No role distribution data available</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Top Users */}
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900">Most Active Users</h3>
              <Users className="w-5 h-5 text-slate-400" />
            </div>
            {userAnalytics?.topUsers && userAnalytics.topUsers.length > 0 ? (
              <div className="space-y-4">
                {userAnalytics.topUsers.slice(0, 10).map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <div>
                      <p className="font-medium text-slate-900">{user.name || 'Anonymous'}</p>
                      <p className="text-sm text-slate-600">{user.email}</p>
                    </div>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-slate-700">{user.stats.portals} portals</span>
                      <span className="text-slate-700">{user.stats.uploads} uploads</span>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className={user.role === 'admin' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'}>
                        {user.role}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No user data available</p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="uploads" className="space-y-8">
          {/* Upload Metrics */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-blue-50 text-blue-600 border-blue-100">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">{formatNumber(uploadAnalytics?.summary.totalUploads || 0)}</p>
                  <p className="text-sm text-slate-600">Total Uploads</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-green-50 text-green-600 border-green-100">
                  <HardDrive className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">{uploadAnalytics?.summary.totalSizeGB || 0} GB</p>
                  <p className="text-sm text-slate-600">Total Size</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-purple-50 text-purple-600 border-purple-100">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">{formatBytes((uploadAnalytics?.summary.averageSize || 0))}</p>
                  <p className="text-sm text-slate-600">Average Size</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-orange-50 text-orange-600 border-orange-100">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">{uploadAnalytics?.distribution.status.find(s => s.status === 'completed')?.percentage || 0}%</p>
                  <p className="text-sm text-slate-600">Success Rate</p>
                </div>
              </div>
            </div>
          </div>

          {/* Upload Charts */}
          <div className="grid gap-8 md:grid-cols-2">
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900">Upload Trends</h3>
                <Upload className="w-5 h-5 text-slate-400" />
              </div>
              <AnalyticsChart
                data={uploadAnalytics?.trends.uploads || []}
                xKey="period"
                yKey="uploadCount"
                type="bar"
                color="#10B981"
              />
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900">File Size Distribution</h3>
                <BarChart3 className="w-5 h-5 text-slate-400" />
              </div>
              {uploadAnalytics?.distribution.fileSizes && uploadAnalytics.distribution.fileSizes.length > 0 ? (
                <div className="space-y-3">
                  {uploadAnalytics.distribution.fileSizes.map((size) => (
                    <div key={size.range} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="font-medium text-slate-900">{size.range}</span>
                      <Badge variant="secondary" className="bg-slate-200 text-slate-700">{size.count}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-500">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No file size distribution data available</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* File Types */}
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900">Popular File Types</h3>
              <Upload className="w-5 h-5 text-slate-400" />
            </div>
            {uploadAnalytics?.distribution.fileTypes && uploadAnalytics.distribution.fileTypes.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {uploadAnalytics.distribution.fileTypes.slice(0, 9).map((type) => (
                  <div key={type.mimeType} className="p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-900">{type.mimeType}</span>
                      <Badge variant="secondary" className="bg-slate-200 text-slate-700">{type.percentage}%</Badge>
                    </div>
                    <div className="text-xs text-slate-600">
                      {type.count} files • {formatBytes(type.totalSize)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <Upload className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No file type data available</p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-8">
          {/* Performance Metrics */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-blue-50 text-blue-600 border-blue-100">
                  <Activity className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">{formatNumber(performanceAnalytics?.summary.totalRequests || 0)}</p>
                  <p className="text-sm text-slate-600">Total Requests</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-green-50 text-green-600 border-green-100">
                  <Clock className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">{performanceAnalytics?.summary.averageResponseTime || 0}ms</p>
                  <p className="text-sm text-slate-600">Avg Response Time</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-red-50 text-red-600 border-red-100">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">{performanceAnalytics?.summary.errorRate || 0}%</p>
                  <p className="text-sm text-slate-600">Error Rate</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-orange-50 text-orange-600 border-orange-100">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">{formatNumber(performanceAnalytics?.summary.errorCount || 0)}</p>
                  <p className="text-sm text-slate-600">Total Errors</p>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Charts */}
          <div className="grid gap-8 md:grid-cols-2">
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900">Response Time Distribution</h3>
                <Clock className="w-5 h-5 text-slate-400" />
              </div>
              {performanceAnalytics?.distribution.responseTime && performanceAnalytics.distribution.responseTime.length > 0 ? (
                <AnalyticsChart
                  data={performanceAnalytics.distribution.responseTime}
                  xKey="range"
                  yKey="count"
                  type="bar"
                  color="#8B5CF6"
                />
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-500">
                  <div className="text-center">
                    <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No response time data available</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900">Status Code Distribution</h3>
                <BarChart3 className="w-5 h-5 text-slate-400" />
              </div>
              {performanceAnalytics?.distribution.statusCodes && performanceAnalytics.distribution.statusCodes.length > 0 ? (
                <div className="space-y-3">
                  {performanceAnalytics.distribution.statusCodes.map((status: any) => (
                    <div key={status.statusCode} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Badge variant={status.statusCode >= 400 ? 'destructive' : status.statusCode >= 300 ? 'secondary' : 'default'} 
                               className={status.statusCode >= 400 ? 'bg-red-100 text-red-700' : status.statusCode >= 300 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}>
                          {status.statusCode}
                        </Badge>
                        <span className="text-sm font-medium text-slate-900">
                          {status.statusCode >= 500 ? 'Server Error' :
                           status.statusCode >= 400 ? 'Client Error' :
                           status.statusCode >= 300 ? 'Redirect' :
                           status.statusCode >= 200 ? 'Success' : 'Info'}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-slate-900">{status.count} requests</div>
                        <div className="text-xs text-slate-600">{status.averageTime}ms avg</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-500">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No status code data available</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Endpoint Performance */}
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900">Endpoint Performance</h3>
              <Activity className="w-5 h-5 text-slate-400" />
            </div>
            {performanceAnalytics?.endpoints && performanceAnalytics.endpoints.length > 0 ? (
              <div className="space-y-4">
                {performanceAnalytics.endpoints.slice(0, 10).map((endpoint: any, index: number) => (
                  <div key={`${endpoint.endpoint}-${endpoint.method}`} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge variant="outline" className="text-xs bg-slate-200 text-slate-700">
                          {endpoint.method}
                        </Badge>
                        <p className="text-sm font-medium truncate text-slate-900">{endpoint.endpoint}</p>
                      </div>
                      <div className="text-xs text-slate-600">
                        {endpoint.requestCount} requests
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-slate-900">{endpoint.averageTime}ms</div>
                      <div className="text-xs text-slate-600">
                        {endpoint.minTime}ms - {endpoint.maxTime}ms
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No endpoint performance data available</p>
                </div>
              </div>
            )}
          </div>

          {/* Recent Errors */}
          {performanceAnalytics?.errors && performanceAnalytics.errors.length > 0 && (
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900">Recent Errors</h3>
                <AlertTriangle className="w-5 h-5 text-slate-400" />
              </div>
              <div className="space-y-4">
                {performanceAnalytics.errors.slice(0, 5).map((error: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge variant="destructive" className="text-xs bg-red-100 text-red-700">
                          {error.statusCode}
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-slate-200 text-slate-700">
                          {error.method}
                        </Badge>
                        <p className="text-sm font-medium truncate text-slate-900">{error.endpoint}</p>
                      </div>
                      {error.errorMessage && (
                        <div className="text-xs text-red-600 truncate">
                          {error.errorMessage}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-slate-900">{error.responseTime}ms</div>
                      <div className="text-xs text-slate-600">
                        {new Date(error.recordedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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