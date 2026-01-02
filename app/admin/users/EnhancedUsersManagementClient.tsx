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
  AlertTriangle
} from 'lucide-react';

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

  // User actions
  const changeUserRole = async (userId: string, newRole: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });

      if (response.ok) {
        const result = await response.json();
        setUsers(users.map(user => 
          user.id === userId ? { ...user, role: newRole } : user
        ));
        // Show success message
      } else {
        const error = await response.json();
        console.error('Failed to change user role:', error.error);
      }
    } catch (error) {
      console.error('Error changing user role:', error);
    } finally {
      setLoading(false);
    }
  };

  const changeUserStatus = async (userId: string, newStatus: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        const result = await response.json();
        setUsers(users.map(user => 
          user.id === userId ? { ...user, status: newStatus } : user
        ));
        // Show success message
      } else {
        const error = await response.json();
        console.error('Failed to change user status:', error.error);
      }
    } catch (error) {
      console.error('Error changing user status:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setUsers(users.filter(user => user.id !== userId));
        // Show success message
      } else {
        const error = await response.json();
        console.error('Failed to delete user:', error.error);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetUserPassword = async (userId: string) => {
    if (!confirm('Send password reset email to this user?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/password-reset`, {
        method: 'POST'
      });

      if (response.ok) {
        // Show success message
        alert('Password reset email sent successfully');
      } else {
        const error = await response.json();
        console.error('Failed to send password reset:', error.error);
      }
    } catch (error) {
      console.error('Error sending password reset:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLoginHistory = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/login-history`);
      if (response.ok) {
        const data = await response.json();
        setLoginHistory(data.loginHistory);
        setShowLoginHistory(true);
      }
    } catch (error) {
      console.error('Error fetching login history:', error);
    }
  };

  const performBulkAction = async (action: string, data?: any) => {
    if (!confirm(`Are you sure you want to ${action} ${selectedUsers.size} users?`)) {
      return;
    }

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
        // Refresh users list or update state accordingly
        window.location.reload(); // Simple refresh for now
      } else {
        const error = await response.json();
        console.error('Bulk action failed:', error.error);
      }
    } catch (error) {
      console.error('Error performing bulk action:', error);
    } finally {
      setLoading(false);
    }
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

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {showBulkActions && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-slate-50 border border-slate-200 rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">
                {selectedUsers.size} users selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => performBulkAction('changeRole', { role: 'admin' })}
                  className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors"
                  disabled={loading}
                >
                  Make Admin
                </button>
                <button
                  onClick={() => performBulkAction('changeRole', { role: 'user' })}
                  className="px-3 py-1 text-xs bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors"
                  disabled={loading}
                >
                  Make User
                </button>
                <button
                  onClick={() => performBulkAction('changeStatus', { status: 'disabled' })}
                  className="px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 transition-colors"
                  disabled={loading}
                >
                  Disable
                </button>
                <button
                  onClick={() => performBulkAction('changeStatus', { status: 'active' })}
                  className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                  disabled={loading}
                >
                  Enable
                </button>
                <button
                  onClick={() => performBulkAction('delete')}
                  className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                  disabled={loading}
                >
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
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

                      <div className="relative group">
                        <button className="p-1 text-slate-400 hover:text-slate-600 rounded">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        <div className="absolute right-0 top-8 w-48 bg-white border border-slate-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                          <div className="py-1">
                            {user.role === 'admin' ? (
                              <button
                                onClick={() => changeUserRole(user.id, 'user')}
                                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                disabled={loading}
                              >
                                <ShieldOff className="w-4 h-4" />
                                Remove Admin
                              </button>
                            ) : (
                              <button
                                onClick={() => changeUserRole(user.id, 'admin')}
                                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                disabled={loading}
                              >
                                <Shield className="w-4 h-4" />
                                Make Admin
                              </button>
                            )}

                            {user.status === 'active' ? (
                              <button
                                onClick={() => changeUserStatus(user.id, 'disabled')}
                                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                disabled={loading}
                              >
                                <UserX className="w-4 h-4" />
                                Disable Account
                              </button>
                            ) : (
                              <button
                                onClick={() => changeUserStatus(user.id, 'active')}
                                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                disabled={loading}
                              >
                                <UserCheck className="w-4 h-4" />
                                Enable Account
                              </button>
                            )}

                            <button
                              onClick={() => resetUserPassword(user.id)}
                              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              disabled={loading}
                            >
                              <Mail className="w-4 h-4" />
                              Reset Password
                            </button>

                            <button
                              onClick={() => fetchLoginHistory(user.id)}
                              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Activity className="w-4 h-4" />
                              Login History
                            </button>

                            <hr className="my-1" />

                            <button
                              onClick={() => deleteUser(user.id)}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              disabled={loading}
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete User
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