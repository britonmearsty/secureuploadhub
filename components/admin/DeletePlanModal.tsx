'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Users, ArrowRight } from 'lucide-react';

interface BillingPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  _count: {
    subscriptions: number;
  };
}

interface DeletePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: BillingPlan | null;
  availablePlans: BillingPlan[];
  onDelete: (planId: string, force?: boolean, migrateTo?: string) => Promise<void>;
}

export function DeletePlanModal({ 
  isOpen, 
  onClose, 
  plan, 
  availablePlans, 
  onDelete 
}: DeletePlanModalProps) {
  const [selectedMigrationPlan, setSelectedMigrationPlan] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!plan) return null;

  const hasSubscriptions = plan._count.subscriptions > 0;
  const migrationOptions = availablePlans.filter(p => p.id !== plan.id && p.id !== selectedMigrationPlan);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      if (hasSubscriptions && selectedMigrationPlan) {
        await onDelete(plan.id, true, selectedMigrationPlan);
      } else {
        await onDelete(plan.id);
      }
      onClose();
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const canDelete = !hasSubscriptions || (hasSubscriptions && selectedMigrationPlan);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Delete Plan</h3>
                <button
                  onClick={onClose}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {hasSubscriptions && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-amber-800">Active Subscriptions</h4>
                        <p className="text-sm text-amber-700 mt-1">
                          This plan has {plan._count.subscriptions} active subscription(s). 
                          You must migrate these subscribers to another plan before deletion.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-medium text-slate-900 mb-2">Plan to Delete</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{plan.name}</p>
                      <p className="text-sm text-slate-600">
                        {plan.currency} {plan.price.toFixed(2)}
                      </p>
                    </div>
                    {hasSubscriptions && (
                      <div className="flex items-center text-sm text-slate-600">
                        <Users className="w-4 h-4 mr-1" />
                        {plan._count.subscriptions} subscribers
                      </div>
                    )}
                  </div>
                </div>

                {hasSubscriptions && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-slate-900">Migrate Subscribers To:</h4>
                    <div className="space-y-2">
                      {migrationOptions.map((migrationPlan) => (
                        <label
                          key={migrationPlan.id}
                          className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedMigrationPlan === migrationPlan.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="migrationPlan"
                            value={migrationPlan.id}
                            checked={selectedMigrationPlan === migrationPlan.id}
                            onChange={(e) => setSelectedMigrationPlan(e.target.value)}
                            className="sr-only"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-slate-900">{migrationPlan.name}</p>
                                <p className="text-sm text-slate-600">
                                  {migrationPlan.currency} {migrationPlan.price.toFixed(2)}
                                </p>
                              </div>
                              {selectedMigrationPlan === migrationPlan.id && (
                                <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                  <div className="w-2 h-2 bg-white rounded-full" />
                                </div>
                              )}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>

                    {selectedMigrationPlan && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2 text-sm text-blue-800">
                          <span>{plan._count.subscriptions} subscribers will be migrated</span>
                          <ArrowRight className="w-4 h-4" />
                          <span className="font-medium">
                            {migrationOptions.find(p => p.id === selectedMigrationPlan)?.name}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-red-800">Warning</h4>
                      <p className="text-sm text-red-700 mt-1">
                        This action cannot be undone. The plan will be permanently deleted.
                        {hasSubscriptions && selectedMigrationPlan && (
                          <span className="block mt-1">
                            All subscribers will be automatically migrated to the selected plan.
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={!canDelete || isDeleting}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    canDelete && !isDeleting
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Plan'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}