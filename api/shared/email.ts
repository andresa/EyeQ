import { EmailClient, type EmailMessage } from '@azure/communication-email'

/**
 * Send an email using Azure Communication Services.
 * Returns the message ID on success, throws on failure.
 */
export async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string,
  plainTextContent?: string,
): Promise<string> {
  const connectionString = process.env.ACS_CONNECTION_STRING
  const senderAddress = process.env.ACS_SENDER_ADDRESS

  if (!connectionString) {
    throw new Error('Missing ACS_CONNECTION_STRING environment variable')
  }
  if (!senderAddress) {
    throw new Error('Missing ACS_SENDER_ADDRESS environment variable')
  }

  console.log('ACS Config:', {
    hasConnectionString: !!connectionString,
    senderAddress,
    recipient: to,
  })

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

  console.log('Sending email to:', to)

  try {
    const poller = await client.beginSend(message)
    const result = await poller.pollUntilDone()

    console.log('Email result:', result.status, result.id)

    if (result.status !== 'Succeeded') {
      throw new Error(
        `Email send failed with status: ${result.status}. Error: ${JSON.stringify(result.error)}`,
      )
    }

    return result.id
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

/**
 * Send an invitation email to a user (employee or employer).
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
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to EyeQ!</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 18px; margin-top: 0;">Hi ${userName},</p>
    
    <p>You've been invited to join <strong>${companyName}</strong> on EyeQ.</p>
    
    <p>Click the button below to accept your invitation and set up your account:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${invitationUrl}" 
         style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                color: white; 
                padding: 14px 30px; 
                text-decoration: none; 
                border-radius: 6px; 
                font-weight: 600;
                display: inline-block;">
        Accept Invitation
      </a>
    </div>
    
    <p style="color: #666; font-size: 14px;">
      Or copy and paste this link into your browser:<br>
      <a href="${invitationUrl}" style="color: #667eea; word-break: break-all;">${invitationUrl}</a>
    </p>
    
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 25px 0;">
    
    <p style="color: #999; font-size: 13px; margin-bottom: 0;">
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
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">EyeQ Login</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 18px; margin-top: 0;">Hi ${userName},</p>
    
    <p>Click the button below to log in to your EyeQ account:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${magicLinkUrl}" 
         style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                color: white; 
                padding: 14px 30px; 
                text-decoration: none; 
                border-radius: 6px; 
                font-weight: 600;
                display: inline-block;">
        Log In to EyeQ
      </a>
    </div>
    
    <p style="color: #666; font-size: 14px;">
      Or copy and paste this link into your browser:<br>
      <a href="${magicLinkUrl}" style="color: #667eea; word-break: break-all;">${magicLinkUrl}</a>
    </p>
    
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 25px 0;">
    
    <p style="color: #999; font-size: 13px; margin-bottom: 0;">
      This login link will expire in ${expiresInMinutes} minutes.<br>
      If you didn't request this link, you can safely ignore this email.
    </p>
  </div>
</body>
</html>
`.trim()

  return sendEmail(toEmail, subject, htmlContent)
}
