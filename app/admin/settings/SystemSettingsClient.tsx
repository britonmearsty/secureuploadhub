'use client';

import { useState, useEffect } from 'react';
import { Settings, Plus, Edit, Trash2, Save, X } from 'lucide-react';

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

  const categories = ['general', 'security', 'email', 'storage', 'billing', 'ui'];

  useEffect(() => {
    fetchSettings();
  }, [selectedCategory]);

  const fetchSettings = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }

      const response = await fetch(`/api/admin/settings?${params}`);
      if (!response.ok) throw new Error('Failed to fetch settings');
      
      const data = await response.json();
      setSettings(data.settings);
    } catch (error) {
      alert('Failed to fetch system settings');
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSetting = async () => {
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSetting),
      });

      if (!response.ok) throw new Error('Failed to create setting');

      alert('System setting created successfully');
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
      alert('Failed to create system setting');
      console.error('Error creating setting:', error);
    }
  };

  const handleUpdateSetting = async (setting: SystemSetting) => {
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

      if (!response.ok) throw new Error('Failed to update setting');

      alert('System setting updated successfully');
      setEditingSetting(null);
      fetchSettings();
    } catch (error) {
      alert('Failed to update system setting');
      console.error('Error updating setting:', error);
    }
  };

  const handleDeleteSetting = async (settingId: string) => {
    if (!confirm('Are you sure you want to delete this setting?')) return;

    try {
      const response = await fetch(`/api/admin/settings/${settingId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete setting');

      alert('System setting deleted successfully');
      fetchSettings();
    } catch (error) {
      alert('Failed to delete system setting');
      console.error('Error deleting setting:', error);
    }
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-6 w-6" />
            System Settings
          </h1>
          <p className="text-gray-600 mt-1">
            Manage system-wide configuration and settings
          </p>
        </div>
        <button
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Setting
        </button>
      </div>

      {/* Category Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedCategory === 'all'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
          <div className="bg-white rounded-lg border p-8 text-center">
            <p className="text-gray-500">No settings found for this category.</p>
          </div>
        ) : (
          settings.map((setting) => (
            <div key={setting.id} className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold">{setting.key}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(setting.type)}`}>
                    {setting.type}
                  </span>
                  {setting.isPublic && (
                    <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      Public
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingSetting(setting)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteSetting(setting.id)}
                    className="p-2 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {setting.description && (
                <p className="text-gray-600 mb-3">{setting.description}</p>
              )}
              <div className="space-y-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">Value:</label>
                  <div className="mt-1 p-2 bg-gray-50 rounded border">
                    <code className="text-sm">{formatValue(setting.value, setting.type)}</code>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Create System Setting</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Setting Key</label>
                <input
                  type="text"
                  value={newSetting.key}
                  onChange={(e) => setNewSetting({ ...newSetting, key: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., max_upload_size"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                <input
                  type="text"
                  value={newSetting.value}
                  onChange={(e) => setNewSetting({ ...newSetting, value: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Setting value"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={newSetting.type}
                  onChange={(e) => setNewSetting({ ...newSetting, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                  <option value="json">JSON</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={newSetting.category}
                  onChange={(e) => setNewSetting({ ...newSetting, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newSetting.description}
                  onChange={(e) => setNewSetting({ ...newSetting, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                  className="mr-2"
                />
                <label htmlFor="isPublic" className="text-sm font-medium text-gray-700">
                  Public Setting
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsCreateDialogOpen(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSetting}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Edit System Setting</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                {editingSetting.type === 'boolean' ? (
                  <select
                    value={editingSetting.value || 'false'}
                    onChange={(e) => setEditingSetting({ ...editingSetting, value: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                ) : editingSetting.type === 'json' ? (
                  <textarea
                    value={editingSetting.value || ''}
                    onChange={(e) => setEditingSetting({ ...editingSetting, value: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={6}
                  />
                ) : (
                  <input
                    type={editingSetting.type === 'number' ? 'number' : 'text'}
                    value={editingSetting.value || ''}
                    onChange={(e) => setEditingSetting({ ...editingSetting, value: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editingSetting.description || ''}
                  onChange={(e) => setEditingSetting({ ...editingSetting, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={editingSetting.category}
                  onChange={(e) => setEditingSetting({ ...editingSetting, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                  className="mr-2"
                />
                <label htmlFor="edit-isPublic" className="text-sm font-medium text-gray-700">
                  Public Setting
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingSetting(null)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button
                onClick={() => handleUpdateSetting(editingSetting)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2"
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