export interface MailgunEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendMailgunEmail(options: MailgunEmailOptions): Promise<boolean> {
  const apiKey = process.env.MAILGUN_API_KEY
  const domain = process.env.MAILGUN_DOMAIN

  if (!apiKey || !domain) {
    console.log("Email not sent - MAILGUN_API_KEY or MAILGUN_DOMAIN not configured")
    console.log("Would have sent email to:", options.to)
    console.log("Subject:", options.subject)
    return false
  }

  try {
    const formData = new FormData()
    formData.append("from", process.env.EMAIL_FROM || `SecureUploadHub <noreply@${domain}>`)
    formData.append("to", options.to)
    formData.append("subject", options.subject)
    formData.append("html", options.html)
    if (options.text) {
      formData.append("text", options.text)
    }

    const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      console.error("Failed to send email via Mailgun:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error sending email via Mailgun:", error)
    return false
  }
}

export async function sendNewsletterWelcome(email: string): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px; }
    .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 28px;">🎉 Welcome to Our Newsletter</h1>
    </div>
    <div class="content">
      <p>Thank you for subscribing! We're excited to have you on board.</p>
      <p>You'll receive updates about new features, tips, and important announcements delivered straight to your inbox.</p>
      <p>If you wish to unsubscribe at any time, you can do so with a single click from the bottom of any email we send.</p>
      <div class="footer">
        <p>You're receiving this email because you subscribed to our newsletter.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim()

  const text = `
Welcome to Our Newsletter

Thank you for subscribing! We're excited to have you on board.

You'll receive updates about new features, tips, and important announcements delivered straight to your inbox.

If you wish to unsubscribe at any time, you can do so with a single click from the bottom of any email we send.
  `.trim()

  return sendMailgunEmail({
    to: email,
    subject: "Welcome to SecureUploadHub Newsletter",
    html,
    text,
  })
}
