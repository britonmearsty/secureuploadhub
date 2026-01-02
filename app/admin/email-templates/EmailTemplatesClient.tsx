'use client';

import { useState, useEffect } from 'react';
import { Mail, Plus, Edit, Trash2, Save, X, Eye, Code } from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string | null;
  variables: Record<string, any> | null;
  isActive: boolean;
  category: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

interface NewTemplate {
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: Record<string, any>;
  category: string;
  description: string;
  isActive: boolean;
}

export function EmailTemplatesClient() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'html' | 'text'>('html');
  const [newTemplate, setNewTemplate] = useState<NewTemplate>({
    name: '',
    subject: '',
    htmlContent: '',
    textContent: '',
    variables: {},
    category: 'general',
    description: '',
    isActive: true,
  });

  const categories = ['general', 'welcome', 'notification', 'billing', 'security', 'marketing'];

  useEffect(() => {
    fetchTemplates();
  }, [selectedCategory]);

  const fetchTemplates = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }

      const response = await fetch(`/api/admin/email-templates?${params}`);
      if (!response.ok) throw new Error('Failed to fetch templates');
      
      const data = await response.json();
      setTemplates(data.templates);
    } catch (error) {
      alert('Failed to fetch email templates');
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      const response = await fetch('/api/admin/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate),
      });

      if (!response.ok) throw new Error('Failed to create template');

      alert('Email template created successfully');
      setIsCreateDialogOpen(false);
      setNewTemplate({
        name: '',
        subject: '',
        htmlContent: '',
        textContent: '',
        variables: {},
        category: 'general',
        description: '',
        isActive: true,
      });
      fetchTemplates();
    } catch (error) {
      alert('Failed to create email template');
      console.error('Error creating template:', error);
    }
  };

  const handleUpdateTemplate = async (template: EmailTemplate) => {
    try {
      const response = await fetch(`/api/admin/email-templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: template.name,
          subject: template.subject,
          htmlContent: template.htmlContent,
          textContent: template.textContent,
          variables: template.variables,
          category: template.category,
          description: template.description,
          isActive: template.isActive,
        }),
      });

      if (!response.ok) throw new Error('Failed to update template');

      alert('Email template updated successfully');
      setEditingTemplate(null);
      fetchTemplates();
    } catch (error) {
      alert('Failed to update email template');
      console.error('Error updating template:', error);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await fetch(`/api/admin/email-templates/${templateId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete template');

      alert('Email template deleted successfully');
      fetchTemplates();
    } catch (error) {
      alert('Failed to delete email template');
      console.error('Error deleting template:', error);
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
            <Mail className="h-6 w-6" />
            Email Templates
          </h1>
          <p className="text-gray-600 mt-1">
            Manage email templates and notification content
          </p>
        </div>
        <button
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Template
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
            All Templates
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

      {/* Templates List */}
      <div className="space-y-4">
        {templates.length === 0 ? (
          <div className="bg-white rounded-lg border p-8 text-center">
            <p className="text-gray-500">No email templates found for this category.</p>
          </div>
        ) : (
          templates.map((template) => (
            <div key={template.id} className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold">{template.name}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    template.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {template.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    {template.category}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewTemplate(template)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setEditingTemplate(template)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="p-2 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="text-gray-600 mb-2">
                <strong>Subject:</strong> {template.subject}
              </p>
              {template.description && (
                <p className="text-gray-600 mb-3">{template.description}</p>
              )}
              <div className="text-xs text-gray-500">
                Created: {new Date(template.createdAt).toLocaleString()} • 
                Updated: {new Date(template.updatedAt).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Template Modal */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Create Email Template</h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                  <input
                    type="text"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., welcome-email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Subject</label>
                  <input
                    type="text"
                    value={newTemplate.subject}
                    onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Email subject line"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
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
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                    placeholder="Describe when this template is used"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={newTemplate.isActive}
                    onChange={(e) => setNewTemplate({ ...newTemplate, isActive: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                    Active Template
                  </label>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">HTML Content</label>
                  <textarea
                    value={newTemplate.htmlContent}
                    onChange={(e) => setNewTemplate({ ...newTemplate, htmlContent: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={8}
                    placeholder="HTML email content"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Text Content (Optional)</label>
                  <textarea
                    value={newTemplate.textContent}
                    onChange={(e) => setNewTemplate({ ...newTemplate, textContent: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={6}
                    placeholder="Plain text version"
                  />
                </div>
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
                onClick={handleCreateTemplate}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Create Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Template Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-2">Preview: {previewTemplate.name}</h2>
            <p className="text-gray-600 mb-4">Subject: {previewTemplate.subject}</p>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('html')}
                  className={`px-3 py-1 rounded text-sm ${
                    viewMode === 'html' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  <Code className="h-4 w-4 inline mr-1" />
                  HTML
                </button>
                <button
                  onClick={() => setViewMode('text')}
                  className={`px-3 py-1 rounded text-sm ${
                    viewMode === 'text' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Text
                </button>
              </div>
              <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
                {viewMode === 'html' ? (
                  <div dangerouslySetInnerHTML={{ __html: previewTemplate.htmlContent }} />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm">
                    {previewTemplate.textContent || 'No text content available'}
                  </pre>
                )}
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Template Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Edit Email Template</h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                  <input
                    type="text"
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Subject</label>
                  <input
                    type="text"
                    value={editingTemplate.subject}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={editingTemplate.category}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, category: e.target.value })}
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
                    value={editingTemplate.description || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="edit-isActive"
                    checked={editingTemplate.isActive}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, isActive: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="edit-isActive" className="text-sm font-medium text-gray-700">
                    Active Template
                  </label>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">HTML Content</label>
                  <textarea
                    value={editingTemplate.htmlContent}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, htmlContent: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={8}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Text Content</label>
                  <textarea
                    value={editingTemplate.textContent || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, textContent: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={6}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingTemplate(null)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button
                onClick={() => handleUpdateTemplate(editingTemplate)}
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