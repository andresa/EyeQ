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
  listArticleTopicsHandler,
  createArticleTopicHandler,
  updateArticleTopicHandler,
  deleteArticleTopicHandler,
} from '../../../api/manager/articleTopics'
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

describe('manager/articleTopics', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('listArticleTopicsHandler', () => {
    it('returns 200 with topics', async () => {
      setup()
      const topics = [{ id: 'at_1', name: 'Safety' }]
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: topics }),
      })

      const request = mockRequest({ query: { companyId: 'c1' } })
      const response = await listArticleTopicsHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toEqual(topics)
    })

    it('returns 400 when companyId missing', async () => {
      setup()
      const request = mockRequest({})
      const response = await listArticleTopicsHandler(request)

      expect(response.status).toBe(400)
    })
  })

  describe('createArticleTopicHandler', () => {
    it('returns 201 with valid payload', async () => {
      setup()
      const request = mockRequest({
        method: 'POST',
        body: { companyId: 'c1', name: 'New Topic' },
      })
      const response = await createArticleTopicHandler(request)

      expect(response.status).toBe(201)
      expect(response.jsonBody?.data).toMatchObject({
        name: 'New Topic',
        companyId: 'c1',
      })
    })

    it('returns 400 when required fields missing', async () => {
      setup()
      const request = mockRequest({ method: 'POST', body: { companyId: 'c1' } })
      const response = await createArticleTopicHandler(request)

      expect(response.status).toBe(400)
    })

    it('returns 403 when manager creates in different company', async () => {
      setup()
      const request = mockRequest({
        method: 'POST',
        body: { companyId: 'other', name: 'Topic' },
      })
      const response = await createArticleTopicHandler(request)

      expect(response.status).toBe(403)
    })
  })

  describe('updateArticleTopicHandler', () => {
    it('returns 200 when topic exists', async () => {
      setup()
      const existing = { id: 'at_1', companyId: 'c1', name: 'Old Name' }
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
        params: { topicId: 'at_1' },
        body: { name: 'Updated Name' },
      })
      const response = await updateArticleTopicHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toMatchObject({ name: 'Updated Name' })
    })

    it('returns 404 when topic not found', async () => {
      setup()
      const request = mockRequest({
        method: 'PUT',
        params: { topicId: 'nope' },
        body: { name: 'X' },
      })
      const response = await updateArticleTopicHandler(request)

      expect(response.status).toBe(404)
    })

    it('returns 400 when name is empty', async () => {
      setup()
      const existing = { id: 'at_1', companyId: 'c1', name: 'Old' }
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [existing] }),
      })

      const request = mockRequest({
        method: 'PUT',
        params: { topicId: 'at_1' },
        body: { name: '   ' },
      })
      const response = await updateArticleTopicHandler(request)

      expect(response.status).toBe(400)
    })
  })

  describe('deleteArticleTopicHandler', () => {
    it('returns 200 on delete', async () => {
      setup()
      const existing = { id: 'at_1', companyId: 'c1', name: 'To Delete' }
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
        params: { topicId: 'at_1' },
      })
      const response = await deleteArticleTopicHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toEqual({ id: 'at_1' })
    })

    it('returns 404 when topic not found', async () => {
      setup()
      const request = mockRequest({
        method: 'DELETE',
        params: { topicId: 'nope' },
      })
      const response = await deleteArticleTopicHandler(request)

      expect(response.status).toBe(404)
    })
  })
})
