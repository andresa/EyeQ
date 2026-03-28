import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions'
import { jsonResponse, parseJsonBody } from './http.js'
import { sendEnquiryEmail } from './email.js'

interface EnquiryBody {
  name: string
  email: string
  message: string
  _hp?: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const recentSubmissions = new Map<string, number>()
const RATE_LIMIT_WINDOW_MS = 60_000
const MAX_REQUESTS_PER_WINDOW = 3

function isRateLimited(ip: string): boolean {
  const now = Date.now()

  for (const [key, timestamp] of recentSubmissions) {
    if (now - timestamp > RATE_LIMIT_WINDOW_MS) {
      recentSubmissions.delete(key)
    }
  }

  const key = `${ip}:${now}`
  const recentCount = [...recentSubmissions.entries()].filter(
    ([k, ts]) => k.startsWith(`${ip}:`) && now - ts < RATE_LIMIT_WINDOW_MS,
  ).length

  if (recentCount >= MAX_REQUESTS_PER_WINDOW) {
    return true
  }

  recentSubmissions.set(key, now)
  return false
}

export const enquiryHandler = async (request: HttpRequest): Promise<HttpResponseInit> => {
  const body = await parseJsonBody<EnquiryBody>(request)

  if (!body) {
    return jsonResponse(400, { success: false, error: 'Invalid request body.' })
  }

  if (body._hp) {
    return jsonResponse(200, { success: true })
  }

  const { name, email, message } = body

  if (!name?.trim()) {
    return jsonResponse(400, { success: false, error: 'Name is required.' })
  }
  if (!email?.trim() || !EMAIL_REGEX.test(email.trim())) {
    return jsonResponse(400, {
      success: false,
      error: 'A valid email address is required.',
    })
  }
  if (!message?.trim()) {
    return jsonResponse(400, { success: false, error: 'Message is required.' })
  }
  if (message.trim().length > 2000) {
    return jsonResponse(400, {
      success: false,
      error: 'Message must be 2000 characters or fewer.',
    })
  }

  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  if (isRateLimited(clientIp)) {
    return jsonResponse(429, {
      success: false,
      error: 'Too many requests. Please try again later.',
    })
  }

  const recipientEmail = process.env.ENQUIRY_RECIPIENT_EMAIL
  if (!recipientEmail) {
    console.error('Missing ENQUIRY_RECIPIENT_EMAIL environment variable')
    return jsonResponse(500, {
      success: false,
      error: 'Unable to send enquiry at this time. Please try again later.',
    })
  }

  try {
    await sendEnquiryEmail({
      recipientEmail,
      senderName: name.trim(),
      senderEmail: email.trim(),
      message: message.trim(),
    })

    return jsonResponse(200, { success: true })
  } catch (error) {
    console.error('Failed to send enquiry email:', error)
    return jsonResponse(500, {
      success: false,
      error: 'Failed to send your enquiry. Please try again later.',
    })
  }
}

app.http('enquiry', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'shared/enquiry',
  handler: enquiryHandler,
})
