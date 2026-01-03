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
import { CreatePlanModal } from '@/components/admin/CreatePlanModal';
import { DeletePlanModal } from '@/components/admin/DeletePlanModal';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

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
  const [editingPlan, setEditingPlan] = useState<BillingPlan | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan | null>(null);
  const [showPlanDetails, setShowPlanDetails] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [showSubscriptionDetails, setShowSubscriptionDetails] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  const [showDeletePlan, setShowDeletePlan] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<BillingPlan | null>(null);

  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'danger'
  });

  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const showConfirmation = (title: string, message: string, onConfirm: () => void, variant: 'danger' | 'warning' | 'info' = 'danger') => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm,
      variant
    });
  };

  const closeConfirmation = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenActionMenu(null);
    };

    if (openActionMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openActionMenu]);

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
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to fetch data. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePlanCreated = (newPlan: BillingPlan) => {
    if (editingPlan) {
      setPlans(prev => prev.map(p => p.id === editingPlan.id ? newPlan : p));
      addToast({
        type: 'success',
        title: 'Plan Updated',
        message: `${newPlan.name} has been updated successfully.`
      });
      setEditingPlan(null);
    } else {
      setPlans(prev => [...prev, newPlan]);
      addToast({
        type: 'success',
        title: 'Plan Created',
        message: `${newPlan.name} has been created successfully.`
      });
    }
  };

  const handlePlanError = (message: string) => {
    addToast({
      type: 'error',
      title: 'Error',
      message
    });
  };

  const viewSubscriptionDetails = async (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setShowSubscriptionDetails(true);
  };

  const fetchPaymentHistory = async (subscriptionId: string) => {
    try {
      const response = await fetch(`/api/admin/billing/subscriptions/${subscriptionId}/payments`);
      if (response.ok) {
        const data = await response.json();
        setPaymentHistory(data.payments || []);
        setShowPaymentHistory(true);
      } else {
        addToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to fetch payment history'
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to fetch payment history'
      });
    }
  };

  const cancelSubscription = async (subscriptionId: string) => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/billing/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        setSubscriptions(prev => prev.map(sub => 
          sub.id === subscriptionId 
            ? { ...sub, cancelAtPeriodEnd: true, status: 'active' }
            : sub
        ));
        closeConfirmation();
        setOpenActionMenu(null);
        addToast({
          type: 'success',
          title: 'Subscription Cancelled',
          message: data.message || 'Subscription will be cancelled at the end of the billing period'
        });
        fetchData();
      } else {
        const error = await response.json();
        addToast({
          type: 'error',
          title: 'Error',
          message: error.error || 'Failed to cancel subscription'
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to cancel subscription'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = (subscription: Subscription) => {
    showConfirmation(
      'Cancel Subscription',
      `Are you sure you want to cancel ${subscription.user.name || subscription.user.email}'s subscription? The subscription will remain active until ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}.`,
      () => cancelSubscription(subscription.id),
      'warning'
    );
  };

  const handleDeletePlan = (plan: BillingPlan) => {
    // Use new modal for plans with subscriptions, old confirmation for empty plans
    if (plan._count.subscriptions > 0) {
      setPlanToDelete(plan);
      setShowDeletePlan(true);
    } else {
      showConfirmation(
        'Delete Plan',
        `Are you sure you want to delete "${plan.name}"? This action cannot be undone.`,
        () => deletePlan(plan.id),
        'danger'
      );
    }
  };

  const deletePlan = async (planId: string, force?: boolean, migrateTo?: string) => {
    setActionLoading(true);
    try {
      const url = new URL(`/api/admin/billing/plans/${planId}`, window.location.origin);
      if (force) url.searchParams.set('force', 'true');
      if (migrateTo) url.searchParams.set('migrateTo', migrateTo);

      const response = await fetch(url.toString(), {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        setPlans(prev => prev.filter(p => p.id !== planId));
        setShowDeletePlan(false);
        setPlanToDelete(null);
        addToast({
          type: 'success',
          title: 'Plan Deleted',
          message: data.message || 'Billing plan deleted successfully'
        });
        fetchData();
      } else {
        addToast({
          type: 'error',
          title: 'Delete Failed',
          message: data.error || 'Failed to delete plan'
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete plan'
      });
    } finally {
      setActionLoading(false);
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
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Create/Edit Plan Modal */}
      <CreatePlanModal
        isOpen={showCreatePlan || !!editingPlan}
        onClose={() => {
          setShowCreatePlan(false);
          setEditingPlan(null);
        }}
        onSuccess={handlePlanCreated}
        onError={handlePlanError}
        editPlan={editingPlan}
      />

      {/* Delete Plan Modal */}
      <DeletePlanModal
        isOpen={showDeletePlan}
        onClose={() => {
          setShowDeletePlan(false);
          setPlanToDelete(null);
        }}
        plan={planToDelete}
        availablePlans={plans}
        onDelete={deletePlan}
      />

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
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden min-h-[600px] flex flex-col">
            <div className="overflow-x-auto overflow-y-visible flex-1">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
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
                          <div className="relative">
                            <button 
                              onClick={() => setOpenActionMenu(openActionMenu === subscription.id ? null : subscription.id)}
                              className="p-1 text-slate-400 hover:text-slate-600 rounded"
                              disabled={actionLoading}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            
                            <AnimatePresence>
                              {openActionMenu === subscription.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className="absolute right-0 bottom-full mb-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-50"
                                >
                                  <div className="py-1">
                                    <button 
                                      onClick={() => {
                                        viewSubscriptionDetails(subscription);
                                        setOpenActionMenu(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                    >
                                      <Eye className="w-4 h-4" />
                                      View Details
                                    </button>
                                    <button 
                                      onClick={() => {
                                        fetchPaymentHistory(subscription.id);
                                        setOpenActionMenu(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                    >
                                      <CreditCard className="w-4 h-4" />
                                      Payment History
                                    </button>
                                    {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
                                      <>
                                        <hr className="my-1" />
                                        <button 
                                          onClick={() => {
                                            handleCancelSubscription(subscription);
                                            setOpenActionMenu(null);
                                          }}
                                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                          disabled={actionLoading}
                                        >
                                          <XCircle className="w-4 h-4" />
                                          Cancel Subscription
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredSubscriptions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12">
                        <div className="text-center">
                          <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-slate-900 mb-2">No subscriptions found</h3>
                          <p className="text-slate-500">Try adjusting your search or filter criteria.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
                    <button 
                      onClick={() => {
                        setEditingPlan(plan);
                        setShowCreatePlan(true);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded"
                      title="Edit Plan"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeletePlan(plan)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded"
                      title="Delete Plan"
                      disabled={actionLoading}
                    >
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

      {/* Subscription Details Modal */}
      <AnimatePresence>
        {showSubscriptionDetails && selectedSubscription && (
          <SubscriptionDetailsModal
            subscription={selectedSubscription}
            onClose={() => {
              setShowSubscriptionDetails(false);
              setSelectedSubscription(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Payment History Modal */}
      <AnimatePresence>
        {showPaymentHistory && (
          <PaymentHistoryModal
            payments={paymentHistory}
            subscription={selectedSubscription}
            onClose={() => {
              setShowPaymentHistory(false);
              setPaymentHistory([]);
            }}
          />
        )}
      </AnimatePresence>

      {/* Plan Preview Modal */}
      <AnimatePresence>
        {showPlanDetails && selectedPlan && (
          <PlanPreviewModal
            plan={selectedPlan}
            onClose={() => {
              setShowPlanDetails(false);
              setSelectedPlan(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmation}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        loading={actionLoading}
      />

      {/* Click outside to close action menus */}
      {openActionMenu && (
        <div 
          className="fixed inset-0 z-30" 
          onClick={() => setOpenActionMenu(null)}
        />
      )}
    </div>
  );
}

// Subscription Details Modal Component
function SubscriptionDetailsModal({ 
  subscription, 
  onClose 
}: { 
  subscription: Subscription; 
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Subscription Details</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          {/* Customer Info */}
          <div>
            <h3 className="font-medium text-slate-900 mb-3">Customer</h3>
            <div className="flex items-center gap-3">
              {subscription.user.image ? (
                <img
                  src={subscription.user.image}
                  alt={subscription.user.name || subscription.user.email}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                  <span className="font-medium text-slate-600">
                    {(subscription.user.name || subscription.user.email).charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <div className="font-medium text-slate-900">
                  {subscription.user.name || 'No name'}
                </div>
                <div className="text-sm text-slate-600">{subscription.user.email}</div>
              </div>
            </div>
          </div>

          {/* Plan Info */}
          <div>
            <h3 className="font-medium text-slate-900 mb-3">Plan</h3>
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="font-semibold text-slate-900">{subscription.plan.name}</div>
              <div className="text-sm text-slate-600 mt-1">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: subscription.plan.currency
                }).format(subscription.plan.price)}/month
              </div>
            </div>
          </div>

          {/* Subscription Status */}
          <div>
            <h3 className="font-medium text-slate-900 mb-3">Status</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-slate-600">Status:</span>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    subscription.status === 'active' ? 'bg-green-100 text-green-700' :
                    subscription.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-orange-100 text-orange-700'
                  }`}>
                    {subscription.status}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-sm text-slate-600">Cancels at period end:</span>
                <div className="mt-1 font-medium">
                  {subscription.cancelAtPeriodEnd ? 'Yes' : 'No'}
                </div>
              </div>
            </div>
          </div>

          {/* Billing Period */}
          <div>
            <h3 className="font-medium text-slate-900 mb-3">Billing Period</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-600">Current Period Start:</span>
                <div className="font-medium">
                  {new Date(subscription.currentPeriodStart).toLocaleDateString()}
                </div>
              </div>
              <div>
                <span className="text-slate-600">Current Period End:</span>
                <div className="font-medium">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Statistics */}
          <div>
            <h3 className="font-medium text-slate-900 mb-3">Payment Statistics</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-slate-900">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: subscription.plan.currency
                  }).format(subscription.paymentStats.totalRevenue)}
                </div>
                <div className="text-sm text-slate-600">Total Revenue</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-slate-900">
                  {subscription.paymentStats.successfulPayments}
                </div>
                <div className="text-sm text-slate-600">Successful Payments</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-slate-900">
                  {subscription.paymentStats.totalPayments}
                </div>
                <div className="text-sm text-slate-600">Total Payments</div>
              </div>
            </div>
          </div>

          {/* Created Date */}
          <div className="text-sm text-slate-600">
            Created: {new Date(subscription.createdAt).toLocaleString()}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Plan Preview Modal Component
function PlanPreviewModal({ 
  plan, 
  onClose 
}: { 
  plan: BillingPlan; 
  onClose: () => void;
}) {
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Plan Preview</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          {/* Plan Header */}
          <div className="text-center pb-6 border-b border-slate-200">
            <div className="flex items-center justify-center gap-2 mb-2">
              <h3 className="text-2xl font-bold text-slate-900">{plan.name}</h3>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                plan.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {plan.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            {plan.description && (
              <p className="text-slate-600 mt-2">{plan.description}</p>
            )}
            <div className="mt-4">
              <span className="text-4xl font-bold text-slate-900">
                {formatCurrency(plan.price, plan.currency)}
              </span>
              <span className="text-slate-500 ml-1">/month</span>
            </div>
          </div>

          {/* Plan Limits */}
          <div>
            <h4 className="font-medium text-slate-900 mb-3">Plan Limits</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-1">Max Portals</div>
                <div className="text-2xl font-bold text-slate-900">
                  {plan.maxPortals === -1 ? 'Unlimited' : plan.maxPortals}
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-1">Max Storage</div>
                <div className="text-2xl font-bold text-slate-900">
                  {plan.maxStorageGB === -1 ? 'Unlimited' : `${plan.maxStorageGB} GB`}
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-1">Max Uploads/Month</div>
                <div className="text-2xl font-bold text-slate-900">
                  {plan.maxUploadsMonth === -1 ? 'Unlimited' : plan.maxUploadsMonth.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Features */}
          {plan.features && plan.features.length > 0 && (
            <div>
              <h4 className="font-medium text-slate-900 mb-3">Features</h4>
              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Statistics */}
          <div className="border-t border-slate-200 pt-4">
            <div className="text-sm text-slate-600">
              <span className="font-medium">Subscribers:</span> {plan._count.subscriptions}
            </div>
            <div className="text-sm text-slate-600 mt-1">
              <span className="font-medium">Currency:</span> {plan.currency}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Payment History Modal Component
function PaymentHistoryModal({ 
  payments, 
  subscription,
  onClose 
}: { 
  payments: any[]; 
  subscription: Subscription | null;
  onClose: () => void;
}) {
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Payment History</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ×
          </button>
        </div>

        {subscription && (
          <div className="mb-4 p-3 bg-slate-50 rounded-lg">
            <div className="text-sm text-slate-600">Subscription:</div>
            <div className="font-medium">{subscription.plan.name}</div>
          </div>
        )}

        {payments.length > 0 ? (
          <div className="space-y-2">
            {payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <div className="font-medium text-slate-900">
                    {formatCurrency(payment.amount, payment.currency || 'USD')}
                  </div>
                  <div className="text-sm text-slate-600">
                    {new Date(payment.createdAt).toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    payment.status === 'completed' ? 'bg-green-100 text-green-700' :
                    payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {payment.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            No payment history available
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}