'use client';

import { useState, useEffect } from 'react';
import { Mail, Plus, Edit, Trash2, Save, X, Eye, Code, Send, Copy, FileText, Palette } from 'lucide-react';
import { ToastContainer, Toast } from '@/components/ui/Toast';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

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
  const [viewMode, setViewMode] = useState<'html' | 'text' | 'preview'>('html');
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

  const categories = ['general', 'welcome', 'notification', 'billing', 'security', 'marketing'];

  // HTML Templates for quick start
  const htmlTemplates = {
    welcome: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to {{company_name}}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #f8f9fa; padding: 30px; border-radius: 10px;">
        <h1 style="color: #2563eb; text-align: center; margin-bottom: 30px;">Welcome to {{company_name}}!</h1>
        <p>Hi {{user_name}},</p>
        <p>Welcome to our platform! We're excited to have you on board.</p>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Getting Started:</h3>
            <ul>
                <li>Complete your profile setup</li>
                <li>Explore our features</li>
                <li>Contact support if you need help</li>
            </ul>
        </div>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{dashboard_url}}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Get Started</a>
        </div>
        <p style="color: #666; font-size: 14px; text-align: center;">
            If you have any questions, feel free to contact our support team.
        </p>
    </div>
</body>
</html>`,
    notification: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{notification_title}}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #f8f9fa; padding: 30px; border-radius: 10px;">
        <h2 style="color: #1f2937; margin-bottom: 20px;">{{notification_title}}</h2>
        <p>Hi {{user_name}},</p>
        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
            <p>{{notification_message}}</p>
        </div>
        <p style="margin-top: 20px;">
            Best regards,<br>
            The {{company_name}} Team
        </p>
    </div>
</body>
</html>`,
    billing: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{invoice_title}}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #f8f9fa; padding: 30px; border-radius: 10px;">
        <h2 style="color: #1f2937; margin-bottom: 20px;">{{invoice_title}}</h2>
        <p>Hi {{user_name}},</p>
        <div style="background: white; padding: 20px; border-radius: 8px;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Amount:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">{{amount}}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Due Date:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">{{due_date}}</td>
                </tr>
                <tr>
                    <td style="padding: 10px;"><strong>Invoice #:</strong></td>
                    <td style="padding: 10px;">{{invoice_number}}</td>
                </tr>
            </table>
        </div>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{payment_url}}" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Pay Now</a>
        </div>
    </div>
</body>
</html>`
  };

  useEffect(() => {
    fetchTemplates();
  }, [selectedCategory]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }

      const response = await fetch(`/api/admin/email-templates?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to fetch email templates. Please try again.'
      });
      setTemplates([]); // Set empty array as fallback
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name.trim() || !newTemplate.subject.trim() || !newTemplate.htmlContent.trim()) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Template name, subject, and HTML content are required.'
      });
      return;
    }

    try {
      const response = await fetch('/api/admin/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create template');
      }

      addToast({
        type: 'success',
        title: 'Success',
        message: `Email template "${newTemplate.name}" created successfully.`
      });
      
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
      console.error('Error creating template:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to create email template'
      });
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update template');
      }

      addToast({
        type: 'success',
        title: 'Success',
        message: `Email template "${template.name}" updated successfully.`
      });
      
      setEditingTemplate(null);
      fetchTemplates();
    } catch (error) {
      console.error('Error updating template:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to update email template'
      });
    }
  };

  const handleDeleteTemplate = async (templateId: string, templateName: string) => {
    try {
      const response = await fetch(`/api/admin/email-templates/${templateId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete template');
      }

      addToast({
        type: 'success',
        title: 'Success',
        message: `Email template "${templateName}" deleted successfully.`
      });
      
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to delete email template'
      });
    }
  };

  const confirmDeleteTemplate = (template: EmailTemplate) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Email Template',
      message: `Are you sure you want to delete the template "${template.name}"? This action cannot be undone.`,
      variant: 'danger',
      onConfirm: () => {
        handleDeleteTemplate(template.id, template.name);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const loadTemplate = (templateType: keyof typeof htmlTemplates) => {
    setNewTemplate(prev => ({
      ...prev,
      htmlContent: htmlTemplates[templateType],
      category: templateType === 'welcome' ? 'welcome' : templateType === 'notification' ? 'notification' : 'billing'
    }));
  };

  const duplicateTemplate = (template: EmailTemplate) => {
    setNewTemplate({
      name: `${template.name} (Copy)`,
      subject: template.subject,
      htmlContent: template.htmlContent,
      textContent: template.textContent || '',
      variables: template.variables || {},
      category: template.category,
      description: template.description || '',
      isActive: false, // Set as inactive by default for copies
    });
    setIsCreateDialogOpen(true);
  };

  const handleTestTemplate = async (template: EmailTemplate | null) => {
    if (!template) return;

    const testEmail = prompt('Enter email address to send test email to:');
    if (!testEmail || !testEmail.includes('@')) {
      addToast({
        type: 'error',
        title: 'Invalid Email',
        message: 'Please enter a valid email address'
      });
      return;
    }

    try {
      const response = await fetch(`/api/admin/email-templates/${template.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail })
      });

      const data = await response.json();

      if (response.ok) {
        addToast({
          type: 'success',
          title: 'Test Email Sent',
          message: `Test email sent to ${testEmail}`
        });
      } else {
        addToast({
          type: 'error',
          title: 'Failed to Send Test Email',
          message: data.error || 'Could not send test email'
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to send test email'
      });
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
            <Mail className="h-6 w-6" />
            Email Templates
          </h1>
          <p className="text-slate-600 mt-1">
            Manage email templates and notification content
          </p>
        </div>
        <button
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 flex items-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Template
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
            All Templates
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

      {/* Templates List */}
      <div className="space-y-4">
        {templates.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
            <Mail className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No email templates found</h3>
            <p className="text-slate-500 mb-4">
              {selectedCategory === 'all' 
                ? 'No email templates have been created yet.' 
                : `No templates found in the "${selectedCategory}" category.`}
            </p>
            <button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Create First Template
            </button>
          </div>
        ) : (
          templates.map((template) => (
            <div key={template.id} className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-slate-900">{template.name}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    template.isActive ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'
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
                    className="p-2 text-slate-400 hover:text-slate-600 rounded transition-colors"
                    title="Preview template"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => duplicateTemplate(template)}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded transition-colors"
                    title="Duplicate template"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setEditingTemplate(template)}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded transition-colors"
                    title="Edit template"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => confirmDeleteTemplate(template)}
                    className="p-2 text-slate-400 hover:text-red-600 rounded transition-colors"
                    title="Delete template"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="text-slate-600 mb-2">
                <strong>Subject:</strong> {template.subject}
              </p>
              {template.description && (
                <p className="text-slate-600 mb-3">{template.description}</p>
              )}
              <div className="text-xs text-slate-500">
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
          <div className="bg-white rounded-xl p-6 w-full max-w-6xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Create Email Template</h2>
              <button
                onClick={() => setIsCreateDialogOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Start Templates */}
            <div className="mb-6 p-4 bg-slate-50 rounded-lg">
              <h3 className="text-sm font-medium text-slate-900 mb-3 flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Quick Start Templates
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => loadTemplate('welcome')}
                  className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
                >
                  Welcome Email
                </button>
                <button
                  onClick={() => loadTemplate('notification')}
                  className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors"
                >
                  Notification
                </button>
                <button
                  onClick={() => loadTemplate('billing')}
                  className="px-3 py-1 text-xs bg-purple-100 text-purple-800 rounded hover:bg-purple-200 transition-colors"
                >
                  Billing Invoice
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Template Name *</label>
                  <input
                    type="text"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    placeholder="e.g., welcome-email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email Subject *</label>
                  <input
                    type="text"
                    value={newTemplate.subject}
                    onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    placeholder="Email subject line"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                  <select
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
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
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
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
                    className="mr-2 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-slate-700">
                    Active Template
                  </label>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">HTML Content *</label>
                  <textarea
                    value={newTemplate.htmlContent}
                    onChange={(e) => setNewTemplate({ ...newTemplate, htmlContent: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent font-mono text-sm"
                    rows={12}
                    placeholder="HTML email content with variables like {{user_name}}"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Text Content (Optional)</label>
                  <textarea
                    value={newTemplate.textContent}
                    onChange={(e) => setNewTemplate({ ...newTemplate, textContent: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    rows={6}
                    placeholder="Plain text version for email clients that don't support HTML"
                  />
                </div>
              </div>
            </div>

            {/* Variable Helper */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Available Variables:</h4>
              <div className="text-xs text-blue-800 space-x-2">
                <code>{'{{user_name}}'}</code>
                <code>{'{{company_name}}'}</code>
                <code>{'{{dashboard_url}}'}</code>
                <code>{'{{support_email}}'}</code>
                <code>{'{{current_date}}'}</code>
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
                onClick={handleCreateTemplate}
                className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium transition-colors"
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
          <div className="bg-white rounded-xl p-6 w-full max-w-5xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Preview: {previewTemplate.name}</h2>
                <p className="text-slate-600">Subject: {previewTemplate.subject}</p>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('preview')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'preview' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Eye className="h-4 w-4 inline mr-1" />
                  Preview
                </button>
                <button
                  onClick={() => setViewMode('html')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'html' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Code className="h-4 w-4 inline mr-1" />
                  HTML
                </button>
                <button
                  onClick={() => setViewMode('text')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'text' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <FileText className="h-4 w-4 inline mr-1" />
                  Text
                </button>
              </div>
              
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                {viewMode === 'preview' ? (
                  <div className="bg-white">
                    <div className="bg-slate-100 px-4 py-2 border-b border-slate-200">
                      <div className="text-sm text-slate-600">
                        <strong>From:</strong> noreply@yourcompany.com
                      </div>
                      <div className="text-sm text-slate-600">
                        <strong>Subject:</strong> {previewTemplate.subject}
                      </div>
                    </div>
                    <div className="p-4 max-h-96 overflow-y-auto">
                      <div dangerouslySetInnerHTML={{ __html: previewTemplate.htmlContent }} />
                    </div>
                  </div>
                ) : viewMode === 'html' ? (
                  <div className="p-4 bg-slate-50 max-h-96 overflow-y-auto">
                    <pre className="text-sm text-slate-800 whitespace-pre-wrap font-mono">
                      {previewTemplate.htmlContent}
                    </pre>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm text-slate-800">
                      {previewTemplate.textContent || 'No text content available'}
                    </pre>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-slate-500">
                Category: {previewTemplate.category} • 
                Status: {previewTemplate.isActive ? 'Active' : 'Inactive'}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => duplicateTemplate(previewTemplate)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition-colors flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Duplicate
                </button>
                <button
                  onClick={() => {
                    setEditingTemplate(previewTemplate);
                    setPreviewTemplate(null);
                  }}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium transition-colors flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Template Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 w-full max-w-6xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Edit Email Template</h2>
              <button
                onClick={() => setEditingTemplate(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Template Name *</label>
                  <input
                    type="text"
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email Subject *</label>
                  <input
                    type="text"
                    value={editingTemplate.subject}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                  <select
                    value={editingTemplate.category}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, category: e.target.value })}
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
                    value={editingTemplate.description || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    rows={3}
                    placeholder="Describe when this template is used"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="edit-isActive"
                    checked={editingTemplate.isActive}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, isActive: e.target.checked })}
                    className="mr-2 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <label htmlFor="edit-isActive" className="text-sm font-medium text-slate-700">
                    Active Template
                  </label>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">HTML Content *</label>
                  <textarea
                    value={editingTemplate.htmlContent}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, htmlContent: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent font-mono text-sm"
                    rows={12}
                    placeholder="HTML email content with variables like {{user_name}}"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Text Content (Optional)</label>
                  <textarea
                    value={editingTemplate.textContent || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, textContent: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    rows={6}
                    placeholder="Plain text version for email clients that don't support HTML"
                  />
                </div>
              </div>
            </div>

            {/* Variable Helper */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Available Variables:</h4>
              <p className="text-xs text-blue-700 mb-2">Click to insert into HTML content</p>
              <div className="flex flex-wrap gap-2">
                {['user_name', 'company_name', 'dashboard_url', 'support_email', 'current_date', 'user_email', 'portal_name', 'file_name'].map((varName) => (
                  <button
                    key={varName}
                    type="button"
                    onClick={() => {
                      // Find the editing template's HTML textarea
                      const textareas = document.querySelectorAll('textarea[placeholder*="HTML email"]');
                      const textarea = Array.from(textareas).find((ta: any) => {
                        const taElement = ta as HTMLTextAreaElement;
                        return taElement.value === editingTemplate?.htmlContent;
                      }) as HTMLTextAreaElement;
                      
                      if (textarea && editingTemplate) {
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const variable = `{{${varName}}}`;
                        const newValue = editingTemplate.htmlContent.substring(0, start) + variable + editingTemplate.htmlContent.substring(end);
                        setEditingTemplate({ ...editingTemplate, htmlContent: newValue });
                        setTimeout(() => {
                          textarea.focus();
                          textarea.setSelectionRange(start + variable.length, start + variable.length);
                        }, 0);
                      }
                    }}
                    className="px-2 py-1 bg-white border border-blue-200 rounded text-xs text-blue-800 hover:bg-blue-100 transition-colors"
                  >
                    {`{{${varName}}}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => handleTestTemplate(editingTemplate)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                Send Test Email
              </button>
              <button
                onClick={() => setEditingTemplate(null)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateTemplate(editingTemplate)}
                className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium transition-colors flex items-center gap-2"
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