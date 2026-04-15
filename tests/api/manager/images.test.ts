import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockRequest } from '../../helpers/api-helpers'

vi.mock('../../../api/shared/blob', () => ({
  generateUploadSas: vi.fn().mockReturnValue({
    url: 'https://storage.blob.core.windows.net/question-images/blob?sas=token',
    expiresOn: new Date(),
  }),
  generateReadSas: vi.fn().mockReturnValue({
    url: 'https://storage.blob.core.windows.net/question-images/blob?sas=read',
    expiresOn: new Date(),
  }),
}))

vi.mock('../../../api/shared/auth', () => ({
  getAuthenticatedUser: vi.fn(),
  requireManager: vi.fn(),
  authenticateByToken: vi.fn(),
}))

vi.mock('../../../api/shared/utils', () => ({
  createId: vi.fn().mockReturnValue('img_mock123'),
}))

import { uploadUrlHandler, readImageHandler } from '../../../api/manager/images'
import {
  getAuthenticatedUser,
  requireManager,
  authenticateByToken,
} from '../../../api/shared/auth'
import { generateUploadSas, generateReadSas } from '../../../api/shared/blob'

const managerUser = {
  id: 'mgr_1',
  email: 'm@t.com',
  firstName: 'M',
  lastName: 'G',
  role: 'manager' as const,
  companyId: 'company_abc',
  userType: 'manager' as const,
}

const adminUser = {
  ...managerUser,
  id: 'admin_1',
  role: 'admin' as const,
  companyId: 'company_admin',
}

function setupManager() {
  vi.mocked(getAuthenticatedUser).mockResolvedValue(managerUser)
  vi.mocked(requireManager).mockReturnValue(null)
}

function setupUnauthorized() {
  vi.mocked(getAuthenticatedUser).mockResolvedValue(null)
  vi.mocked(requireManager).mockReturnValue({
    status: 401,
    jsonBody: { success: false, error: 'Authentication required.' },
  })
}

describe('manager/images', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('uploadUrlHandler', () => {
    it('returns imageId with -- separator (not /)', async () => {
      setupManager()
      const request = mockRequest({
        method: 'POST',
        body: { companyId: 'company_abc', contentType: 'image/png' },
      })
      const response = await uploadUrlHandler(request)

      expect(response.status).toBe(200)
      const body = response.jsonBody as { data: { imageId: string; uploadUrl: string } }
      expect(body.data.imageId).toBe('company_abc--img_mock123.png')
      expect(body.data.imageId).not.toContain('/')
      expect(body.data.uploadUrl).toBeDefined()
    })

    it('uses correct extension for each content type', async () => {
      setupManager()

      for (const [contentType, ext] of [
        ['image/png', 'png'],
        ['image/webp', 'webp'],
        ['image/jpeg', 'jpg'],
      ]) {
        vi.clearAllMocks()
        setupManager()
        const request = mockRequest({
          method: 'POST',
          body: { companyId: 'company_abc', contentType },
        })
        const response = await uploadUrlHandler(request)
        const body = response.jsonBody as { data: { imageId: string } }
        expect(body.data.imageId).toMatch(new RegExp(`\\.${ext}$`))
      }
    })

    it('passes blobName with -- separator to generateUploadSas', async () => {
      setupManager()
      const request = mockRequest({
        method: 'POST',
        body: { companyId: 'company_abc', contentType: 'image/jpeg' },
      })
      await uploadUrlHandler(request)

      expect(generateUploadSas).toHaveBeenCalledWith(
        'company_abc--img_mock123.jpg',
        'image/jpeg',
      )
    })

    it('returns 400 for invalid content type', async () => {
      setupManager()
      const request = mockRequest({
        method: 'POST',
        body: { companyId: 'company_abc', contentType: 'image/gif' },
      })
      const response = await uploadUrlHandler(request)

      expect(response.status).toBe(400)
    })

    it('returns 400 when companyId or contentType missing', async () => {
      setupManager()
      const request = mockRequest({
        method: 'POST',
        body: { companyId: 'company_abc' },
      })
      const response = await uploadUrlHandler(request)

      expect(response.status).toBe(400)
    })

    it('returns 403 when manager uploads for different company', async () => {
      setupManager()
      const request = mockRequest({
        method: 'POST',
        body: { companyId: 'company_other', contentType: 'image/png' },
      })
      const response = await uploadUrlHandler(request)

      expect(response.status).toBe(403)
    })

    it('returns 401 when not authenticated', async () => {
      setupUnauthorized()
      const request = mockRequest({
        method: 'POST',
        body: { companyId: 'company_abc', contentType: 'image/png' },
      })
      const response = await uploadUrlHandler(request)

      expect(response.status).toBe(401)
    })
  })

  describe('readImageHandler', () => {
    it('extracts companyId from -- separator and redirects', async () => {
      vi.mocked(authenticateByToken).mockResolvedValue(managerUser)
      const imageId = 'company_abc--img_mock123.jpg'
      const request = mockRequest({
        params: { imageId },
        query: { token: 'valid-token' },
      })
      const response = await readImageHandler(request)

      expect(response.status).toBe(302)
      expect(response.headers).toHaveProperty('Location')
      expect(generateReadSas).toHaveBeenCalledWith(imageId)
    })

    it('decodes URL-encoded imageId before parsing', async () => {
      vi.mocked(authenticateByToken).mockResolvedValue(managerUser)
      const raw = 'company_abc--img_mock123.jpg'
      const encoded = encodeURIComponent(raw)
      const request = mockRequest({
        params: { imageId: encoded },
        query: { token: 'valid-token' },
      })
      const response = await readImageHandler(request)

      expect(response.status).toBe(302)
      expect(generateReadSas).toHaveBeenCalledWith(raw)
    })

    it('returns 403 when manager accesses image from different company', async () => {
      vi.mocked(authenticateByToken).mockResolvedValue(managerUser)
      const request = mockRequest({
        params: { imageId: 'company_other--img_mock123.jpg' },
        query: { token: 'valid-token' },
      })
      const response = await readImageHandler(request)

      expect(response.status).toBe(403)
    })

    it('allows admin to access any company image', async () => {
      vi.mocked(authenticateByToken).mockResolvedValue(adminUser)
      const request = mockRequest({
        params: { imageId: 'company_xyz--img_mock123.jpg' },
        query: { token: 'admin-token' },
      })
      const response = await readImageHandler(request)

      expect(response.status).toBe(302)
    })

    it('returns 401 when not authenticated', async () => {
      vi.mocked(authenticateByToken).mockResolvedValue(null)
      vi.mocked(getAuthenticatedUser).mockResolvedValue(null)
      const request = mockRequest({
        params: { imageId: 'company_abc--img_mock123.jpg' },
      })
      const response = await readImageHandler(request)

      expect(response.status).toBe(401)
    })

    it('returns 400 when imageId is missing', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue(managerUser)
      const request = mockRequest({ params: {} })
      const response = await readImageHandler(request)

      expect(response.status).toBe(400)
    })

    it('returns 403 when imageId has no -- separator', async () => {
      vi.mocked(authenticateByToken).mockResolvedValue(managerUser)
      const request = mockRequest({
        params: { imageId: 'invalid-no-separator.jpg' },
        query: { token: 'valid-token' },
      })
      const response = await readImageHandler(request)

      expect(response.status).toBe(403)
    })

    it('authenticates via session when no query token', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue(managerUser)
      const request = mockRequest({
        params: { imageId: 'company_abc--img_mock123.jpg' },
      })
      const response = await readImageHandler(request)

      expect(response.status).toBe(302)
      expect(getAuthenticatedUser).toHaveBeenCalled()
      expect(authenticateByToken).not.toHaveBeenCalled()
    })
  })
})
