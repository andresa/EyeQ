import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockContainer, mockRequest } from '../../helpers/api-helpers'
import { mockQuestionCategory } from '../../helpers/fixtures'

const { container: mockContainer } = createMockContainer()

vi.mock('../../../api/shared/cosmos', () => ({
  getContainer: vi.fn().mockImplementation((name: string) => {
    if (name === 'questionCategories') return Promise.resolve(mockContainer)
    return Promise.resolve(createMockContainer().container)
  }),
}))

vi.mock('../../../api/shared/auth', () => ({
  getAuthenticatedUser: vi.fn(),
  requireManager: vi.fn(),
}))

import {
  listQuestionCategoriesHandler,
  createQuestionCategoryHandler,
  updateQuestionCategoryHandler,
  deleteQuestionCategoryHandler,
} from '../../../api/manager/questionCategories'
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

  return { mockContainer }
}

describe('manager/questionCategories', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('listQuestionCategoriesHandler', () => {
    it('returns 200 with categories for company', async () => {
      setup()
      const categories = [
        mockQuestionCategory({ id: 'qc_1', name: 'Safety', companyId: 'c1' }),
        mockQuestionCategory({ id: 'qc_2', name: 'Compliance', companyId: 'c1' }),
      ]
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: categories }),
      })

      const request = mockRequest({ query: { companyId: 'c1' } })
      const response = await listQuestionCategoriesHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toEqual(categories)
    })

    it('returns 400 when companyId missing', async () => {
      setup()
      const request = mockRequest({})
      const response = await listQuestionCategoriesHandler(request)

      expect(response.status).toBe(400)
      expect(response.jsonBody?.error).toContain('companyId is required')
    })

    it('returns empty array when no categories exist', async () => {
      setup()
      const request = mockRequest({ query: { companyId: 'c1' } })
      const response = await listQuestionCategoriesHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toEqual([])
    })
  })

  describe('createQuestionCategoryHandler', () => {
    it('returns 201 with created category', async () => {
      setup()
      mockContainer.items.create.mockImplementation(
        async (doc: Record<string, unknown>) => ({
          resource: doc,
        }),
      )

      const request = mockRequest({
        method: 'POST',
        body: { companyId: 'c1', name: 'Safety' },
      })
      const response = await createQuestionCategoryHandler(request)

      expect(response.status).toBe(201)
      expect(response.jsonBody?.success).toBe(true)
      expect(response.jsonBody?.data).toMatchObject({
        companyId: 'c1',
        name: 'Safety',
      })
      expect(response.jsonBody?.data?.id).toBeDefined()
      expect(response.jsonBody?.data?.createdAt).toBeDefined()
      expect(mockContainer.items.create).toHaveBeenCalledOnce()
    })

    it('returns 400 when companyId missing', async () => {
      setup()
      const request = mockRequest({
        method: 'POST',
        body: { name: 'Safety' },
      })
      const response = await createQuestionCategoryHandler(request)

      expect(response.status).toBe(400)
      expect(response.jsonBody?.error).toContain('companyId and name are required')
    })

    it('returns 400 when name missing', async () => {
      setup()
      const request = mockRequest({
        method: 'POST',
        body: { companyId: 'c1' },
      })
      const response = await createQuestionCategoryHandler(request)

      expect(response.status).toBe(400)
      expect(response.jsonBody?.error).toContain('companyId and name are required')
    })

    it('returns 400 when name is blank', async () => {
      setup()
      const request = mockRequest({
        method: 'POST',
        body: { companyId: 'c1', name: '   ' },
      })
      const response = await createQuestionCategoryHandler(request)

      expect(response.status).toBe(400)
    })

    it('returns 403 when manager tries to create in different company', async () => {
      setup()
      const request = mockRequest({
        method: 'POST',
        body: { companyId: 'other_company', name: 'Safety' },
      })
      const response = await createQuestionCategoryHandler(request)

      expect(response.status).toBe(403)
      expect(response.jsonBody?.error).toContain('own company')
    })

    it('returns 401 when not authenticated', async () => {
      setup({ isManager: false })
      const request = mockRequest({
        method: 'POST',
        body: { companyId: 'c1', name: 'Safety' },
      })
      const response = await createQuestionCategoryHandler(request)

      expect(response.status).toBe(401)
    })
  })

  describe('updateQuestionCategoryHandler', () => {
    it('returns 200 with updated category', async () => {
      setup()
      const existing = mockQuestionCategory({
        id: 'qc_1',
        companyId: 'c1',
        name: 'Safety',
      })
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [existing] }),
      })
      const replaced: Record<string, unknown> = {}
      mockContainer.item.mockReturnValue({
        read: vi.fn(),
        replace: vi.fn().mockImplementation((doc: Record<string, unknown>) => {
          Object.assign(replaced, doc)
          return Promise.resolve({})
        }),
        delete: vi.fn(),
      })

      const request = mockRequest({
        method: 'PUT',
        params: { categoryId: 'qc_1' },
        body: { name: 'Updated Name' },
      })
      const response = await updateQuestionCategoryHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data?.name).toBe('Updated Name')
      expect(response.jsonBody?.data?.id).toBe('qc_1')
      expect(mockContainer.item).toHaveBeenCalledWith('qc_1', 'c1')
    })

    it('returns 400 when categoryId missing', async () => {
      setup()
      const request = mockRequest({
        method: 'PUT',
        params: {},
        body: { name: 'Updated' },
      })
      const response = await updateQuestionCategoryHandler(request)

      expect(response.status).toBe(400)
      expect(response.jsonBody?.error).toContain('categoryId is required')
    })

    it('returns 404 when category not found', async () => {
      setup()
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
      })

      const request = mockRequest({
        method: 'PUT',
        params: { categoryId: 'qc_missing' },
        body: { name: 'Updated' },
      })
      const response = await updateQuestionCategoryHandler(request)

      expect(response.status).toBe(404)
      expect(response.jsonBody?.error).toContain('not found')
    })

    it('returns 400 when name missing', async () => {
      setup()
      const existing = mockQuestionCategory({ id: 'qc_1', companyId: 'c1' })
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [existing] }),
      })

      const request = mockRequest({
        method: 'PUT',
        params: { categoryId: 'qc_1' },
        body: {},
      })
      const response = await updateQuestionCategoryHandler(request)

      expect(response.status).toBe(400)
      expect(response.jsonBody?.error).toContain('name is required')
    })

    it('returns 403 when manager tries to update category in different company', async () => {
      setup()
      const existing = mockQuestionCategory({
        id: 'qc_1',
        companyId: 'other_company',
        name: 'Safety',
      })
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [existing] }),
      })

      const request = mockRequest({
        method: 'PUT',
        params: { categoryId: 'qc_1' },
        body: { name: 'Updated' },
      })
      const response = await updateQuestionCategoryHandler(request)

      expect(response.status).toBe(403)
      expect(response.jsonBody?.error).toContain('own company')
    })
  })

  describe('deleteQuestionCategoryHandler', () => {
    it('returns 200 on successful delete', async () => {
      setup()
      const existing = mockQuestionCategory({ id: 'qc_1', companyId: 'c1' })
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
        params: { categoryId: 'qc_1' },
      })
      const response = await deleteQuestionCategoryHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data?.id).toBe('qc_1')
      expect(mockContainer.item).toHaveBeenCalledWith('qc_1', 'c1')
      const deleteMock = mockContainer.item().delete
      expect(deleteMock).toHaveBeenCalledOnce()
    })

    it('returns 400 when categoryId missing', async () => {
      setup()
      const request = mockRequest({
        method: 'DELETE',
        params: {},
      })
      const response = await deleteQuestionCategoryHandler(request)

      expect(response.status).toBe(400)
      expect(response.jsonBody?.error).toContain('categoryId is required')
    })

    it('returns 404 when category not found', async () => {
      setup()
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
      })

      const request = mockRequest({
        method: 'DELETE',
        params: { categoryId: 'qc_missing' },
      })
      const response = await deleteQuestionCategoryHandler(request)

      expect(response.status).toBe(404)
      expect(response.jsonBody?.error).toContain('not found')
    })

    it('returns 403 when manager tries to delete category in different company', async () => {
      setup()
      const existing = mockQuestionCategory({ id: 'qc_1', companyId: 'other_company' })
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [existing] }),
      })

      const request = mockRequest({
        method: 'DELETE',
        params: { categoryId: 'qc_1' },
      })
      const response = await deleteQuestionCategoryHandler(request)

      expect(response.status).toBe(403)
      expect(response.jsonBody?.error).toContain('own company')
    })
  })
})
