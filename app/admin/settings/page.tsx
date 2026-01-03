import { Metadata } from 'next';
import { SystemSettingsClient } from './SystemSettingsClient';
import { AdminErrorBoundary } from '@/components/admin/AdminErrorBoundary';

export const metadata: Metadata = {
  title: 'System Settings - Admin Dashboard',
  description: 'Manage system-wide settings and configuration',
};

export default function SystemSettingsPage() {
  return (
    <AdminErrorBoundary>
      <SystemSettingsClient />
    </AdminErrorBoundary>
  );
}