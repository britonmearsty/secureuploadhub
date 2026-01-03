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
  ChevronDown
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

  // Actions menu state
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);

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

  // User actions
  const changeUserRole = async (userId: string, newRole: string) => {
    setLoading(true);
    try {
      await retryOperation(async () => {
        const response = await fetch(`/api/admin/users/${userId}/role`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update role');
        }

        const result = await response.json();
        setUsers(users.map(user => 
          user.id === userId ? { ...user, role: newRole } : user
        ));
        const user = users.find(u => u.id === userId);
        addToast({
          type: 'success',
          title: 'Role Updated',
          message: `${user?.name || user?.email} is now ${newRole === 'admin' ? 'an admin' : 'a user'}`
        });
      });
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Failed to Update Role',
        message: error.message || 'An unexpected error occurred'
      });
    } finally {
      setLoading(false);
    }
  };

  const changeUserStatus = async (userId: string, newStatus: string) => {
    setLoading(true);
    try {
      await retryOperation(async () => {
        const response = await fetch(`/api/admin/users/${userId}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update status');
        }

        const result = await response.json();
        setUsers(users.map(user => 
          user.id === userId ? { ...user, status: newStatus } : user
        ));
        const user = users.find(u => u.id === userId);
        addToast({
          type: 'success',
          title: 'Status Updated',
          message: `${user?.name || user?.email} account is now ${newStatus}`
        });
      });
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Failed to Update Status',
        message: error.message || 'An unexpected error occurred'
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    showConfirmation(
      'Delete User',
      `Are you sure you want to delete ${user?.name || user?.email}? This action cannot be undone.`,
      async () => {
        setLoading(true);
        try {
          const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE'
          });

          if (response.ok) {
            setUsers(users.filter(user => user.id !== userId));
            closeConfirmation();
            addToast({
              type: 'success',
              title: 'User Deleted',
              message: `${user?.name || user?.email} has been deleted successfully`
            });
          } else {
            const error = await response.json();
            addToast({
              type: 'error',
              title: 'Failed to Delete User',
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
      'danger'
    );
  };

  const resetUserPassword = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    showConfirmation(
      'Reset Password',
      `Send password reset email to ${user?.email}?`,
      async () => {
        setLoading(true);
        try {
          const response = await fetch(`/api/admin/users/${userId}/password-reset`, {
            method: 'POST'
          });

          if (response.ok) {
            closeConfirmation();
            addToast({
              type: 'success',
              title: 'Password Reset Sent',
              message: `Password reset email sent to ${user?.email}`
            });
          } else {
            const error = await response.json();
            addToast({
              type: 'error',
              title: 'Failed to Send Reset Email',
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
      'info'
    );
  };

  const fetchLoginHistory = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/login-history`);
      if (response.ok) {
        const data = await response.json();
        setLoginHistory(data.loginHistory);
        setShowLoginHistory(true);
      } else {
        addToast({
          type: 'error',
          title: 'Failed to Load Login History',
          message: 'Could not retrieve login history data'
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Network Error',
        message: 'Failed to connect to server. Please try again.'
      });
    }
  };

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
            <div className="max-w-7xl mx-auto flex items-center justify-between">
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Users Table */}
      <div className={`bg-white rounded-lg border border-slate-200 overflow-hidden ${showBulkActions ? 'mb-20' : ''}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
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
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleUserSelection(user.id)}
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

                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => viewUserDetails(user)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <div className="relative">
                        <button 
                          onClick={() => setOpenActionMenu(openActionMenu === user.id ? null : user.id)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        <AnimatePresence>
                          {openActionMenu === user.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="absolute right-0 top-8 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-50"
                            >
                              <div className="py-1">
                                {user.role === 'admin' ? (
                                  <button
                                    onClick={() => {
                                      changeUserRole(user.id, 'user');
                                      setOpenActionMenu(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                    disabled={loading}
                                  >
                                    <ShieldOff className="w-4 h-4" />
                                    Remove Admin
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      changeUserRole(user.id, 'admin');
                                      setOpenActionMenu(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                    disabled={loading}
                                  >
                                    <Shield className="w-4 h-4" />
                                    Make Admin
                                  </button>
                                )}

                                {user.status === 'active' ? (
                                  <button
                                    onClick={() => {
                                      changeUserStatus(user.id, 'disabled');
                                      setOpenActionMenu(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                    disabled={loading}
                                  >
                                    <UserX className="w-4 h-4" />
                                    Disable Account
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      changeUserStatus(user.id, 'active');
                                      setOpenActionMenu(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                    disabled={loading}
                                  >
                                    <UserCheck className="w-4 h-4" />
                                    Enable Account
                                  </button>
                                )}

                                <button
                                  onClick={() => {
                                    resetUserPassword(user.id);
                                    setOpenActionMenu(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                  disabled={loading}
                                >
                                  <Mail className="w-4 h-4" />
                                  Reset Password
                                </button>

                                <button
                                  onClick={() => {
                                    fetchLoginHistory(user.id);
                                    setOpenActionMenu(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Activity className="w-4 h-4" />
                                  Login History
                                </button>

                                <hr className="my-1" />

                                <button
                                  onClick={() => {
                                    deleteUser(user.id);
                                    setOpenActionMenu(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                  disabled={loading}
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete User
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No users found</h3>
            <p className="text-slate-500">Try adjusting your search or filter criteria.</p>
          </div>
        )}
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

      {/* Click outside to close action menus */}
      {openActionMenu && (
        <div 
          className="fixed inset-0 z-30" 
          onClick={() => setOpenActionMenu(null)}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

// User Details Modal Component
function UserDetailsModal({ user, onClose }: { user: User; onClose: () => void }) {
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
          <h2 className="text-xl font-bold text-slate-900">User Details</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          {/* User Info */}
          <div className="flex items-center gap-4">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name || user.email}
                className="w-16 h-16 rounded-full"
              />
            ) : (
              <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center">
                <span className="text-xl font-medium text-slate-600">
                  {(user.name || user.email).charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h3 className="text-lg font-medium text-slate-900">
                {user.name || 'No name'}
              </h3>
              <p className="text-slate-600">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  user.role === 'admin'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {user.role}
                </span>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  user.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {user.status}
                </span>
              </div>
            </div>
          </div>

          {/* Stats */}
          {user._count && (
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-slate-900">{user._count.uploadPortals}</div>
                <div className="text-sm text-slate-600">Portals</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-slate-900">{user._count.fileUploads}</div>
                <div className="text-sm text-slate-600">Uploads</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-slate-900">{user._count.subscriptions}</div>
                <div className="text-sm text-slate-600">Subscriptions</div>
              </div>
            </div>
          )}

          {/* Account Info */}
          <div className="space-y-3">
            <h4 className="font-medium text-slate-900">Account Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-600">Joined:</span>
                <div className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</div>
              </div>
              <div>
                <span className="text-slate-600">ID:</span>
                <div className="font-mono text-xs">{user.id}</div>
              </div>
            </div>
          </div>
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