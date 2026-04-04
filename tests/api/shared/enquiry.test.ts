import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockRequest } from '../../helpers/api-helpers'

vi.mock('../../../api/shared/email', () => ({
  sendEnquiryEmail: vi.fn().mockResolvedValue(undefined),
}))

import { enquiryHandler } from '../../../api/shared/enquiry'
import { sendEnquiryEmail } from '../../../api/shared/email'

describe('shared/enquiry', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 400 for invalid request body', async () => {
    const request = mockRequest({ method: 'POST', body: null })
    const response = await enquiryHandler(request)

    expect(response.status).toBe(400)
  })

  it('silently returns 200 without sending email when honeypot is filled', async () => {
    const request = mockRequest({
      method: 'POST',
      body: {
        name: 'Bot',
        email: 'bot@spam.com',
        message: 'Buy cheap stuff',
        _hp: 'gotcha',
      },
    })
    const response = await enquiryHandler(request)

    expect(response.status).toBe(200)
    expect(response.jsonBody?.success).toBe(true)
    expect(sendEnquiryEmail).not.toHaveBeenCalled()
  })

  it('proceeds with normal validation when honeypot is empty', async () => {
    const request = mockRequest({
      method: 'POST',
      body: {
        name: '',
        email: 'user@example.com',
        message: 'Hello',
        _hp: '',
      },
    })
    const response = await enquiryHandler(request)

    expect(response.status).toBe(400)
    expect(response.jsonBody?.error).toContain('Name is required')
  })

  it('returns 400 when name is missing', async () => {
    const request = mockRequest({
      method: 'POST',
      body: { email: 'user@example.com', message: 'Hello' },
    })
    const response = await enquiryHandler(request)

    expect(response.status).toBe(400)
    expect(response.jsonBody?.error).toContain('Name is required')
  })

  it('returns 400 for invalid email', async () => {
    const request = mockRequest({
      method: 'POST',
      body: { name: 'Test', email: 'not-an-email', message: 'Hello' },
    })
    const response = await enquiryHandler(request)

    expect(response.status).toBe(400)
    expect(response.jsonBody?.error).toContain('valid email')
  })

  it('returns 400 when message is missing', async () => {
    const request = mockRequest({
      method: 'POST',
      body: { name: 'Test', email: 'user@example.com' },
    })
    const response = await enquiryHandler(request)

    expect(response.status).toBe(400)
    expect(response.jsonBody?.error).toContain('Message is required')
  })

  it('returns 400 when message exceeds 2000 characters', async () => {
    const request = mockRequest({
      method: 'POST',
      body: {
        name: 'Test',
        email: 'user@example.com',
        message: 'a'.repeat(2001),
      },
    })
    const response = await enquiryHandler(request)

    expect(response.status).toBe(400)
    expect(response.jsonBody?.error).toContain('2000 characters')
  })

  it('sends email and returns 200 for valid enquiry', async () => {
    process.env.ENQUIRY_RECIPIENT_EMAIL = 'admin@company.com'

    const request = mockRequest({
      method: 'POST',
      body: {
        name: 'Jane Doe',
        email: 'jane@example.com',
        message: 'I would like to learn more.',
      },
      headers: { 'x-forwarded-for': '1.2.3.4' },
    })
    const response = await enquiryHandler(request)

    expect(response.status).toBe(200)
    expect(response.jsonBody?.success).toBe(true)
    expect(sendEnquiryEmail).toHaveBeenCalledWith({
      recipientEmail: 'admin@company.com',
      senderName: 'Jane Doe',
      senderEmail: 'jane@example.com',
      message: 'I would like to learn more.',
    })

    delete process.env.ENQUIRY_RECIPIENT_EMAIL
  })

  it('returns 500 when ENQUIRY_RECIPIENT_EMAIL is not configured', async () => {
    delete process.env.ENQUIRY_RECIPIENT_EMAIL

    const request = mockRequest({
      method: 'POST',
      body: {
        name: 'Jane Doe',
        email: 'jane@example.com',
        message: 'Hello',
      },
      headers: { 'x-forwarded-for': '5.6.7.8' },
    })
    const response = await enquiryHandler(request)

    expect(response.status).toBe(500)
    expect(response.jsonBody?.error).toContain('Unable to send enquiry')
  })

  it('returns 500 when email sending fails', async () => {
    process.env.ENQUIRY_RECIPIENT_EMAIL = 'admin@company.com'
    vi.mocked(sendEnquiryEmail).mockRejectedValueOnce(new Error('SMTP error'))

    const request = mockRequest({
      method: 'POST',
      body: {
        name: 'Jane Doe',
        email: 'jane@example.com',
        message: 'Hello',
      },
      headers: { 'x-forwarded-for': '9.10.11.12' },
    })
    const response = await enquiryHandler(request)

    expect(response.status).toBe(500)
    expect(response.jsonBody?.error).toContain('Failed to send')

    delete process.env.ENQUIRY_RECIPIENT_EMAIL
  })
})
