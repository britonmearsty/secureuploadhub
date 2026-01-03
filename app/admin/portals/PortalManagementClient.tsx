'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Globe, 
  Globe as GlobeOff, 
  Trash2, 
  Eye,
  Users,
  Upload,
  Calendar,
  HardDrive,
  TrendingUp,
  UserCheck,
  Settings,
  ArrowUpDown,
  ExternalLink,
  AlertTriangle,
  BarChart3,
  UserPlus
} from 'lucide-react';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { ToastContainer, Toast } from '@/components/ui/Toast';

interface Portal {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  maxFileSize: number;
  allowedFileTypes: string[];
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  _count: {
    fileUploads: number;
    chunkedUploads: number;
  };
  stats: {
    totalUploads: number;
    completedUploads: number;
    totalSize: number;
  };
}

interface Analytics {
  overview: {
    totalPortals: number;
    activePortals: number;
    inactivePortals: number;
    recentPortals: number;
  };
  trends: {
    uploadTrends: Array<{
      date: string;
      uploads: number;
      active_portals: number;
    }>;
    period: string;
  };
  topPortals: Array<{
    id: string;
    name: string;
    slug: string;
    uploadCount: number;
    user: {
      name: string | null;
      email: string;
    };
  }>;
}

export default function PortalManagementClient() {
  const [portals, setPortals] = useState<Portal[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPortal, setSelectedPortal] = useState<Portal | null>(null);
  const [showPortalDetails, setShowPortalDetails] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferUsers, setTransferUsers] = useState<any[]>([]);
  const [transferLoading, setTransferLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Actions menu state
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);

  // Modal states
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

  // Fetch portals and analytics
  useEffect(() => {
    fetchPortals();
    fetchAnalytics();
  }, []);

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

  const fetchPortals = async () => {
    try {
      const response = await fetch('/api/admin/portals');
      if (response.ok) {
        const data = await response.json();
        setPortals(data.portals);
      } else {
        addToast({
          type: 'error',
          title: 'Failed to load portals',
          message: 'Please try refreshing the page'
        });
      }
    } catch (error) {
      console.error('Failed to fetch portals:', error);
      addToast({
        type: 'error',
        title: 'Failed to load portals',
        message: 'Please check your connection and try again'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/portals/analytics');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  // Filter portals
  const filteredPortals = portals.filter(portal => {
    const matchesSearch = portal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         portal.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         portal.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         portal.user.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && portal.isActive) ||
                         (statusFilter === 'inactive' && !portal.isActive);
    
    return matchesSearch && matchesStatus;
  });

  // Portal actions with retry mechanism
  const retryOperation = async (operation: () => Promise<any>, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) throw error;
        
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  const togglePortalStatus = async (portalId: string, isActive: boolean) => {
    setActionLoading(true);
    setOpenActionMenu(null);
    
    try {
      await retryOperation(async () => {
        const response = await fetch(`/api/admin/portals/${portalId}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to change portal status');
        }

        const { portal } = await response.json();
        setPortals(prev => prev.map(p => p.id === portalId ? { ...p, isActive: portal.isActive } : p));
        
        addToast({
          type: 'success',
          title: `Portal ${isActive ? 'enabled' : 'disabled'}`,
          message: `${portal.name} has been ${isActive ? 'enabled' : 'disabled'} successfully`
        });
      });
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Failed to change portal status',
        message: error.message || 'Please try again'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const deletePortal = async (portalId: string) => {
    setActionLoading(true);
    setOpenActionMenu(null);
    
    try {
      await retryOperation(async () => {
        const response = await fetch(`/api/admin/portals/${portalId}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to delete portal');
        }

        const data = await response.json();
        setPortals(prev => prev.filter(p => p.id !== portalId));
        
        if (selectedPortal?.id === portalId) {
          setShowPortalDetails(false);
          setSelectedPortal(null);
        }

        addToast({
          type: 'success',
          title: 'Portal deleted',
          message: `Portal and ${data.deletedData?.uploads || 0} associated files deleted successfully`
        });
      });
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Failed to delete portal',
        message: error.message || 'Please try again'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePortalStatus = (portal: Portal) => {
    const newStatus = !portal.isActive;
    setConfirmModal({
      isOpen: true,
      title: `${newStatus ? 'Enable' : 'Disable'} Portal`,
      message: `Are you sure you want to ${newStatus ? 'enable' : 'disable'} "${portal.name}"? ${
        newStatus ? 'Users will be able to upload files to this portal.' : 'Users will not be able to upload files to this portal.'
      }`,
      variant: 'warning',
      onConfirm: () => {
        togglePortalStatus(portal.id, newStatus);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDeletePortal = (portal: Portal) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Portal',
      message: `Are you sure you want to delete "${portal.name}"? This action cannot be undone and will delete all associated files (${portal.stats.totalUploads} uploads).`,
      variant: 'danger',
      onConfirm: () => {
        deletePortal(portal.id);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleTransferPortal = async (portal: Portal) => {
    setSelectedPortal(portal);
    setTransferLoading(true);
    try {
      // Fetch available users for transfer
      const response = await fetch('/api/admin/users?limit=100&role=user&status=active');
      if (response.ok) {
        const data = await response.json();
        // Filter out current owner
        const availableUsers = (data.users || []).filter((u: any) => u.id !== portal.user.id);
        setTransferUsers(availableUsers);
        setShowTransferModal(true);
      } else {
        addToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to load users for transfer'
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load users for transfer'
      });
    } finally {
      setTransferLoading(false);
    }
  };

  const transferPortal = async (newOwnerId: string) => {
    if (!selectedPortal) return;
    
    setTransferLoading(true);
    try {
      const response = await fetch(`/api/admin/portals/${selectedPortal.id}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newOwnerId, notifyUsers: true })
      });

      if (response.ok) {
        const data = await response.json();
        setPortals(prev => prev.map(p => 
          p.id === selectedPortal.id 
            ? { ...p, user: data.portal.user }
            : p
        ));
        setShowTransferModal(false);
        setSelectedPortal(null);
        addToast({
          type: 'success',
          title: 'Portal Transferred',
          message: data.message || 'Portal ownership transferred successfully'
        });
      } else {
        const error = await response.json();
        addToast({
          type: 'error',
          title: 'Transfer Failed',
          message: error.error || 'Failed to transfer portal'
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to transfer portal'
      });
    } finally {
      setTransferLoading(false);
    }
  };

  const viewPortalDetails = async (portal: Portal) => {
    setSelectedPortal(portal);
    setShowPortalDetails(true);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

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
          <h1 className="text-2xl font-bold text-slate-900">Portal Management</h1>
          <p className="text-slate-600">Manage upload portals and monitor activity</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowAnalytics(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </button>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Globe className="w-4 h-4" />
            <span>{portals.length} total portals</span>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Globe className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">
                  {analytics.overview.totalPortals}
                </div>
                <div className="text-sm text-slate-600">Total Portals</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Globe className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">
                  {analytics.overview.activePortals}
                </div>
                <div className="text-sm text-slate-600">Active Portals</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <GlobeOff className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">
                  {analytics.overview.inactivePortals}
                </div>
                <div className="text-sm text-slate-600">Inactive Portals</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">
                  {analytics.overview.recentPortals}
                </div>
                <div className="text-sm text-slate-600">Recent (30d)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search portals by name, slug, or owner..."
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
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Portals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredPortals.map((portal) => (
          <motion.div
            key={portal.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-lg transition-shadow"
          >
            {/* Portal Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-slate-900 truncate">
                    {portal.name}
                  </h3>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    portal.isActive 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {portal.isActive ? (
                      <Globe className="w-3 h-3 mr-1" />
                    ) : (
                      <GlobeOff className="w-3 h-3 mr-1" />
                    )}
                    {portal.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mb-2">/{portal.slug}</p>
                {portal.description && (
                  <p className="text-sm text-slate-500 line-clamp-2">
                    {portal.description}
                  </p>
                )}
              </div>
              
              <div className="relative">
                <button 
                  className="p-1 text-slate-400 hover:text-slate-600 rounded"
                  disabled={actionLoading}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenActionMenu(openActionMenu === portal.id ? null : portal.id);
                  }}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                
                {openActionMenu === portal.id && (
                  <div className="absolute right-0 top-8 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
                    <div className="py-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          viewPortalDetails(portal);
                          setOpenActionMenu(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                      
                      <a
                        href={`/p/${portal.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        onClick={() => setOpenActionMenu(null)}
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open Portal
                      </a>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePortalStatus(portal);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        disabled={actionLoading}
                      >
                        {portal.isActive ? (
                          <>
                            <GlobeOff className="w-4 h-4" />
                            Disable Portal
                          </>
                        ) : (
                          <>
                            <Globe className="w-4 h-4" />
                            Enable Portal
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTransferPortal(portal);
                          setOpenActionMenu(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        disabled={actionLoading}
                      >
                        <UserPlus className="w-4 h-4" />
                        Transfer Ownership
                      </button>
                      
                      <hr className="my-1" />
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePortal(portal);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        disabled={actionLoading}
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Portal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Owner Info */}
            <div className="flex items-center gap-2 mb-4">
              {portal.user.image ? (
                <img
                  src={portal.user.image}
                  alt={portal.user.name || portal.user.email}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-slate-600">
                    {(portal.user.name || portal.user.email).charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <div className="text-sm font-medium text-slate-900">
                  {portal.user.name || 'No name'}
                </div>
                <div className="text-xs text-slate-500">{portal.user.email}</div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-lg font-semibold text-slate-900">
                  {portal.stats.totalUploads}
                </div>
                <div className="text-xs text-slate-600">Uploads</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-slate-900">
                  {portal.stats.completedUploads}
                </div>
                <div className="text-xs text-slate-600">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-slate-900">
                  {formatFileSize(portal.stats.totalSize)}
                </div>
                <div className="text-xs text-slate-600">Storage</div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-xs text-slate-500 border-t border-slate-100 pt-3">
              Created {new Date(portal.createdAt).toLocaleDateString()}
            </div>
          </motion.div>
        ))}
      </div>

      {filteredPortals.length === 0 && (
        <div className="text-center py-12">
          <Globe className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No portals found</h3>
          <p className="text-slate-500">Try adjusting your search or filter criteria.</p>
        </div>
      )}

      {/* Portal Details Modal */}
      <AnimatePresence>
        {showPortalDetails && selectedPortal && (
          <PortalDetailsModal
            portal={selectedPortal}
            onClose={() => setShowPortalDetails(false)}
          />
        )}
      </AnimatePresence>

      {/* Analytics Modal */}
      <AnimatePresence>
        {showAnalytics && analytics && (
          <AnalyticsModal
            analytics={analytics}
            onClose={() => setShowAnalytics(false)}
          />
        )}
      </AnimatePresence>

      {/* Transfer Modal */}
      <AnimatePresence>
        {showTransferModal && selectedPortal && (
          <TransferPortalModal
            portal={selectedPortal}
            users={transferUsers}
            onClose={() => {
              setShowTransferModal(false);
              setSelectedPortal(null);
              setTransferUsers([]);
            }}
            onTransfer={transferPortal}
            loading={transferLoading}
          />
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        loading={actionLoading}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

// Transfer Portal Modal Component
function TransferPortalModal({ 
  portal, 
  users, 
  onClose, 
  onTransfer,
  loading 
}: { 
  portal: Portal; 
  users: any[];
  onClose: () => void;
  onTransfer: (userId: string) => void;
  loading: boolean;
}) {
  const [selectedUserId, setSelectedUserId] = useState('');

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
        className="bg-white rounded-xl p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Transfer Portal Ownership</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            disabled={loading}
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-slate-600 mb-2">
              Transfer <span className="font-medium">{portal.name}</span> to a new owner.
            </p>
            <p className="text-sm text-slate-500">
              Current owner: {portal.user.name || portal.user.email}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">
              Select New Owner
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            >
              <option value="">Select a user...</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email} ({user.email})
                </option>
              ))}
            </select>
            {users.length === 0 && (
              <p className="text-sm text-slate-500 mt-2">No available users found</p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (selectedUserId) {
                  onTransfer(selectedUserId);
                }
              }}
              disabled={!selectedUserId || loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Transferring...' : 'Transfer Portal'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Portal Details Modal Component
function PortalDetailsModal({ portal, onClose }: { portal: Portal; onClose: () => void }) {
  const [detailedPortal, setDetailedPortal] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const response = await fetch(`/api/admin/portals/${portal.id}`);
        if (response.ok) {
          const data = await response.json();
          setDetailedPortal(data.portal);
        }
      } catch (error) {
        console.error('Failed to fetch portal details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [portal.id]);

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
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">Portal Details</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
            >
              ×
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto"></div>
              <p className="text-slate-600 mt-2">Loading details...</p>
            </div>
          ) : detailedPortal ? (
            <div className="space-y-6">
              {/* Portal Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-slate-900 mb-3">Portal Information</h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Name:</span> {detailedPortal.name}</div>
                    <div><span className="font-medium">Slug:</span> /{detailedPortal.slug}</div>
                    <div><span className="font-medium">Status:</span> 
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                        detailedPortal.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {detailedPortal.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div><span className="font-medium">Max File Size:</span> {Math.round(detailedPortal.maxFileSize / (1024 * 1024))}MB</div>
                    <div><span className="font-medium">Created:</span> {new Date(detailedPortal.createdAt).toLocaleString()}</div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-slate-900 mb-3">Owner</h3>
                  <div className="flex items-center gap-3">
                    {detailedPortal.user.image ? (
                      <img
                        src={detailedPortal.user.image}
                        alt={detailedPortal.user.name || detailedPortal.user.email}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                        <span className="font-medium text-slate-600">
                          {(detailedPortal.user.name || detailedPortal.user.email).charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-slate-900">
                        {detailedPortal.user.name || 'No name'}
                      </div>
                      <div className="text-sm text-slate-600">{detailedPortal.user.email}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div>
                <h3 className="font-medium text-slate-900 mb-3">Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-slate-900">
                      {detailedPortal.stats.totalUploads}
                    </div>
                    <div className="text-sm text-slate-600">Total Uploads</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-slate-900">
                      {detailedPortal.stats.byStatus?.completed || 0}
                    </div>
                    <div className="text-sm text-slate-600">Completed</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-slate-900">
                      {detailedPortal.stats.byStatus?.pending || 0}
                    </div>
                    <div className="text-sm text-slate-600">Pending</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-slate-900">
                      {Math.round(detailedPortal.stats.totalSize / (1024 * 1024))}MB
                    </div>
                    <div className="text-sm text-slate-600">Storage Used</div>
                  </div>
                </div>
              </div>

              {/* Recent Uploads */}
              <div>
                <h3 className="font-medium text-slate-900 mb-3">Recent Uploads</h3>
                <div className="space-y-2">
                  {detailedPortal.recentUploads?.slice(0, 5).map((upload: any) => (
                    <div key={upload.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded">
                      <div>
                        <div className="font-medium text-sm">{upload.fileName}</div>
                        <div className="text-xs text-slate-600">
                          {upload.clientName && `From: ${upload.clientName}`}
                          {upload.clientEmail && ` (${upload.clientEmail})`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">
                          {new Date(upload.createdAt).toLocaleDateString()}
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          upload.status === 'completed' 
                            ? 'bg-green-100 text-green-700' 
                            : upload.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {upload.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {(!detailedPortal.recentUploads || detailedPortal.recentUploads.length === 0) && (
                    <p className="text-slate-500 text-sm">No recent uploads</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">Failed to load portal details</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// Analytics Modal Component
function AnalyticsModal({ analytics, onClose }: { analytics: Analytics; onClose: () => void }) {
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
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">Portal Analytics</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
            >
              ×
            </button>
          </div>

          <div className="space-y-6">
            {/* Top Portals */}
            <div>
              <h3 className="font-medium text-slate-900 mb-3">Top Portals by Uploads</h3>
              <div className="space-y-2">
                {analytics.topPortals.slice(0, 10).map((portal, index) => (
                  <div key={portal.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-500">#{index + 1}</span>
                      <div>
                        <div className="font-medium text-sm">{portal.name}</div>
                        <div className="text-xs text-slate-600">
                          Owner: {portal.user.name || portal.user.email}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-sm">{portal.uploadCount} uploads</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upload Trends */}
            {analytics.trends.uploadTrends.length > 0 && (
              <div>
                <h3 className="font-medium text-slate-900 mb-3">Upload Trends ({analytics.trends.period})</h3>
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="text-sm text-slate-600 mb-2">Daily upload activity</div>
                  <div className="space-y-1">
                    {analytics.trends.uploadTrends.slice(-7).map((trend: any) => (
                      <div key={trend.date} className="flex items-center justify-between text-sm">
                        <span>{new Date(trend.date).toLocaleDateString()}</span>
                        <span>{trend.uploads} uploads from {trend.active_portals} portals</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}