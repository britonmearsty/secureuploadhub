'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Cloud, RefreshCw, Settings } from 'lucide-react';

interface StorageWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'disconnected' | 'inactive' | 'error' | 'not_configured';
  storageProvider?: string;
  storageEmail?: string;
  onReconnect?: () => void;
  onSettings?: () => void;
  loading?: boolean;
}

export function StorageWarningModal({
  isOpen,
  onClose,
  type,
  storageProvider,
  storageEmail,
  onReconnect,
  onSettings,
  loading = false
}: StorageWarningModalProps) {
  if (!isOpen) return null;

  const getContent = () => {
    switch (type) {
      case 'disconnected':
        return {
          title: 'Storage Account Disconnected',
          message: `Your ${storageProvider} account needs to be reconnected to access this file.`,
          details: storageEmail ? `Account: ${storageEmail}` : undefined,
          icon: 'text-red-600',
          backdrop: 'bg-red-50',
          primaryAction: 'Reconnect Storage',
          primaryVariant: 'bg-red-600 hover:bg-red-700 text-white' as const
        };
      
      case 'inactive':
        return {
          title: 'Storage Account Inactive',
          message: `Your ${storageProvider} account is inactive. New uploads are blocked, but existing files remain accessible.`,
          details: storageEmail ? `Account: ${storageEmail}` : undefined,
          icon: 'text-orange-600',
          backdrop: 'bg-orange-50',
          primaryAction: 'Reactivate Storage',
          primaryVariant: 'bg-orange-600 hover:bg-orange-700 text-white' as const
        };
      
      case 'error':
        return {
          title: 'Storage Connection Issues',
          message: `There are temporary connection issues with your ${storageProvider} account. This usually resolves automatically.`,
          details: 'If the issue persists, try reconnecting your storage account.',
          icon: 'text-orange-600',
          backdrop: 'bg-orange-50',
          primaryAction: 'Retry Connection',
          primaryVariant: 'bg-orange-600 hover:bg-orange-700 text-white' as const
        };
      
      case 'not_configured':
        return {
          title: 'Storage Not Configured',
          message: 'This portal needs a storage account to accept files.',
          details: 'Connect a cloud storage account to start receiving uploads.',
          icon: 'text-blue-600',
          backdrop: 'bg-blue-50',
          primaryAction: 'Configure Storage',
          primaryVariant: 'bg-blue-600 hover:bg-blue-700 text-white' as const
        };
      
      default:
        return {
          title: 'Storage Issue',
          message: 'There is an issue with the storage configuration.',
          icon: 'text-gray-600',
          backdrop: 'bg-gray-50',
          primaryAction: 'Go to Settings',
          primaryVariant: 'bg-gray-600 hover:bg-gray-700 text-white' as const
        };
    }
  };

  const content = getContent();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-xl p-6 max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${content.backdrop}`}>
                <AlertTriangle className={`w-5 h-5 ${content.icon}`} />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">{content.title}</h2>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1"
              disabled={loading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-6">
            <p className="text-slate-600 mb-2">{content.message}</p>
            {content.details && (
              <p className="text-sm text-slate-500">{content.details}</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            
            {onReconnect && (type === 'disconnected' || type === 'error') && (
              <button
                onClick={onReconnect}
                disabled={loading}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${content.primaryVariant}`}
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Cloud className="w-4 h-4" />
                )}
                {content.primaryAction}
              </button>
            )}
            
            {onSettings && (type === 'inactive' || type === 'not_configured') && (
              <button
                onClick={onSettings}
                disabled={loading}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${content.primaryVariant}`}
              >
                <Settings className="w-4 h-4" />
                {content.primaryAction}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}