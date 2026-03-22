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

import {
  listArticlesHandler,
  createArticleHandler,
  getArticleHandler,
  updateArticleHandler,
  deleteArticleHandler,
} from '../../../api/manager/articles'
import { getAuthenticatedUser, requireManager } from '../../../api/shared/auth'

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

describe('manager/articles', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('listArticlesHandler', () => {
    it('returns 200 with articles', async () => {
      setup()
      const articles = [{ id: 'art_1', title: 'Article A' }]
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: articles }),
      })

      const request = mockRequest({ query: { companyId: 'c1' } })
      const response = await listArticlesHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toEqual(articles)
    })

    it('returns 400 when companyId missing', async () => {
      setup()
      const request = mockRequest({})
      const response = await listArticlesHandler(request)

      expect(response.status).toBe(400)
    })

    it('returns paginated articles when limit is provided', async () => {
      setup()
      const fetchNext = vi.fn().mockResolvedValue({
        resources: [{ id: 'art_1', title: 'Safety' }],
        continuationToken: 'cursor_1',
      })
      const fetchAll = vi.fn().mockResolvedValue({ resources: [3] })
      mockContainer.items.query
        .mockReturnValueOnce({ fetchNext })
        .mockReturnValueOnce({ fetchAll })

      const request = mockRequest({
        query: { companyId: 'c1', limit: '10' },
      })
      const response = await listArticlesHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody).toMatchObject({
        success: true,
        data: [{ id: 'art_1', title: 'Safety' }],
        total: 3,
      })
    })
  })

  describe('createArticleHandler', () => {
    it('returns 201 with valid payload', async () => {
      setup()
      const request = mockRequest({
        method: 'POST',
        body: {
          companyId: 'c1',
          title: 'New Article',
          description: 'Article body text',
        },
      })
      const response = await createArticleHandler(request)

      expect(response.status).toBe(201)
      expect(response.jsonBody?.data).toMatchObject({
        title: 'New Article',
        description: 'Article body text',
        companyId: 'c1',
      })
    })

    it('returns 400 when required fields missing', async () => {
      setup()
      const request = mockRequest({ method: 'POST', body: { companyId: 'c1' } })
      const response = await createArticleHandler(request)

      expect(response.status).toBe(400)
    })

    it('returns 403 when manager creates in different company', async () => {
      setup()
      const request = mockRequest({
        method: 'POST',
        body: {
          companyId: 'other',
          title: 'Article',
          description: 'Body',
        },
      })
      const response = await createArticleHandler(request)

      expect(response.status).toBe(403)
    })
  })

  describe('getArticleHandler', () => {
    it('returns 200 when article exists', async () => {
      setup()
      const article = { id: 'art_1', companyId: 'c1', title: 'Found' }
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [article] }),
      })

      const request = mockRequest({ params: { articleId: 'art_1' } })
      const response = await getArticleHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toEqual(article)
    })

    it('returns 404 when article not found', async () => {
      setup()
      const request = mockRequest({ params: { articleId: 'nope' } })
      const response = await getArticleHandler(request)

      expect(response.status).toBe(404)
    })
  })

  describe('updateArticleHandler', () => {
    it('returns 200 when article exists', async () => {
      setup()
      const existing = {
        id: 'art_1',
        companyId: 'c1',
        title: 'Old Title',
        description: 'Old Desc',
        topicIds: [],
      }
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [existing] }),
      })
      mockContainer.item.mockReturnValue({
        read: vi.fn().mockResolvedValue({ resource: existing }),
        replace: vi.fn().mockResolvedValue({}),
        delete: vi.fn(),
      })

      const request = mockRequest({
        method: 'PUT',
        params: { articleId: 'art_1' },
        body: { title: 'Updated Title' },
      })
      const response = await updateArticleHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toMatchObject({ title: 'Updated Title' })
    })

    it('returns 404 when article not found', async () => {
      setup()
      const request = mockRequest({
        method: 'PUT',
        params: { articleId: 'nope' },
        body: { title: 'X' },
      })
      const response = await updateArticleHandler(request)

      expect(response.status).toBe(404)
    })
  })

  describe('deleteArticleHandler', () => {
    it('returns 200 on delete', async () => {
      setup()
      const existing = { id: 'art_1', companyId: 'c1', title: 'To Delete' }
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [existing] }),
      })
      mockContainer.item.mockReturnValue({
        read: vi.fn(),
        replace: vi.fn(),
        delete: vi.fn().mockResolvedValue({}),
      })

      const request = mockRequest({
        method: 'DELETE',
        params: { articleId: 'art_1' },
      })
      const response = await deleteArticleHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toEqual({ id: 'art_1' })
    })

    it('returns 404 when article not found', async () => {
      setup()
      const request = mockRequest({
        method: 'DELETE',
        params: { articleId: 'nope' },
      })
      const response = await deleteArticleHandler(request)

      expect(response.status).toBe(404)
    })
  })
})
