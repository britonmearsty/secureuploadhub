import { Metadata } from 'next';
import { EmailTemplatesClient } from './EmailTemplatesClient';
import { AdminErrorBoundary } from '@/components/admin/AdminErrorBoundary';

export const metadata: Metadata = {
  title: 'Email Templates - Admin Dashboard',
  description: 'Manage email templates and notifications',
};

export default function EmailTemplatesPage() {
  return (
    <AdminErrorBoundary>
      <EmailTemplatesClient />
    </AdminErrorBoundary>
  );
}