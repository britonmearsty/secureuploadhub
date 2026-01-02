import { Metadata } from 'next';
import { SystemSettingsClient } from './SystemSettingsClient';

export const metadata: Metadata = {
  title: 'System Settings - Admin Dashboard',
  description: 'Manage system-wide settings and configuration',
};

export default function SystemSettingsPage() {
  return <SystemSettingsClient />;
}