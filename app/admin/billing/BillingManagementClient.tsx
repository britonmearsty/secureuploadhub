'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  DollarSign, 
  CreditCard, 
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Settings,
  Plus,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3
} from 'lucide-react';

interface Subscription {
  id: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  plan: {
    id: string;
    name: string;
    price: number;
    currency: string;
    features: string[];
  };
  paymentStats: {
    totalPayments: number;
    successfulPayments: number;
    totalRevenue: number;
  };
}

interface BillingPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  features: string[];
  isActive: boolean;
  maxPortals: number;
  maxStorageGB: number;
  maxUploadsMonth: number;
  _count: {
    subscriptions: number;
  };
}

interface Analytics {
  overview: {
    totalSubscriptions: number;
    activeSubscriptions: number;
    cancelledSubscriptions: number;
    recentSubscriptions: number;
    churnRate: number;
  };
  revenue: {
    total: number;
    recent: number;
    mrr: number;
    arpu: number;
    trends: Array<{
      date: string;
      payments: number;
      revenue: number;
    }>;
  };
  payments: {
    byStatus: Record<string, {
      count: number;
      amount: number;
    }>;
  };
  plans: {
    distribution: Array<{
      plan: BillingPlan;
      subscriptions: number;
    }>;
  };
}

export default function BillingManagementClient() {
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'plans' | 'analytics'>('subscriptions');
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan | null>(null);
  const [showPlanDetails, setShowPlanDetails] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'subscriptions') {
        const response = await fetch('/api/admin/billing/subscriptions');
        if (response.ok) {
          const data = await response.json();
          setSubscriptions(data.subscriptions);
        }
      } else if (activeTab === 'plans') {
        const response = await fetch('/api/admin/billing/plans');
        if (response.ok) {
          const data = await response.json();
          setPlans(data.plans);
        }
      } else if (activeTab === 'analytics') {
        const response = await fetch('/api/admin/billing/analytics');
        if (response.ok) {
          const data = await response.json();
          setAnalytics(data.analytics);
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'past_due':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      default:
        return <Clock className="w-4 h-4 text-slate-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      case 'past_due':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  // Filter subscriptions
  const filteredSubscriptions = subscriptions.filter(subscription => {
    const matchesSearch = subscription.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subscription.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subscription.plan.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || subscription.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Billing Management</h1>
          <p className="text-slate-600">Manage subscriptions, plans, and billing analytics</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'subscriptions', name: 'Subscriptions', icon: CreditCard },
            { id: 'plans', name: 'Plans', icon: Settings },
            { id: 'analytics', name: 'Analytics', icon: BarChart3 }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Subscriptions Tab */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search subscriptions by user or plan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="cancelled">Cancelled</option>
              <option value="past_due">Past Due</option>
            </select>
          </div>

          {/* Subscriptions Table */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Customer</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Plan</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Revenue</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Period</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredSubscriptions.map((subscription) => (
                    <tr key={subscription.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {subscription.user.image ? (
                            <img
                              src={subscription.user.image}
                              alt={subscription.user.name || subscription.user.email}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-slate-600">
                                {(subscription.user.name || subscription.user.email).charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          
                          <div>
                            <div className="font-medium text-slate-900">
                              {subscription.user.name || 'No name'}
                            </div>
                            <div className="text-sm text-slate-500">{subscription.user.email}</div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-slate-900">{subscription.plan.name}</div>
                          <div className="text-sm text-slate-500">
                            {formatCurrency(subscription.plan.price, subscription.plan.currency)}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(subscription.status)}`}>
                          {getStatusIcon(subscription.status)}
                          <span className="ml-1">{subscription.status}</span>
                        </span>
                      </td>
                      
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-slate-900">
                            {formatCurrency(subscription.paymentStats.totalRevenue, subscription.plan.currency)}
                          </div>
                          <div className="text-sm text-slate-500">
                            {subscription.paymentStats.successfulPayments} payments
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-600">
                          <div>{new Date(subscription.currentPeriodStart).toLocaleDateString()}</div>
                          <div>to {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</div>
                          {subscription.cancelAtPeriodEnd && (
                            <div className="text-xs text-orange-600 mt-1">Cancels at period end</div>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <div className="relative group">
                            <button className="p-1 text-slate-400 hover:text-slate-600 rounded">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            
                            <div className="absolute right-0 top-8 w-48 bg-white border border-slate-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                              <div className="py-1">
                                <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                  <Eye className="w-4 h-4" />
                                  View Details
                                </button>
                                <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                  <CreditCard className="w-4 h-4" />
                                  Payment History
                                </button>
                                <hr className="my-1" />
                                <button className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                                  <XCircle className="w-4 h-4" />
                                  Cancel Subscription
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredSubscriptions.length === 0 && (
              <div className="text-center py-12">
                <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No subscriptions found</h3>
                <p className="text-slate-500">Try adjusting your search or filter criteria.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Plans Tab */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Billing Plans</h2>
              <p className="text-slate-600">Manage subscription plans and pricing</p>
            </div>
            <button
              onClick={() => setShowCreatePlan(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Plan
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div key={plan.id} className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">{plan.name}</h3>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {formatCurrency(plan.price, plan.currency)}
                      <span className="text-sm font-normal text-slate-500">/month</span>
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    plan.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {plan.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {plan.description && (
                  <p className="text-sm text-slate-600 mb-4">{plan.description}</p>
                )}

                <div className="space-y-2 mb-4">
                  <div className="text-sm text-slate-600">
                    <span className="font-medium">Portals:</span> {plan.maxPortals === -1 ? 'Unlimited' : plan.maxPortals}
                  </div>
                  <div className="text-sm text-slate-600">
                    <span className="font-medium">Storage:</span> {plan.maxStorageGB === -1 ? 'Unlimited' : `${plan.maxStorageGB}GB`}
                  </div>
                  <div className="text-sm text-slate-600">
                    <span className="font-medium">Uploads/month:</span> {plan.maxUploadsMonth === -1 ? 'Unlimited' : plan.maxUploadsMonth}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <span className="text-sm text-slate-600">
                    {plan._count.subscriptions} subscribers
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedPlan(plan);
                        setShowPlanDetails(true);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-1 text-slate-400 hover:text-slate-600 rounded">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-1 text-slate-400 hover:text-red-600 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">
                    {analytics.overview.totalSubscriptions}
                  </div>
                  <div className="text-sm text-slate-600">Total Subscriptions</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">
                    {analytics.overview.activeSubscriptions}
                  </div>
                  <div className="text-sm text-slate-600">Active</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">
                    {formatCurrency(analytics.revenue.mrr)}
                  </div>
                  <div className="text-sm text-slate-600">Monthly Recurring Revenue</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">
                    {(analytics.overview.churnRate * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-slate-600">Churn Rate</div>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Revenue Trends</h3>
            <div className="space-y-2">
              {analytics.revenue.trends.slice(-7).map((trend) => (
                <div key={trend.date} className="flex items-center justify-between text-sm">
                  <span>{new Date(trend.date).toLocaleDateString()}</span>
                  <div className="flex gap-4">
                    <span>{trend.payments} payments</span>
                    <span className="font-medium">{formatCurrency(trend.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Plan Distribution */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Plan Distribution</h3>
            <div className="space-y-3">
              {analytics.plans.distribution.map((item) => (
                <div key={item.plan.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-900">{item.plan.name}</div>
                    <div className="text-sm text-slate-500">
                      {formatCurrency(item.plan.price, item.plan.currency)}/month
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-slate-900">{item.subscriptions}</div>
                    <div className="text-sm text-slate-500">subscribers</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}