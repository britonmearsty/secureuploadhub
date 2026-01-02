export const defaultSystemSettings = [
  // General Settings
  {
    key: 'site_name',
    value: 'SecureUploadHub',
    type: 'string' as const,
    description: 'The name of the platform displayed to users',
    category: 'general',
    isPublic: true,
  },
  {
    key: 'site_description',
    value: 'Secure file upload and sharing platform',
    type: 'string' as const,
    description: 'Platform description for SEO and branding',
    category: 'general',
    isPublic: true,
  },
  {
    key: 'maintenance_mode',
    value: 'false',
    type: 'boolean' as const,
    description: 'Enable maintenance mode to prevent user access',
    category: 'general',
    isPublic: false,
  },
  
  // Security Settings
  {
    key: 'max_login_attempts',
    value: '5',
    type: 'number' as const,
    description: 'Maximum login attempts before account lockout',
    category: 'security',
    isPublic: false,
  },
  {
    key: 'session_timeout',
    value: '86400',
    type: 'number' as const,
    description: 'Session timeout in seconds (24 hours)',
    category: 'security',
    isPublic: false,
  },
  {
    key: 'require_email_verification',
    value: 'true',
    type: 'boolean' as const,
    description: 'Require email verification for new accounts',
    category: 'security',
    isPublic: false,
  },
  
  // Upload Settings
  {
    key: 'max_file_size',
    value: '104857600',
    type: 'number' as const,
    description: 'Maximum file size in bytes (100MB)',
    category: 'storage',
    isPublic: true,
  },
  {
    key: 'allowed_file_types',
    value: JSON.stringify(['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'gif', 'zip', 'rar']),
    type: 'json' as const,
    description: 'Allowed file extensions for uploads',
    category: 'storage',
    isPublic: true,
  },
  {
    key: 'storage_quota_gb',
    value: '10',
    type: 'number' as const,
    description: 'Default storage quota per user in GB',
    category: 'storage',
    isPublic: false,
  },
  
  // Email Settings
  {
    key: 'smtp_host',
    value: '',
    type: 'string' as const,
    description: 'SMTP server hostname',
    category: 'email',
    isPublic: false,
  },
  {
    key: 'smtp_port',
    value: '587',
    type: 'number' as const,
    description: 'SMTP server port',
    category: 'email',
    isPublic: false,
  },
  {
    key: 'from_email',
    value: 'noreply@secureuploadhub.com',
    type: 'string' as const,
    description: 'Default from email address',
    category: 'email',
    isPublic: false,
  },
  
  // Billing Settings
  {
    key: 'stripe_enabled',
    value: 'false',
    type: 'boolean' as const,
    description: 'Enable Stripe payment processing',
    category: 'billing',
    isPublic: false,
  },
  {
    key: 'free_trial_days',
    value: '14',
    type: 'number' as const,
    description: 'Number of free trial days for new users',
    category: 'billing',
    isPublic: true,
  },
  
  // UI Settings
  {
    key: 'primary_color',
    value: '#4F46E5',
    type: 'string' as const,
    description: 'Primary brand color',
    category: 'ui',
    isPublic: true,
  },
  {
    key: 'logo_url',
    value: '',
    type: 'string' as const,
    description: 'URL to the platform logo',
    category: 'ui',
    isPublic: true,
  },
];

export const defaultEmailTemplates = [
  {
    name: 'welcome-email',
    subject: 'Welcome to SecureUploadHub!',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4F46E5;">Welcome to SecureUploadHub!</h1>
        <p>Hi {{userName}},</p>
        <p>Thank you for joining SecureUploadHub. We're excited to help you share files securely and efficiently.</p>
        <p>Here's what you can do next:</p>
        <ul>
          <li>Create your first upload portal</li>
          <li>Customize your branding</li>
          <li>Start sharing files securely</li>
        </ul>
        <p>If you have any questions, don't hesitate to reach out to our support team.</p>
        <p>Best regards,<br>The SecureUploadHub Team</p>
      </div>
    `,
    textContent: `Welcome to SecureUploadHub!

Hi {{userName}},

Thank you for joining SecureUploadHub. We're excited to help you share files securely and efficiently.

Here's what you can do next:
- Create your first upload portal
- Customize your branding
- Start sharing files securely

If you have any questions, don't hesitate to reach out to our support team.

Best regards,
The SecureUploadHub Team`,
    variables: { userName: 'string' },
    category: 'welcome',
    description: 'Welcome email sent to new users after registration',
    isActive: true,
  },
  {
    name: 'password-reset',
    subject: 'Reset Your Password',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4F46E5;">Password Reset Request</h1>
        <p>Hi {{userName}},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{resetUrl}}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
        </div>
        <p>If you didn't request this password reset, you can safely ignore this email.</p>
        <p>This link will expire in 1 hour for security reasons.</p>
        <p>Best regards,<br>The SecureUploadHub Team</p>
      </div>
    `,
    textContent: `Password Reset Request

Hi {{userName}},

We received a request to reset your password. Visit the following link to create a new password:

{{resetUrl}}

If you didn't request this password reset, you can safely ignore this email.

This link will expire in 1 hour for security reasons.

Best regards,
The SecureUploadHub Team`,
    variables: { userName: 'string', resetUrl: 'string' },
    category: 'security',
    description: 'Password reset email with secure reset link',
    isActive: true,
  },
  {
    name: 'file-upload-notification',
    subject: 'New File Upload: {{fileName}}',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4F46E5;">New File Upload</h1>
        <p>Hi {{portalOwner}},</p>
        <p>A new file has been uploaded to your portal "{{portalName}}".</p>
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0;">Upload Details:</h3>
          <p><strong>File:</strong> {{fileName}}</p>
          <p><strong>Size:</strong> {{fileSize}}</p>
          <p><strong>From:</strong> {{clientName}} ({{clientEmail}})</p>
          <p><strong>Uploaded:</strong> {{uploadDate}}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{portalUrl}}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Upload</a>
        </div>
        <p>Best regards,<br>The SecureUploadHub Team</p>
      </div>
    `,
    textContent: `New File Upload

Hi {{portalOwner}},

A new file has been uploaded to your portal "{{portalName}}".

Upload Details:
File: {{fileName}}
Size: {{fileSize}}
From: {{clientName}} ({{clientEmail}})
Uploaded: {{uploadDate}}

View the upload at: {{portalUrl}}

Best regards,
The SecureUploadHub Team`,
    variables: {
      portalOwner: 'string',
      portalName: 'string',
      fileName: 'string',
      fileSize: 'string',
      clientName: 'string',
      clientEmail: 'string',
      uploadDate: 'string',
      portalUrl: 'string'
    },
    category: 'notification',
    description: 'Notification sent when a file is uploaded to a portal',
    isActive: true,
  },
];