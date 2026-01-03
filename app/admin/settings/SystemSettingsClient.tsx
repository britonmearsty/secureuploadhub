'use client';

import { useState, useEffect } from 'react';
import { Settings, Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

interface SystemSetting {
  id: string;
  key: string;
  value: string | null;
  type: 'string' | 'number' | 'boolean' | 'json';
  description: string | null;
  category: string;
  isPublic: boolean;
  updatedAt: string;
  updatedBy: string | null;
}

interface NewSetting {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  description: string;
  category: string;
  isPublic: boolean;
}

export function SystemSettingsClient() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingSetting, setEditingSetting] = useState<SystemSetting | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newSetting, setNewSetting] = useState<NewSetting>({
    key: '',
    value: '',
    type: 'string',
    description: '',
    category: 'general',
    isPublic: false,
  });

  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);

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

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const validateSettingValue = (value: string, type: string): { valid: boolean; error?: string } => {
    if (!value && value !== 'false' && value !== '0') {
      return { valid: false, error: 'Value is required' };
    }

    switch (type) {
      case 'number':
        const numValue = Number(value);
        if (isNaN(numValue)) {
          return { valid: false, error: 'Value must be a valid number' };
        }
        if (numValue < 0) {
          return { valid: false, error: 'Number must be 0 or greater' };
        }
        break;
      
      case 'boolean':
        if (value !== 'true' && value !== 'false') {
          return { valid: false, error: 'Boolean must be "true" or "false"' };
        }
        break;
      
      case 'json':
        try {
          JSON.parse(value);
        } catch (e) {
          return { valid: false, error: 'Value must be valid JSON' };
        }
        break;
      
      case 'string':
        if (value.trim().length === 0) {
          return { valid: false, error: 'String value cannot be empty' };
        }
        break;
    }

    return { valid: true };
  };

  const validateSettingKey = (key: string): { valid: boolean; error?: string } => {
    if (!key || key.trim().length === 0) {
      return { valid: false, error: 'Setting key is required' };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(key)) {
      return { valid: false, error: 'Key can only contain letters, numbers, and underscores' };
    }
    if (key.length > 100) {
      return { valid: false, error: 'Key must be 100 characters or less' };
    }
    return { valid: true };
  };

  const categories = ['general', 'security', 'email', 'storage', 'billing', 'ui'];

  useEffect(() => {
    fetchSettings();
  }, [selectedCategory]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }

      const response = await fetch(`/api/admin/settings?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setSettings(data.settings || []);
    } catch (error) {
      console.error('Error fetching settings:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to fetch system settings. Please try again.'
      });
      setSettings([]); // Set empty array as fallback
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSetting = async () => {
    // Validate key
    const keyValidation = validateSettingKey(newSetting.key);
    if (!keyValidation.valid) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        message: keyValidation.error || 'Invalid setting key'
      });
      return;
    }

    // Validate value
    const valueValidation = validateSettingValue(newSetting.value, newSetting.type);
    if (!valueValidation.valid) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        message: valueValidation.error || 'Invalid setting value'
      });
      return;
    }

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSetting),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create setting');
      }

      addToast({
        type: 'success',
        title: 'Success',
        message: `Setting "${newSetting.key}" created successfully.`
      });
      
      setIsCreateDialogOpen(false);
      setNewSetting({
        key: '',
        value: '',
        type: 'string',
        description: '',
        category: 'general',
        isPublic: false,
      });
      fetchSettings();
    } catch (error) {
      console.error('Error creating setting:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to create system setting'
      });
    }
  };

  const handleUpdateSetting = async (setting: SystemSetting) => {
    // Validate value
    if (setting.value !== null) {
      const valueValidation = validateSettingValue(setting.value, setting.type);
      if (!valueValidation.valid) {
        addToast({
          type: 'error',
          title: 'Validation Error',
          message: valueValidation.error || 'Invalid setting value'
        });
        return;
      }
    }

    try {
      const response = await fetch(`/api/admin/settings/${setting.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: setting.value,
          description: setting.description,
          category: setting.category,
          isPublic: setting.isPublic,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update setting');
      }

      addToast({
        type: 'success',
        title: 'Success',
        message: `Setting "${setting.key}" updated successfully.`
      });
      
      setEditingSetting(null);
      fetchSettings();
    } catch (error) {
      console.error('Error updating setting:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to update system setting'
      });
    }
  };

  const handleDeleteSetting = async (settingId: string, settingKey: string) => {
    try {
      const response = await fetch(`/api/admin/settings/${settingId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete setting');
      }

      addToast({
        type: 'success',
        title: 'Success',
        message: `Setting "${settingKey}" deleted successfully.`
      });
      
      fetchSettings();
    } catch (error) {
      console.error('Error deleting setting:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to delete system setting'
      });
    }
  };

  const confirmDeleteSetting = (setting: SystemSetting) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete System Setting',
      message: `Are you sure you want to delete the setting "${setting.key}"? This action cannot be undone.`,
      variant: 'danger',
      onConfirm: () => {
        handleDeleteSetting(setting.id, setting.key);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const formatValue = (value: string | null, type: string) => {
    if (value === null) return 'null';
    if (type === 'boolean') return value === 'true' ? 'Yes' : 'No';
    if (type === 'json') {
      try {
        return JSON.stringify(JSON.parse(value), null, 2);
      } catch {
        return value;
      }
    }
    return value;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'string': return 'bg-blue-100 text-blue-800';
      case 'number': return 'bg-green-100 text-green-800';
      case 'boolean': return 'bg-purple-100 text-purple-800';
      case 'json': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="h-6 w-6" />
            System Settings
          </h1>
          <p className="text-slate-600 mt-1">
            Manage system-wide configuration and settings
          </p>
        </div>
        <button
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 flex items-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Setting
        </button>
      </div>

      {/* Category Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedCategory === 'all'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            All Settings
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedCategory === category
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Settings List */}
      <div className="space-y-4">
        {settings.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
            <Settings className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No settings found</h3>
            <p className="text-slate-500 mb-4">
              {selectedCategory === 'all' 
                ? 'No system settings have been configured yet.' 
                : `No settings found in the "${selectedCategory}" category.`}
            </p>
            <button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Create First Setting
            </button>
          </div>
        ) : (
          settings.map((setting) => (
            <div key={setting.id} className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-slate-900">{setting.key}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(setting.type)}`}>
                    {setting.type}
                  </span>
                  {setting.isPublic && (
                    <span className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-800">
                      Public
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingSetting(setting)}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => confirmDeleteSetting(setting)}
                    className="p-2 text-slate-400 hover:text-red-600 rounded transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {setting.description && (
                <p className="text-slate-600 mb-3">{setting.description}</p>
              )}
              <div className="space-y-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">Value:</label>
                  <div className="mt-1 p-2 bg-slate-50 rounded border border-slate-200">
                    <code className="text-sm text-slate-900">{formatValue(setting.value, setting.type)}</code>
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  Category: {setting.category} • Updated: {new Date(setting.updatedAt).toLocaleString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Setting Modal */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Create System Setting</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Setting Key *</label>
                <input
                  type="text"
                  value={newSetting.key}
                  onChange={(e) => setNewSetting({ ...newSetting, key: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="e.g., max_upload_size"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Value *</label>
                {newSetting.type === 'boolean' ? (
                  <select
                    value={newSetting.value}
                    onChange={(e) => setNewSetting({ ...newSetting, value: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    required
                  >
                    <option value="">Select...</option>
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                ) : newSetting.type === 'number' ? (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newSetting.value}
                    onChange={(e) => setNewSetting({ ...newSetting, value: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    placeholder="Enter number"
                    required
                  />
                ) : newSetting.type === 'json' ? (
                  <textarea
                    value={newSetting.value}
                    onChange={(e) => setNewSetting({ ...newSetting, value: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent font-mono text-sm"
                    placeholder='{"key": "value"}'
                    rows={4}
                    required
                  />
                ) : (
                  <input
                    type="text"
                    value={newSetting.value}
                    onChange={(e) => setNewSetting({ ...newSetting, value: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    placeholder="Enter setting value"
                    required
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
                <select
                  value={newSetting.type}
                  onChange={(e) => setNewSetting({ ...newSetting, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                >
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                  <option value="json">JSON</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                <select
                  value={newSetting.category}
                  onChange={(e) => setNewSetting({ ...newSetting, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                <textarea
                  value={newSetting.description}
                  onChange={(e) => setNewSetting({ ...newSetting, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  rows={3}
                  placeholder="Describe what this setting controls"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={newSetting.isPublic}
                  onChange={(e) => setNewSetting({ ...newSetting, isPublic: e.target.checked })}
                  className="mr-2 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <label htmlFor="isPublic" className="text-sm font-medium text-slate-700">
                  Public Setting
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsCreateDialogOpen(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSetting}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium transition-colors"
              >
                Create Setting
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Setting Modal */}
      {editingSetting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Edit System Setting</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Setting Key</label>
                <input
                  type="text"
                  value={editingSetting.key}
                  disabled
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500"
                />
                <p className="text-xs text-slate-500 mt-1">Setting key cannot be changed</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Value</label>
                {editingSetting.type === 'boolean' ? (
                  <select
                    value={editingSetting.value || 'false'}
                    onChange={(e) => setEditingSetting({ ...editingSetting, value: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  >
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                ) : editingSetting.type === 'json' ? (
                  <textarea
                    value={editingSetting.value || ''}
                    onChange={(e) => setEditingSetting({ ...editingSetting, value: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    rows={6}
                    placeholder="Enter valid JSON"
                  />
                ) : (
                  <input
                    type={editingSetting.type === 'number' ? 'number' : 'text'}
                    value={editingSetting.value || ''}
                    onChange={(e) => setEditingSetting({ ...editingSetting, value: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                <textarea
                  value={editingSetting.description || ''}
                  onChange={(e) => setEditingSetting({ ...editingSetting, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                <select
                  value={editingSetting.category}
                  onChange={(e) => setEditingSetting({ ...editingSetting, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="edit-isPublic"
                  checked={editingSetting.isPublic}
                  onChange={(e) => setEditingSetting({ ...editingSetting, isPublic: e.target.checked })}
                  className="mr-2 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <label htmlFor="edit-isPublic" className="text-sm font-medium text-slate-700">
                  Public Setting
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingSetting(null)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button
                onClick={() => handleUpdateSetting(editingSetting)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium flex items-center gap-2 transition-colors"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}