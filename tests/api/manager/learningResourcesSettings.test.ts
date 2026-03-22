import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockContainer, mockRequest } from '../../helpers/api-helpers'

const { container: mockContainer } = createMockContainer()

vi.mock('../../../api/shared/cosmos', () => ({
  getContainer: vi.fn().mockImplementation(() => Promise.resolve(mockContainer)),
}))

vi.mock('../../../api/shared/auth', () => ({
  getAuthenticatedUser: vi.fn(),
  requireManager: vi.fn(),
}))

vi.mock('../../../api/shared/learningResources', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../api/shared/learningResources')>()
  return {
    ...actual,
    getLearningResourcesSettings: vi.fn(),
    getLearningResourcesSettingsDoc: vi.fn(),
  }
})

import {
  getLearningResourcesSettingsHandler,
  updateLearningResourcesSettingsHandler,
} from '../../../api/manager/learningResourcesSettings'
import { getAuthenticatedUser, requireManager } from '../../../api/shared/auth'
import {
  getLearningResourcesSettings,
  getLearningResourcesSettingsDoc,
} from '../../../api/shared/learningResources'

const managerUser = {
  id: 'mgr_1',
  email: 'm@t.com',
  firstName: 'M',
  lastName: 'G',
  role: 'manager' as const,
  companyId: 'c1',
  userType: 'manager' as const,
}

function setup(overrides: { isManager?: boolean } = {}) {
  const { isManager = true } = overrides

  vi.mocked(getAuthenticatedUser).mockResolvedValue(isManager ? managerUser : null)
  vi.mocked(requireManager).mockReturnValue(
    isManager
      ? null
      : { status: 401, jsonBody: { success: false, error: 'Authentication required.' } },
  )

  vi.mocked(getLearningResourcesSettings).mockResolvedValue({
    articlesEnabled: false,
    flashCardsEnabled: false,
  })
  vi.mocked(getLearningResourcesSettingsDoc).mockResolvedValue(undefined)

  mockContainer.items.query.mockReturnValue({
    fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
  })
  mockContainer.items.create.mockResolvedValue({ resource: {} })
  mockContainer.item.mockReturnValue({
    read: vi.fn().mockResolvedValue({ resource: null }),
    replace: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  })
}

describe('manager/learningResourcesSettings', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('getLearningResourcesSettingsHandler', () => {
    it('returns 200 with settings', async () => {
      setup()
      vi.mocked(getLearningResourcesSettings).mockResolvedValue({
        articlesEnabled: true,
        flashCardsEnabled: false,
      })

      const request = mockRequest({ query: { companyId: 'c1' } })
      const response = await getLearningResourcesSettingsHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toEqual({
        articlesEnabled: true,
        flashCardsEnabled: false,
      })
    })

    it('returns 400 when companyId missing', async () => {
      setup()
      const request = mockRequest({})
      const response = await getLearningResourcesSettingsHandler(request)

      expect(response.status).toBe(400)
    })
  })

  describe('updateLearningResourcesSettingsHandler', () => {
    it('returns 200 when creating new settings', async () => {
      setup()
      const request = mockRequest({
        method: 'PUT',
        body: {
          companyId: 'c1',
          articlesEnabled: true,
          flashCardsEnabled: true,
        },
      })
      const response = await updateLearningResourcesSettingsHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toEqual({
        articlesEnabled: true,
        flashCardsEnabled: true,
      })
    })

    it('returns 200 when updating existing settings', async () => {
      setup()
      vi.mocked(getLearningResourcesSettingsDoc).mockResolvedValue({
        id: 'lrs_1',
        companyId: 'c1',
        articlesEnabled: false,
        flashCardsEnabled: false,
        updatedAt: '2025-01-01T00:00:00.000Z',
        updatedBy: 'mgr_1',
      })
      mockContainer.item.mockReturnValue({
        read: vi.fn(),
        replace: vi.fn().mockResolvedValue({}),
        delete: vi.fn(),
      })

      const request = mockRequest({
        method: 'PUT',
        body: {
          companyId: 'c1',
          articlesEnabled: true,
          flashCardsEnabled: false,
        },
      })
      const response = await updateLearningResourcesSettingsHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toEqual({
        articlesEnabled: true,
        flashCardsEnabled: false,
      })
    })

    it('returns 400 when fields missing', async () => {
      setup()
      const request = mockRequest({
        method: 'PUT',
        body: { companyId: 'c1' },
      })
      const response = await updateLearningResourcesSettingsHandler(request)

      expect(response.status).toBe(400)
    })

    it('returns 403 when manager updates different company', async () => {
      setup()
      const request = mockRequest({
        method: 'PUT',
        body: {
          companyId: 'other',
          articlesEnabled: true,
          flashCardsEnabled: true,
        },
      })
      const response = await updateLearningResourcesSettingsHandler(request)

      expect(response.status).toBe(403)
    })
  })
})
