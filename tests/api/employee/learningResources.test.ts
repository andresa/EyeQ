import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockContainer, mockRequest } from '../../helpers/api-helpers'

const { container: mockContainer } = createMockContainer()

vi.mock('../../../api/shared/cosmos', () => ({
  getContainer: vi.fn().mockImplementation(() => Promise.resolve(mockContainer)),
}))

vi.mock('../../../api/shared/auth', () => ({
  getAuthenticatedUser: vi.fn(),
  requireEmployee: vi.fn(),
}))

vi.mock('../../../api/shared/learningResources', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../api/shared/learningResources')>()
  return {
    ...actual,
    getLearningResourcesSettings: vi.fn(),
  }
})

import {
  listEmployeeArticleTopicsHandler,
  listEmployeeArticlesHandler,
  getEmployeeArticleHandler,
  listEmployeeFlashCardsHandler,
  getEmployeeLearningResourcesSettingsHandler,
} from '../../../api/employee/learningResources'
import { getAuthenticatedUser, requireEmployee } from '../../../api/shared/auth'
import { getLearningResourcesSettings } from '../../../api/shared/learningResources'

const employeeUser = {
  id: 'emp_1',
  email: 'e@t.com',
  firstName: 'E',
  lastName: 'U',
  role: 'employee' as const,
  companyId: 'c1',
  userType: 'employee' as const,
}

function setup(
  overrides: { settings?: { articlesEnabled: boolean; flashCardsEnabled: boolean } } = {},
) {
  vi.mocked(getAuthenticatedUser).mockResolvedValue(employeeUser)
  vi.mocked(requireEmployee).mockReturnValue(null)

  vi.mocked(getLearningResourcesSettings).mockResolvedValue(
    overrides.settings ?? { articlesEnabled: true, flashCardsEnabled: true },
  )

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

describe('employee/learningResources', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('listEmployeeArticlesHandler', () => {
    it('returns 200 with articles', async () => {
      setup()
      const articles = [{ id: 'art_1', title: 'Article A' }]
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: articles }),
      })

      const request = mockRequest({ query: { companyId: 'c1' } })
      const response = await listEmployeeArticlesHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toEqual(articles)
    })

    it('returns 400 when companyId missing', async () => {
      setup()
      const request = mockRequest({})
      const response = await listEmployeeArticlesHandler(request)

      expect(response.status).toBe(400)
    })

    it('returns 403 when articles disabled', async () => {
      setup({ settings: { articlesEnabled: false, flashCardsEnabled: true } })
      const request = mockRequest({ query: { companyId: 'c1' } })
      const response = await listEmployeeArticlesHandler(request)

      expect(response.status).toBe(403)
    })
  })

  describe('listEmployeeArticleTopicsHandler', () => {
    it('returns 200 with topics', async () => {
      setup()
      const topics = [{ id: 'at_1', name: 'Safety' }]
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: topics }),
      })

      const request = mockRequest({ query: { companyId: 'c1' } })
      const response = await listEmployeeArticleTopicsHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toEqual(topics)
    })

    it('returns 400 when companyId missing', async () => {
      setup()
      const request = mockRequest({})
      const response = await listEmployeeArticleTopicsHandler(request)

      expect(response.status).toBe(400)
    })

    it('returns 403 when articles disabled', async () => {
      setup({ settings: { articlesEnabled: false, flashCardsEnabled: true } })
      const request = mockRequest({ query: { companyId: 'c1' } })
      const response = await listEmployeeArticleTopicsHandler(request)

      expect(response.status).toBe(403)
    })
  })

  describe('getEmployeeArticleHandler', () => {
    it('returns 200 when article found', async () => {
      setup()
      const article = { id: 'art_1', companyId: 'c1', title: 'Found' }
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [article] }),
      })

      const request = mockRequest({ params: { articleId: 'art_1' } })
      const response = await getEmployeeArticleHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toEqual(article)
    })

    it('returns 404 when article not found', async () => {
      setup()
      const request = mockRequest({ params: { articleId: 'nope' } })
      const response = await getEmployeeArticleHandler(request)

      expect(response.status).toBe(404)
    })

    it('returns 403 when article belongs to different company', async () => {
      setup()
      const article = { id: 'art_1', companyId: 'other', title: 'Foreign' }
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [article] }),
      })

      const request = mockRequest({ params: { articleId: 'art_1' } })
      const response = await getEmployeeArticleHandler(request)

      expect(response.status).toBe(403)
    })
  })

  describe('listEmployeeFlashCardsHandler', () => {
    it('returns 200 with flash cards', async () => {
      setup()
      const cards = [{ id: 'fc_1', title: 'Card A' }]
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: cards }),
      })

      const request = mockRequest({ query: { companyId: 'c1' } })
      const response = await listEmployeeFlashCardsHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toEqual(cards)
    })

    it('returns 400 when companyId missing', async () => {
      setup()
      const request = mockRequest({})
      const response = await listEmployeeFlashCardsHandler(request)

      expect(response.status).toBe(400)
    })

    it('returns 403 when flash cards disabled', async () => {
      setup({ settings: { articlesEnabled: true, flashCardsEnabled: false } })
      const request = mockRequest({ query: { companyId: 'c1' } })
      const response = await listEmployeeFlashCardsHandler(request)

      expect(response.status).toBe(403)
    })
  })

  describe('getEmployeeLearningResourcesSettingsHandler', () => {
    it('returns 200 with settings', async () => {
      setup()
      const request = mockRequest({ query: { companyId: 'c1' } })
      const response = await getEmployeeLearningResourcesSettingsHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toEqual({
        articlesEnabled: true,
        flashCardsEnabled: true,
      })
    })

    it('returns 400 when companyId missing', async () => {
      setup()
      const request = mockRequest({})
      const response = await getEmployeeLearningResourcesSettingsHandler(request)

      expect(response.status).toBe(400)
    })
  })
})
