'use client';

import { useState, useEffect } from 'react';
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
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30');

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/admin/analytics?days=${selectedPeriod}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
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
      <div className="p-8">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-slate-200">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-slate-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-8">
        <div className="text-center text-slate-600">
          Failed to load analytics data
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
          value={analytics.overview.users.total.toLocaleString()}
          change={`+${analytics.overview.users.new} new`}
          icon={Users}
          trend="up"
          color="blue"
        />
        <StatCard
          title="Active Portals"
          value={analytics.overview.portals.active.toLocaleString()}
          change={`${analytics.overview.portals.total} total`}
          icon={FolderOpen}
          trend="neutral"
          color="green"
        />
        <StatCard
          title="Total Uploads"
          value={analytics.overview.uploads.completed.toLocaleString()}
          change={`+${analytics.overview.uploads.recent} recent`}
          icon={Upload}
          trend="up"
          color="purple"
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(analytics.overview.billing.totalRevenue)}
          change={`+${formatCurrency(analytics.overview.billing.recentRevenue)} recent`}
          icon={DollarSign}
          trend="up"
          color="orange"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Admin Users"
          value={analytics.overview.users.admins}
          icon={Shield}
          color="red"
        />
        <StatCard
          title="Storage Used"
          value={formatBytes(analytics.overview.uploads.totalStorage)}
          icon={BarChart3}
          color="blue"
        />
        <StatCard
          title="Active Subscriptions"
          value={analytics.overview.billing.activeSubscriptions}
          change={`${analytics.overview.users.conversionRate}% conversion`}
          icon={CreditCard}
          color="green"
        />
        <StatCard
          title="Avg Revenue/User"
          value={formatCurrency(analytics.overview.billing.averageRevenuePerUser)}
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
            {analytics.topUsers.slice(0, 5).map((user, index) => (
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
                    {user._count.uploadPortals} portals
                  </p>
                  <p className="text-sm text-slate-600">
                    {user._count.fileUploads} uploads
                  </p>
                </div>
              </div>
            ))}
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
            {analytics.recentActivity.slice(0, 10).map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 p-3 hover:bg-slate-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900">
                    <span className="font-medium">{activity.user.name || activity.user.email}</span>
                    {' '}performed{' '}
                    <span className="font-medium">{activity.action.toLowerCase().replace(/_/g, ' ')}</span>
                    {' '}on{' '}
                    <span className="font-medium">{activity.resource}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(activity.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
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
          <button className="flex items-center space-x-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
            <Users className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-900">Manage Users</span>
          </button>
          <button className="flex items-center space-x-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
            <FolderOpen className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-900">View Portals</span>
          </button>
          <button className="flex items-center space-x-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
            <CreditCard className="w-5 h-5 text-purple-600" />
            <span className="font-medium text-purple-900">Billing Overview</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}