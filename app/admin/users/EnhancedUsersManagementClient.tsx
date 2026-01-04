'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  UserCheck, 
  UserX, 
  Shield, 
  ShieldOff, 
  Trash2, 
  Eye,
  CheckSquare,
  Square,
  Users,
  Activity,
  Calendar,
  Mail,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  X,
  Settings
} from 'lucide-react';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { ToastContainer, Toast } from '@/components/ui/Toast';

interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
  status: string;
  createdAt: string;
  _count?: {
    uploadPortals: number;
    fileUploads: number;
    subscriptions: number;
  };
  subscriptions?: Array<{
    id: string;
    status: string;
    plan: {
      name: string;
      price: number;
    };
  }>;
}

interface EnhancedUsersManagementClientProps {
  initialUsers: User[];
  totalUsers: number;
}

export default function EnhancedUsersManagementClient({ 
  initialUsers, 
  totalUsers 
}: EnhancedUsersManagementClientProps) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showLoginHistory, setShowLoginHistory] = useState(false);
  const [loginHistory, setLoginHistory] = useState<any>(null);
  
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

  // Actions menu state - removed since actions are now in modal
  // const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);

  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Retry mechanism
  const retryOperation = async (operation: () => Promise<void>, maxRetries = 2) => {
    let attempts = 0;
    while (attempts <= maxRetries) {
      try {
        await operation();
        return;
      } catch (error) {
        attempts++;
        if (attempts > maxRetries) {
          throw error;
        }
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
      }
    }
  };

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Handle user selection
  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const selectAllUsers = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
      setShowBulkActions(true);
    }
  };

  // Modal helpers
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

  // User actions - moved to modal component
  // const changeUserRole = async (userId: string, newRole: string) => { ... }
  // const changeUserStatus = async (userId: string, newStatus: string) => { ... }
  // const deleteUser = async (userId: string) => { ... }
  // const resetUserPassword = async (userId: string) => { ... }
  // const fetchLoginHistory = async (userId: string) => { ... }

  const performBulkAction = async (action: string, data?: any) => {
    const actionNames = {
      'changeRole': `change role for ${selectedUsers.size} users`,
      'changeStatus': `change status for ${selectedUsers.size} users`,
      'delete': `delete ${selectedUsers.size} users`
    };

    showConfirmation(
      'Bulk Action',
      `Are you sure you want to ${actionNames[action as keyof typeof actionNames] || action}?`,
      async () => {
        setLoading(true);
        try {
          const response = await fetch('/api/admin/users/bulk-actions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action,
              userIds: Array.from(selectedUsers),
              data
            })
          });

          if (response.ok) {
            const result = await response.json();
            closeConfirmation();
            setSelectedUsers(new Set());
            setShowBulkActions(false);
            addToast({
              type: 'success',
              title: 'Bulk Action Completed',
              message: result.message || `Successfully processed ${selectedUsers.size} users`
            });
            // Refresh users list
            window.location.reload();
          } else {
            const error = await response.json();
            addToast({
              type: 'error',
              title: 'Bulk Action Failed',
              message: error.error || 'An unexpected error occurred'
            });
          }
        } catch (error) {
          addToast({
            type: 'error',
            title: 'Network Error',
            message: 'Failed to connect to server. Please try again.'
          });
        } finally {
          setLoading(false);
        }
      },
      'warning'
    );
  };

  const viewUserDetails = (user: User) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-600">Manage user accounts, roles, and permissions</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Users className="w-4 h-4" />
          <span>{totalUsers} total users</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          >
            <option value="all">All Roles</option>
            <option value="user">Users</option>
            <option value="admin">Admins</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions Bar - Fixed at bottom */}
      <AnimatePresence>
        {showBulkActions && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg p-4 z-40"
          >
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-4 bg-white rounded-2xl shadow-lg border border-slate-200 px-6 py-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-slate-900">
                    {selectedUsers.size} users selected
                  </span>
                  <button
                    onClick={() => {
                      setSelectedUsers(new Set());
                      setShowBulkActions(false);
                    }}
                    className="text-sm text-slate-500 hover:text-slate-700"
                  >
                    Clear selection
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => performBulkAction('changeRole', { role: 'admin' })}
                    className="px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                    disabled={loading}
                  >
                    <Shield className="w-4 h-4 mr-1 inline" />
                    Make Admin
                  </button>
                  <button
                    onClick={() => performBulkAction('changeRole', { role: 'user' })}
                    className="px-3 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                    disabled={loading}
                  >
                    <Users className="w-4 h-4 mr-1 inline" />
                    Make User
                  </button>
                  <button
                    onClick={() => performBulkAction('changeStatus', { status: 'disabled' })}
                    className="px-3 py-2 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
                    disabled={loading}
                  >
                    <UserX className="w-4 h-4 mr-1 inline" />
                    Disable
                  </button>
                  <button
                    onClick={() => performBulkAction('changeStatus', { status: 'active' })}
                    className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                    disabled={loading}
                  >
                    <UserCheck className="w-4 h-4 mr-1 inline" />
                    Enable
                  </button>
                  <button
                    onClick={() => performBulkAction('delete')}
                    className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                    disabled={loading}
                  >
                    <Trash2 className="w-4 h-4 mr-1 inline" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Users Table */}
      <div className={`bg-white rounded-lg border border-slate-200 ${showBulkActions ? 'mb-20' : ''} min-h-[600px] flex flex-col`}>
        <div className="overflow-x-auto overflow-y-visible flex-1">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={selectAllUsers}
                    className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900"
                  >
                    {selectedUsers.size === filteredUsers.length && filteredUsers.length > 0 ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    User
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Role</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Activity</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredUsers.map((user) => (
                <tr 
                  key={user.id} 
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => viewUserDetails(user)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleUserSelection(user.id);
                        }}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        {selectedUsers.has(user.id) ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>

                      {user.image ? (
                        <img
                          src={user.image}
                          alt={user.name || user.email}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-slate-600">
                            {(user.name || user.email).charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}

                      <div>
                        <div className="font-medium text-slate-900">
                          {user.name || 'No name'}
                        </div>
                        <div className="text-sm text-slate-500">{user.email}</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      user.role === 'admin'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {user.role === 'admin' ? (
                        <Shield className="w-3 h-3 mr-1" />
                      ) : (
                        <Users className="w-3 h-3 mr-1" />
                      )}
                      {user.role}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      user.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {user.status === 'active' ? (
                        <UserCheck className="w-3 h-3 mr-1" />
                      ) : (
                        <UserX className="w-3 h-3 mr-1" />
                      )}
                      {user.status}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="text-sm text-slate-600">
                      {user._count && (
                        <div className="space-y-1">
                          <div>{user._count.uploadPortals} portals</div>
                          <div>{user._count.fileUploads} uploads</div>
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="text-sm text-slate-600">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </td>


                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12">
                    <div className="text-center">
                      <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-slate-900 mb-2">No users found</h3>
                      <p className="text-slate-500">Try adjusting your search or filter criteria.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details Modal */}
      <AnimatePresence>
        {showUserDetails && selectedUser && (
          <UserDetailsModal
            user={selectedUser}
            onClose={() => setShowUserDetails(false)}
          />
        )}
      </AnimatePresence>

      {/* Login History Modal */}
      <AnimatePresence>
        {showLoginHistory && loginHistory && (
          <LoginHistoryModal
            loginHistory={loginHistory}
            onClose={() => {
              setShowLoginHistory(false);
              setLoginHistory(null);
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
        loading={loading}
      />

      {/* Click outside handler removed - no longer needed */}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

// User Details Modal Component
function UserDetailsModal({ user, onClose }: { user: User; onClose: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleRoleChange = async (newRole: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${user.id}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });

      if (response.ok) {
        window.location.reload(); // Refresh to update the user data
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update role');
      }
    } catch (error) {
      alert('Failed to update role');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${user.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        window.location.reload(); // Refresh to update the user data
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update status');
      }
    } catch (error) {
      alert('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!confirm(`Send password reset email to ${user.email}?`)) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${user.id}/password-reset`, {
        method: 'POST'
      });

      if (response.ok) {
        alert(`Password reset email sent to ${user.email}`);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to send reset email');
      }
    } catch (error) {
      alert('Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${user.name || user.email}? This action cannot be undone.`)) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert(`${user.name || user.email} has been deleted successfully`);
        window.location.reload(); // Refresh to update the user list
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete user');
      }
    } catch (error) {
      alert('Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginHistory = async () => {
    try {
      const response = await fetch(`/api/admin/users/${user.id}/login-history`);
      if (response.ok) {
        const data = await response.json();
        // For now, just show an alert with basic info
        alert(`Login History for ${user.email}:\nTotal Logins: ${data.loginHistory?.statistics?.totalLogins || 0}\nLast Login: ${data.loginHistory?.statistics?.lastLogin ? new Date(data.loginHistory.statistics.lastLogin).toLocaleString() : 'Never'}`);
      } else {
        alert('Failed to load login history');
      }
    } catch (error) {
      alert('Failed to load login history');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] w-full max-w-2xl border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-8 border-b border-slate-200 bg-slate-50/50 flex justify-between items-start shrink-0">
          <div className="flex items-center gap-4">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name || user.email}
                className="w-16 h-16 rounded-2xl shadow-sm border border-slate-200"
              />
            ) : (
              <div className="w-16 h-16 bg-slate-200 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center">
                <span className="text-xl font-bold text-slate-600">
                  {(user.name || user.email).charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h3 className="text-2xl font-bold text-slate-900 leading-tight">
                {user.name || 'No name'}
              </h3>
              <p className="text-slate-600 mt-1">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  user.role === 'admin'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {user.role === 'admin' ? (
                    <Shield className="w-3 h-3 mr-1" />
                  ) : (
                    <Users className="w-3 h-3 mr-1" />
                  )}
                  {user.role}
                </span>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  user.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {user.status === 'active' ? (
                    <UserCheck className="w-3 h-3 mr-1" />
                  ) : (
                    <UserX className="w-3 h-3 mr-1" />
                  )}
                  {user.status}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto">
          {/* Stats */}
          {user._count && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Portals</p>
                <p className="text-xl font-bold text-slate-900">{user._count.uploadPortals}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Uploads</p>
                <p className="text-xl font-bold text-slate-900">{user._count.fileUploads}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Subscriptions</p>
                <p className="text-xl font-bold text-slate-900">{user._count.subscriptions}</p>
              </div>
            </div>
          )}

          {/* Account Info */}
          <div className="space-y-3 mb-8">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-600" />
              Account Information
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-600 text-xs font-medium">Joined:</span>
                <div className="font-bold text-slate-900">{new Date(user.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-600 text-xs font-medium">User ID:</span>
                <div className="font-mono text-xs text-slate-900 truncate">{user.id}</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-600" />
              User Actions
            </h4>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Role Actions */}
              {user.role === 'admin' ? (
                <button
                  onClick={() => handleRoleChange('user')}
                  disabled={loading}
                  className="p-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50"
                >
                  <ShieldOff className="w-4 h-4" />
                  Remove Admin
                </button>
              ) : (
                <button
                  onClick={() => handleRoleChange('admin')}
                  disabled={loading}
                  className="p-3 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50"
                >
                  <Shield className="w-4 h-4" />
                  Make Admin
                </button>
              )}

              {/* Status Actions */}
              {user.status === 'active' ? (
                <button
                  onClick={() => handleStatusChange('disabled')}
                  disabled={loading}
                  className="p-3 bg-orange-100 text-orange-700 rounded-xl hover:bg-orange-200 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50"
                >
                  <UserX className="w-4 h-4" />
                  Disable Account
                </button>
              ) : (
                <button
                  onClick={() => handleStatusChange('active')}
                  disabled={loading}
                  className="p-3 bg-green-100 text-green-700 rounded-xl hover:bg-green-200 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50"
                >
                  <UserCheck className="w-4 h-4" />
                  Enable Account
                </button>
              )}

              {/* Password Reset */}
              <button
                onClick={handlePasswordReset}
                disabled={loading}
                className="p-3 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50"
              >
                <Mail className="w-4 h-4" />
                Reset Password
              </button>

              {/* Login History */}
              <button
                onClick={handleLoginHistory}
                disabled={loading}
                className="p-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50"
              >
                <Activity className="w-4 h-4" />
                Login History
              </button>
            </div>

            {/* Danger Zone */}
            <div className="pt-4 border-t border-slate-200">
              <button
                onClick={handleDelete}
                disabled={loading}
                className="w-full p-3 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Delete User
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Login History Modal Component
function LoginHistoryModal({ 
  loginHistory, 
  onClose 
}: { 
  loginHistory: any; 
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
        className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Login History</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-900">{loginHistory.statistics?.totalLogins || 0}</div>
              <div className="text-sm text-slate-600">Total Logins</div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-900">{loginHistory.statistics?.recentLogins7Days || 0}</div>
              <div className="text-sm text-slate-600">Last 7 Days</div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-900">{loginHistory.statistics?.recentLogins30Days || 0}</div>
              <div className="text-sm text-slate-600">Last 30 Days</div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-900">{loginHistory.statistics?.activeSessions || 0}</div>
              <div className="text-sm text-slate-600">Active Sessions</div>
            </div>
          </div>

          {/* Login Methods */}
          {loginHistory.accounts && loginHistory.accounts.length > 0 && (
            <div>
              <h4 className="font-medium text-slate-900 mb-3">Login Methods</h4>
              <div className="flex gap-2">
                {loginHistory.accounts.map((account: any, index: number) => (
                  <span 
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700"
                  >
                    {account.provider.charAt(0).toUpperCase() + account.provider.slice(1)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recent Sessions */}
          <div>
            <h4 className="font-medium text-slate-900 mb-3">Recent Sessions</h4>
            {loginHistory.sessions && loginHistory.sessions.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {loginHistory.sessions.map((session: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <div className="font-medium text-slate-900">
                        {new Date(session.loginTime).toLocaleString()}
                      </div>
                      <div className="text-sm text-slate-600">
                        Expires: {new Date(session.expiresAt).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        session.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {session.isActive ? 'Active' : 'Expired'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                No login sessions found
              </div>
            )}
          </div>

          {/* Last Login */}
          {loginHistory.statistics?.lastLogin && (
            <div className="border-t pt-4">
              <div className="text-sm text-slate-600">
                Last Login: <span className="font-medium text-slate-900">
                  {new Date(loginHistory.statistics.lastLogin).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}