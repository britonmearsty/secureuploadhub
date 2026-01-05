'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, DollarSign } from 'lucide-react';

interface CreatePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (plan: any) => void;
  onError: (message: string) => void;
  editPlan?: any; // Plan to edit, if provided
}

interface PlanFormData {
  name: string;
  description: string;
  price: number;
  currency: string;
  features: string[];
  isActive: boolean;
  maxStorageGB: number;
  maxUploadsMonth: number;
}

export function CreatePlanModal({ isOpen, onClose, onSuccess, onError, editPlan }: CreatePlanModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<PlanFormData>({
    name: editPlan?.name || '',
    description: editPlan?.description || '',
    price: editPlan?.price || 0,
    currency: editPlan?.currency || 'USD',
    features: editPlan?.features && editPlan.features.length > 0 ? editPlan.features : [''],
    isActive: editPlan?.isActive !== undefined ? editPlan.isActive : true,
    maxStorageGB: editPlan?.maxStorageGB || 1,
    maxUploadsMonth: editPlan?.maxUploadsMonth || 100
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form data when editPlan changes
  useEffect(() => {
    if (editPlan && isOpen) {
      setFormData({
        name: editPlan.name || '',
        description: editPlan.description || '',
        price: editPlan.price || 0,
        currency: editPlan.currency || 'USD',
        features: editPlan.features && editPlan.features.length > 0 ? editPlan.features : [''],
        isActive: editPlan.isActive !== undefined ? editPlan.isActive : true,
        maxStorageGB: editPlan.maxStorageGB || 1,
        maxUploadsMonth: editPlan.maxUploadsMonth || 100
      });
    } else if (!editPlan && isOpen) {
      // Reset to defaults for new plan
      setFormData({
        name: '',
        description: '',
        price: 0,
        currency: 'USD',
        features: [''],
        isActive: true,
        maxStorageGB: 1,
        maxUploadsMonth: 100
      });
    }
  }, [editPlan, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Plan name is required';
    }

    if (formData.price < 0) {
      newErrors.price = 'Price must be 0 or greater';
    }

    if (formData.maxStorageGB < -1 || formData.maxStorageGB === 0) {
      newErrors.maxStorageGB = 'Must be -1 (unlimited) or positive number';
    }

    if (formData.maxUploadsMonth < -1 || formData.maxUploadsMonth === 0) {
      newErrors.maxUploadsMonth = 'Must be -1 (unlimited) or positive number';
    }

    const validFeatures = formData.features.filter(f => f.trim());
    if (validFeatures.length === 0) {
      newErrors.features = 'At least one feature is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      const submitData = {
        ...formData,
        features: formData.features.filter(f => f.trim())
      };

      const url = editPlan 
        ? `/api/admin/billing/plans/${editPlan.id}`
        : '/api/admin/billing/plans';
      const method = editPlan ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${editPlan ? 'update' : 'create'} plan`);
      }

      onSuccess(data.plan);
      handleClose();
    } catch (error) {
      console.error(`Error ${editPlan ? 'updating' : 'creating'} plan:`, error);
      onError(error instanceof Error ? error.message : `Failed to ${editPlan ? 'update' : 'create'} plan`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        name: '',
        description: '',
        price: 0,
        currency: 'USD',
        features: [''],
        isActive: true,
        maxStorageGB: 1,
        maxUploadsMonth: 100
      });
      setErrors({});
      onClose();
    }
  };

  const addFeature = () => {
    setFormData(prev => ({
      ...prev,
      features: [...prev.features, '']
    }));
  };

  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const updateFeature = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.map((f, i) => i === index ? value : f)
    }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">
                {editPlan ? 'Edit Plan' : 'Create New Plan'}
              </h2>
              <button
                onClick={handleClose}
                className="text-slate-400 hover:text-slate-600 p-1"
                disabled={loading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-slate-900">Basic Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Plan Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent ${
                    errors.name ? 'border-red-300' : 'border-slate-300'
                  }`}
                  placeholder="e.g., Professional Plan"
                  disabled={loading}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="Brief description of the plan..."
                  rows={3}
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Price *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent ${
                        errors.price ? 'border-red-300' : 'border-slate-300'
                      }`}
                      placeholder="0.00"
                      disabled={loading}
                    />
                  </div>
                  {errors.price && (
                    <p className="mt-1 text-sm text-red-600">{errors.price}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    disabled={loading}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-slate-900">Features</h3>
                <button
                  type="button"
                  onClick={addFeature}
                  className="flex items-center gap-2 px-3 py-1 text-sm text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-50"
                  disabled={loading}
                >
                  <Plus className="w-4 h-4" />
                  Add Feature
                </button>
              </div>

              <div className="space-y-2">
                {formData.features.map((feature, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={feature}
                      onChange={(e) => updateFeature(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                      placeholder="Feature description..."
                      disabled={loading}
                    />
                    {formData.features.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeFeature(index)}
                        className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {errors.features && (
                <p className="text-sm text-red-600">{errors.features}</p>
              )}
            </div>

            {/* Limits */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-slate-900">Limits</h3>
              <p className="text-sm text-slate-600">Use -1 for unlimited</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Max Storage (GB) *
                  </label>
                  <input
                    type="number"
                    value={formData.maxStorageGB}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxStorageGB: parseInt(e.target.value) || 0 }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent ${
                      errors.maxStorageGB ? 'border-red-300' : 'border-slate-300'
                    }`}
                    placeholder="-1 for unlimited"
                    disabled={loading}
                  />
                  {errors.maxStorageGB && (
                    <p className="mt-1 text-sm text-red-600">{errors.maxStorageGB}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Max Uploads/Month *
                  </label>
                  <input
                    type="number"
                    value={formData.maxUploadsMonth}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxUploadsMonth: parseInt(e.target.value) || 0 }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent ${
                      errors.maxUploadsMonth ? 'border-red-300' : 'border-slate-300'
                    }`}
                    placeholder="-1 for unlimited"
                    disabled={loading}
                  />
                  {errors.maxUploadsMonth && (
                    <p className="mt-1 text-sm text-red-600">{errors.maxUploadsMonth}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-slate-900">Status</h3>
              
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.isActive ? 'bg-slate-900' : 'bg-slate-200'
                  }`}
                  disabled={loading}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.isActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm text-slate-700">
                  {formData.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium transition-colors disabled:opacity-50"
                disabled={loading}
              >
                {loading ? (editPlan ? 'Updating...' : 'Creating...') : (editPlan ? 'Update Plan' : 'Create Plan')}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}