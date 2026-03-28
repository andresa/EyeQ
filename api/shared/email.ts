import { EmailClient, type EmailMessage } from '@azure/communication-email'

/**
 * Send an email using Azure Communication Services.
 *
 * By default, this function queues the email and returns immediately without
 * waiting for delivery confirmation (fire-and-forget). This is much faster
 * as it doesn't block on email delivery which can take 5-10+ seconds.
 *
 * Set waitForDelivery=true if you need to confirm the email was delivered.
 *
 * @returns The operation ID (queued) or message ID (if waitForDelivery=true)
 */
export async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string,
  plainTextContent?: string,
  waitForDelivery = false,
): Promise<string> {
  const connectionString = process.env.ACS_CONNECTION_STRING
  const senderAddress = process.env.ACS_SENDER_ADDRESS

  if (!connectionString) {
    throw new Error('Missing ACS_CONNECTION_STRING environment variable')
  }
  if (!senderAddress) {
    throw new Error('Missing ACS_SENDER_ADDRESS environment variable')
  }

  const client = new EmailClient(connectionString)

  const message: EmailMessage = {
    senderAddress,
    recipients: {
      to: [{ address: to }],
    },
    content: {
      subject,
      html: htmlContent,
      plainText: plainTextContent || stripHtml(subject, htmlContent),
    },
  }

  console.log('Queuing email to:', to)

  try {
    const poller = await client.beginSend(message)

    if (waitForDelivery) {
      // Wait for full delivery confirmation (slow - 5-10+ seconds)
      const result = await poller.pollUntilDone()
      console.log('Email delivered:', result.status, result.id)

      if (result.status !== 'Succeeded') {
        throw new Error(
          `Email send failed with status: ${result.status}. Error: ${JSON.stringify(result.error)}`,
        )
      }

      return result.id
    }

    // Fire-and-forget: return immediately after queuing (fast - <1 second)
    // The email will be delivered asynchronously by Azure
    console.log('Email queued successfully')
    return 'queued'
  } catch (error) {
    console.error('ACS Email error:', error)
    throw error
  }
}

/**
 * Simple HTML to plain text conversion for email fallback.
 */
function stripHtml(subject: string, html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}

const LOGO_WHITE_URL =
  'https://www.eyeqlearn.com/images/EyeQLogo-white-transparent-150px.png'
const LOGO_BLUE_URL =
  'https://www.eyeqlearn.com/images/EyeQLogo-blue-transparent-150px.png'

const EMAIL_DARK_MODE_STYLES = `
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    :root { color-scheme: light dark; }
    @media (prefers-color-scheme: dark) {
      .eh { background: #f0f4f8 !important; border-bottom: 1px solid #d9e4ef !important; }
      .logo-light { display: none !important; }
      .logo-dark { display: inline-block !important; }
      .eb { background: #1a1a2e !important; color: #e0e0e0 !important; border-color: #2a2a3e !important; }
      .eb p, .eb td { color: #e0e0e0 !important; }
      .eb .muted { color: #aaa !important; }
      .eb a { color: #7eaacc !important; }
      .eb hr { border-color: #2a2a3e !important; }
      .eb .msg-box { background: #252540 !important; color: #e0e0e0 !important; }
      .ecta { background: #1E3A5F !important; color: white !important; }
    }
  </style>`

const emailHeader = `
  <div class="eh" style="background: #1E3A5F; padding: 30px; border-radius: 4px 4px 0 0; text-align: center;">
    <img class="logo-light" src="${LOGO_WHITE_URL}" alt="EyeQ" width="75" height="75" style="display: inline-block;" />
    <img class="logo-dark" src="${LOGO_BLUE_URL}" alt="EyeQ" width="75" height="75" style="display: none;" />
  </div>`

/**
 * Send an enquiry from a landing page visitor to the EyeQ team.
 */
export async function sendEnquiryEmail(params: {
  recipientEmail: string
  senderName: string
  senderEmail: string
  message: string
}): Promise<string> {
  const { recipientEmail, senderName, senderEmail, message } = params

  const subject = `EyeQ Enquiry from ${senderName}`

  const escapedMessage = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${EMAIL_DARK_MODE_STYLES}
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  ${emailHeader}

  <div class="eb" style="background: #ffffff; padding: 30px; border: 1px solid #E5E5E5; border-top: none; border-radius: 0 0 4px 4px;">
    <p style="font-size: 18px; margin-top: 0;">New enquiry from the landing page</p>

    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr>
        <td class="muted" style="padding: 8px 12px; font-weight: 600; color: #666; width: 80px; vertical-align: top;">Name</td>
        <td style="padding: 8px 12px;">${senderName}</td>
      </tr>
      <tr>
        <td class="muted" style="padding: 8px 12px; font-weight: 600; color: #666; vertical-align: top;">Email</td>
        <td style="padding: 8px 12px;"><a href="mailto:${senderEmail}" style="color: #1E3A5F;">${senderEmail}</a></td>
      </tr>
    </table>

    <hr style="border: none; border-top: 1px solid #E5E5E5; margin: 20px 0;">

    <p class="muted" style="font-weight: 600; color: #666; margin-bottom: 8px;">Message</p>
    <div class="msg-box" style="background: #F8F9FA; border-radius: 4px; padding: 16px; color: #333;">
      ${escapedMessage}
    </div>

    <hr style="border: none; border-top: 1px solid #E5E5E5; margin: 25px 0;">

    <p class="muted" style="color: #999; font-size: 13px; margin-bottom: 0;">
      You can reply directly to ${senderName} at <a href="mailto:${senderEmail}" style="color: #1E3A5F;">${senderEmail}</a>.
    </p>
  </div>
</body>
</html>
`.trim()

  return sendEmail(recipientEmail, subject, htmlContent)
}

/**
 * Send an invitation email to a user (employee or manager).
 */
export async function sendInvitationEmail(params: {
  toEmail: string
  userName: string
  companyName: string
  invitationUrl: string
  expiresInDays: number
}): Promise<string> {
  const { toEmail, userName, companyName, invitationUrl, expiresInDays } = params

  const subject = `You've been invited to join ${companyName} on EyeQ`

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${EMAIL_DARK_MODE_STYLES}
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  ${emailHeader}
  
  <div class="eb" style="background: #ffffff; padding: 30px; border: 1px solid #E5E5E5; border-top: none; border-radius: 0 0 4px 4px;">
    <p style="font-size: 18px; margin-top: 0;">Hi ${userName},</p>
    
    <p>You've been invited to join <strong>${companyName}</strong> on EyeQ.</p>
    
    <p>Click the button below to accept your invitation and set up your account:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${invitationUrl}" class="ecta"
         style="background: #1E3A5F; 
                color: white; 
                padding: 14px 30px; 
                text-decoration: none; 
                border-radius: 4px; 
                font-weight: 600;
                display: inline-block;">
        Accept Invitation
      </a>
    </div>
    
    <p class="muted" style="color: #666; font-size: 14px;">
      Or copy and paste this link into your browser:<br>
      <a style="color: #1E3A5F; word-break: break-all;">${invitationUrl}</a>
    </p>
    
    <hr style="border: none; border-top: 1px solid #E5E5E5; margin: 25px 0;">
    
    <p class="muted" style="color: #999; font-size: 13px; margin-bottom: 0;">
      This invitation link will expire in ${expiresInDays} days.<br>
      If you didn't expect this invitation, you can safely ignore this email.
    </p>
  </div>
</body>
</html>
`.trim()

  return sendEmail(toEmail, subject, htmlContent)
}

/**
 * Send a magic link email for passwordless login.
 */
export async function sendMagicLinkEmail(params: {
  toEmail: string
  userName: string
  magicLinkUrl: string
  expiresInMinutes: number
}): Promise<string> {
  const { toEmail, userName, magicLinkUrl, expiresInMinutes } = params

  const subject = 'Your EyeQ Login Link'

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${EMAIL_DARK_MODE_STYLES}
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  ${emailHeader}
  
  <div class="eb" style="background: #ffffff; padding: 30px; border: 1px solid #E5E5E5; border-top: none; border-radius: 0 0 4px 4px;">
    <p style="font-size: 18px; margin-top: 0;">Hi ${userName},</p>
    
    <p>Click the button below to log in to your EyeQ account:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${magicLinkUrl}" class="ecta"
         style="background: #1E3A5F; 
                color: white; 
                padding: 14px 30px; 
                text-decoration: none; 
                border-radius: 4px; 
                font-weight: 600;
                display: inline-block;">
        Log in to EyeQ
      </a>
    </div>
    
    <p class="muted" style="color: #666; font-size: 14px;">
      Or copy and paste this link into your browser:<br>
      <a style="color: #1E3A5F; word-break: break-all;">${magicLinkUrl}</a>
    </p>
    
    <hr style="border: none; border-top: 1px solid #E5E5E5; margin: 25px 0;">
    
    <p class="muted" style="color: #999; font-size: 13px; margin-bottom: 0;">
      This login link will expire in ${expiresInMinutes} minutes.<br>
      If you didn't request this link, you can safely ignore this email.
    </p>
  </div>
</body>
</html>
`.trim()

  return sendEmail(toEmail, subject, htmlContent)
}
