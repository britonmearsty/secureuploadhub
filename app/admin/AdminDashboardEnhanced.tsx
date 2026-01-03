'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Users, 
  FolderOpen, 
  Upload, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Eye,
  UserCheck,
  CreditCard
} from 'lucide-react';
import { AnalyticsChart } from '@/components/admin/analytics/AnalyticsChart';

interface Analytics {
  overview: {
    users: {
      total: number;
      active: number;
      new: number;
      admins: number;
      disabled: number;
      conversionRate: number;
    };
    portals: {
      total: number;
      active: number;
      new: number;
      averageUploads: number;
    };
    uploads: {
      total: number;
      completed: number;
      recent: number;
      totalStorage: number;
      averagePerUser: number;
    };
    billing: {
      totalSubscriptions: number;
      activeSubscriptions: number;
      totalRevenue: number;
      recentRevenue: number;
      averageRevenuePerUser: number;
    };
  };
  trends: {
    userGrowth: Array<{ date: string; count: number }>;
    uploads: Array<{ date: string; uploads: number; storage: number }>;
    revenue: Array<{ date: string; payments: number; revenue: number }>;
    period: string;
  };
  topUsers: Array<{
    id: string;
    email: string;
    name: string | null;
    createdAt: string;
    _count: {
      uploadPortals: number;
      fileUploads: number;
    };
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    resource: string;
    user: {
      email: string;
      name: string | null;
    };
    createdAt: string;
    details: any;
  }>;
}

export default function AdminDashboardEnhanced() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30');

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/analytics?days=${selectedPeriod}`);
      
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.analytics);
      } else {
        const errorData = await response.text();
        console.error('Failed to fetch analytics:', response.status, response.statusText, errorData);
        setAnalytics(null);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="p-8 space-y-8">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-slate-200 rounded w-64"></div>
          </div>
          <div className="h-10 bg-slate-200 rounded w-40 animate-pulse"></div>
        </div>

        {/* Primary Stats Cards Skeleton */}
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

        {/* Secondary Stats Cards Skeleton */}
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

        {/* Charts and Activity Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl p-6 border border-slate-200 animate-pulse">
            <div className="h-6 bg-slate-200 rounded w-32 mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-200 rounded-lg"></div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-slate-200 animate-pulse">
            <div className="h-6 bg-slate-200 rounded w-32 mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6 border border-slate-200 animate-pulse">
              <div className="h-6 bg-slate-200 rounded w-32 mb-6"></div>
              <div className="h-[250px] bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-8">
        <div className="text-center text-slate-600">
          <div className="mb-4">
            <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Unable to load analytics data</h3>
            <p className="text-slate-500 mb-4">
              There was an issue loading the analytics data. Please check the console for more details.
            </p>
            <button
              onClick={fetchAnalytics}
              className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const StatCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon, 
    trend, 
    color = 'blue' 
  }: {
    title: string;
    value: string | number;
    change?: string;
    icon: any;
    trend?: 'up' | 'down' | 'neutral';
    color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  }) => {
    const colorClasses = {
      blue: 'bg-blue-50 text-blue-600 border-blue-100',
      green: 'bg-green-50 text-green-600 border-green-100',
      purple: 'bg-purple-50 text-purple-600 border-purple-100',
      orange: 'bg-orange-50 text-orange-600 border-orange-100',
      red: 'bg-red-50 text-red-600 border-red-100'
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
          {trend && (
            <div className={`flex items-center text-sm ${
              trend === 'up' ? 'text-green-600' : 
              trend === 'down' ? 'text-red-600' : 'text-slate-600'
            }`}>
              {trend === 'up' ? <TrendingUp className="w-4 h-4 mr-1" /> :
               trend === 'down' ? <TrendingDown className="w-4 h-4 mr-1" /> : null}
              {change}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-sm text-slate-600">{title}</p>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-600 mt-1">Platform overview and analytics</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={analytics.overview?.users?.total?.toLocaleString() || '0'}
          change={`+${analytics.overview?.users?.new || 0} new`}
          icon={Users}
          trend="up"
          color="blue"
        />
        <StatCard
          title="Active Portals"
          value={analytics.overview?.portals?.active?.toLocaleString() || '0'}
          change={`${analytics.overview?.portals?.total || 0} total`}
          icon={FolderOpen}
          trend="neutral"
          color="green"
        />
        <StatCard
          title="Total Uploads"
          value={analytics.overview?.uploads?.completed?.toLocaleString() || '0'}
          change={`+${analytics.overview?.uploads?.recent || 0} recent`}
          icon={Upload}
          trend="up"
          color="purple"
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(analytics.overview?.billing?.totalRevenue || 0)}
          change={`+${formatCurrency(analytics.overview?.billing?.recentRevenue || 0)} recent`}
          icon={DollarSign}
          trend="up"
          color="orange"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Admin Users"
          value={analytics.overview?.users?.admins || 0}
          icon={Shield}
          color="red"
        />
        <StatCard
          title="Storage Used"
          value={formatBytes(analytics.overview?.uploads?.totalStorage || 0)}
          icon={BarChart3}
          color="blue"
        />
        <StatCard
          title="Active Subscriptions"
          value={analytics.overview?.billing?.activeSubscriptions || 0}
          change={`${analytics.overview?.users?.conversionRate || 0}% conversion`}
          icon={CreditCard}
          color="green"
        />
        <StatCard
          title="Avg Revenue/User"
          value={formatCurrency(analytics.overview?.billing?.averageRevenuePerUser || 0)}
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Users */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 border border-slate-200"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Top Users</h3>
            <UserCheck className="w-5 h-5 text-slate-400" />
          </div>
          <div className="space-y-4">
            {(analytics.topUsers || []).slice(0, 5).map((user, index) => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{user.name || user.email}</p>
                    <p className="text-sm text-slate-600">{user.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-900">
                    {user._count?.uploadPortals || 0} portals
                  </p>
                  <p className="text-sm text-slate-600">
                    {user._count?.fileUploads || 0} uploads
                  </p>
                </div>
              </div>
            ))}
            {(!analytics.topUsers || analytics.topUsers.length === 0) && (
              <div className="text-center text-slate-500 py-4">
                No user data available
              </div>
            )}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 border border-slate-200"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
            <Activity className="w-5 h-5 text-slate-400" />
          </div>
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {(analytics.recentActivity || []).slice(0, 10).map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 p-3 hover:bg-slate-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900">
                    <span className="font-medium">{activity.user?.name || activity.user?.email || 'Unknown user'}</span>
                    {' '}performed{' '}
                    <span className="font-medium">{activity.action?.toLowerCase().replace(/_/g, ' ') || 'unknown action'}</span>
                    {' '}on{' '}
                    <span className="font-medium">{activity.resource || 'unknown resource'}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {activity.createdAt ? new Date(activity.createdAt).toLocaleString() : 'Unknown time'}
                  </p>
                </div>
              </div>
            ))}
            {(!analytics.recentActivity || analytics.recentActivity.length === 0) && (
              <div className="text-center text-slate-500 py-4">
                No recent activity
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Growth Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 border border-slate-200"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">User Growth</h3>
            <Users className="w-5 h-5 text-slate-400" />
          </div>
          {analytics.trends?.userGrowth && analytics.trends.userGrowth.length > 0 ? (
            <AnalyticsChart
              data={analytics.trends.userGrowth}
              xKey="date"
              yKey="count"
              type="line"
              color="#4F46E5"
              height={250}
            />
          ) : (
            <div className="h-[250px] flex items-center justify-center text-slate-500">
              No growth data available
            </div>
          )}
        </motion.div>

        {/* Upload Trends Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 border border-slate-200"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Upload Trends</h3>
            <Upload className="w-5 h-5 text-slate-400" />
          </div>
          {analytics.trends?.uploads && analytics.trends.uploads.length > 0 ? (
            <AnalyticsChart
              data={analytics.trends.uploads}
              xKey="date"
              yKey="uploads"
              type="bar"
              color="#10B981"
              height={250}
            />
          ) : (
            <div className="h-[250px] flex items-center justify-center text-slate-500">
              No upload data available
            </div>
          )}
        </motion.div>

        {/* Revenue Trends Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 border border-slate-200"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Revenue Trends</h3>
            <DollarSign className="w-5 h-5 text-slate-400" />
          </div>
          {analytics.trends?.revenue && analytics.trends.revenue.length > 0 ? (
            <AnalyticsChart
              data={analytics.trends.revenue}
              xKey="date"
              yKey="revenue"
              type="bar"
              color="#F59E0B"
              height={250}
            />
          ) : (
            <div className="h-[250px] flex items-center justify-center text-slate-500">
              No revenue data available
            </div>
          )}
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl p-6 border border-slate-200"
      >
        <h3 className="text-lg font-semibold text-slate-900 mb-6">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => router.push('/admin/users')}
            className="flex items-center space-x-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
          >
            <Users className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-900">Manage Users</span>
          </button>
          <button 
            onClick={() => router.push('/admin/portals')}
            className="flex items-center space-x-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors cursor-pointer"
          >
            <FolderOpen className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-900">View Portals</span>
          </button>
          <button 
            onClick={() => router.push('/admin/billing')}
            className="flex items-center space-x-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer"
          >
            <CreditCard className="w-5 h-5 text-purple-600" />
            <span className="font-medium text-purple-900">Billing Overview</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}