// Email service for sending notifications

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export interface UploadNotificationData {
  portalName: string
  fileName: string
  fileSize: number
  clientName?: string
  clientEmail?: string
  clientMessage?: string
  uploadedAt: Date
  portalUrl: string
  dashboardUrl: string
}

/**
 * Send an email using Resend API
 * Falls back gracefully if RESEND_API_KEY is not set
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  
  if (!apiKey) {
    console.log("Email not sent - RESEND_API_KEY not configured")
    console.log("Would have sent email to:", options.to)
    console.log("Subject:", options.subject)
    return false
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "SecureUploadHub <noreply@secureuploadhub.com>",
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error("Failed to send email:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error sending email:", error)
    return false
  }
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B"
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB"
}

/**
 * Send upload notification email to portal owner
 */
export async function sendUploadNotification(
  ownerEmail: string,
  data: UploadNotificationData
): Promise<boolean> {
  const subject = `New file uploaded to ${data.portalName}`
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .file-info { background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0; }
    .label { color: #6b7280; font-size: 12px; text-transform: uppercase; margin-bottom: 4px; }
    .value { font-size: 16px; font-weight: 500; }
    .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px; }
    .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">📁 New File Upload</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Someone just uploaded a file to your portal</p>
    </div>
    <div class="content">
      <div class="file-info">
        <div style="margin-bottom: 16px;">
          <div class="label">File Name</div>
          <div class="value">${data.fileName}</div>
        </div>
        <div style="margin-bottom: 16px;">
          <div class="label">File Size</div>
          <div class="value">${formatFileSize(data.fileSize)}</div>
        </div>
        <div style="margin-bottom: 16px;">
          <div class="label">Portal</div>
          <div class="value">${data.portalName}</div>
        </div>
        ${data.clientName ? `
        <div style="margin-bottom: 16px;">
          <div class="label">From</div>
          <div class="value">${data.clientName}${data.clientEmail ? ` (${data.clientEmail})` : ""}</div>
        </div>
        ` : ""}
        ${data.clientMessage ? `
        <div style="margin-bottom: 16px;">
          <div class="label">Message</div>
          <div class="value">${data.clientMessage}</div>
        </div>
        ` : ""}
        <div>
          <div class="label">Uploaded At</div>
          <div class="value">${data.uploadedAt.toLocaleString()}</div>
        </div>
      </div>
      
      <a href="${data.dashboardUrl}" class="button">View in Dashboard</a>
      
      <div class="footer">
        <p>This email was sent by SecureUploadHub because you own the portal "${data.portalName}".</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim()

  const text = `
New file uploaded to ${data.portalName}

File: ${data.fileName}
Size: ${formatFileSize(data.fileSize)}
${data.clientName ? `From: ${data.clientName}${data.clientEmail ? ` (${data.clientEmail})` : ""}` : ""}
${data.clientMessage ? `Message: ${data.clientMessage}` : ""}
Uploaded: ${data.uploadedAt.toLocaleString()}

View in dashboard: ${data.dashboardUrl}
  `.trim()

  return sendEmail({
    to: ownerEmail,
    subject,
    html,
    text,
  })
}

