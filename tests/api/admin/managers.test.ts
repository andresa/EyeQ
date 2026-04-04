import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockRequest } from '../../helpers/api-helpers'

const mockFetchAll = vi.fn().mockResolvedValue({ resources: [] })
const mockQuery = vi.fn().mockReturnValue({ fetchAll: mockFetchAll })
const mockCreate = vi.fn().mockResolvedValue({})
const mockRead = vi.fn().mockResolvedValue({ resource: null })
const mockReplace = vi.fn().mockResolvedValue({})
const mockDeleteFn = vi.fn().mockResolvedValue({})
const mockItem = vi
  .fn()
  .mockReturnValue({ read: mockRead, replace: mockReplace, delete: mockDeleteFn })

vi.mock('../../../api/shared/cosmos', () => ({
  getContainer: vi.fn().mockResolvedValue({
    items: {
      query: (...args: unknown[]) => mockQuery(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
    item: (...args: unknown[]) => mockItem(...args),
  }),
}))

vi.mock('../../../api/shared/auth', () => ({
  getAuthenticatedUser: vi.fn(),
  requireAdmin: vi.fn(),
}))

import {
  listManagersHandler,
  createManagerHandler,
  updateManagerHandler,
  deleteManagerHandler,
} from '../../../api/admin/managers'
import { getAuthenticatedUser, requireAdmin } from '../../../api/shared/auth'

function setup(overrides: { isAdmin?: boolean } = {}) {
  const { isAdmin = true } = overrides
  vi.mocked(getAuthenticatedUser).mockResolvedValue(
    isAdmin
      ? {
          id: 'admin_1',
          email: 'a@t.com',
          firstName: 'A',
          lastName: 'B',
          role: 'admin',
          companyId: '',
          userType: 'admin',
        }
      : null,
  )
  vi.mocked(requireAdmin).mockReturnValue(
    isAdmin
      ? null
      : { status: 401, jsonBody: { success: false, error: 'Authentication required.' } },
  )

  mockFetchAll.mockResolvedValue({ resources: [] })
  mockCreate.mockResolvedValue({})
  mockRead.mockResolvedValue({ resource: null })
  mockReplace.mockResolvedValue({})
  mockDeleteFn.mockResolvedValue({})
}

describe('admin/managers', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('listManagersHandler', () => {
    it('returns 200 with managers', async () => {
      setup()
      const managers = [{ id: 'm1', firstName: 'Jane' }]
      mockFetchAll.mockResolvedValue({ resources: managers })

      const request = mockRequest({ query: { companyId: 'c1' } })
      const response = await listManagersHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toEqual(managers)
    })

    it('returns 400 when companyId missing', async () => {
      setup()
      const request = mockRequest({})
      const response = await listManagersHandler(request)

      expect(response.status).toBe(400)
    })

    it('excludes soft-deleted managers from query', async () => {
      setup()
      mockFetchAll.mockResolvedValue({ resources: [] })

      const request = mockRequest({ query: { companyId: 'c1' } })
      await listManagersHandler(request)

      const queryArg = mockQuery.mock.calls[0][0]
      expect(queryArg.query).toContain('isDeleted')
    })
  })

  describe('createManagerHandler', () => {
    it('returns 201 with valid payload', async () => {
      setup()
      const request = mockRequest({
        method: 'POST',
        body: {
          companyId: 'c1',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@t.com',
        },
      })

      const response = await createManagerHandler(request)

      expect(response.status).toBe(201)
      expect(response.jsonBody?.data).toMatchObject({
        firstName: 'Jane',
        role: 'manager',
      })
    })

    it('stores middleName when provided', async () => {
      setup()
      const request = mockRequest({
        method: 'POST',
        body: {
          companyId: 'c1',
          firstName: 'Jane',
          middleName: 'Marie',
          lastName: 'Doe',
          email: 'janem@t.com',
        },
      })

      const response = await createManagerHandler(request)

      expect(response.status).toBe(201)
      expect(response.jsonBody?.data).toMatchObject({
        firstName: 'Jane',
        middleName: 'Marie',
        lastName: 'Doe',
      })
    })

    it('returns 400 when required fields missing', async () => {
      setup()
      const request = mockRequest({ method: 'POST', body: { companyId: 'c1' } })
      const response = await createManagerHandler(request)

      expect(response.status).toBe(400)
    })

    it('returns 400 for invalid role', async () => {
      setup()
      const request = mockRequest({
        method: 'POST',
        body: {
          companyId: 'c1',
          firstName: 'J',
          lastName: 'D',
          email: 'j@t.com',
          role: 'admin',
        },
      })
      const response = await createManagerHandler(request)

      expect(response.status).toBe(400)
      expect(response.jsonBody?.error).toContain('role must be either')
    })

    it('returns 401 when not authenticated', async () => {
      setup({ isAdmin: false })
      const request = mockRequest({
        method: 'POST',
        body: { companyId: 'c1', firstName: 'J', lastName: 'D', email: 'j@t.com' },
      })
      const response = await createManagerHandler(request)

      expect(response.status).toBe(401)
    })
  })

  describe('updateManagerHandler', () => {
    it('returns 200 when manager exists', async () => {
      setup()
      const existing = {
        id: 'm1',
        companyId: 'c1',
        firstName: 'Old',
        lastName: 'Name',
        role: 'manager',
        isActive: true,
      }
      mockRead.mockResolvedValue({ resource: existing })

      const request = mockRequest({
        method: 'PUT',
        params: { managerId: 'm1' },
        query: { companyId: 'c1' },
        body: { firstName: 'Updated' },
      })
      const response = await updateManagerHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toMatchObject({ firstName: 'Updated' })
    })

    it('returns 404 when manager not found', async () => {
      setup()
      const request = mockRequest({
        method: 'PUT',
        params: { managerId: 'nope' },
        query: { companyId: 'c1' },
        body: { firstName: 'X' },
      })
      const response = await updateManagerHandler(request)

      expect(response.status).toBe(404)
    })

    it('returns 400 when companyId missing', async () => {
      setup()
      const request = mockRequest({
        method: 'PUT',
        params: { managerId: 'm1' },
        body: { firstName: 'X' },
      })
      const response = await updateManagerHandler(request)

      expect(response.status).toBe(400)
    })

    it('persists middleName on update', async () => {
      setup()
      const existing = {
        id: 'm1',
        companyId: 'c1',
        firstName: 'Old',
        lastName: 'Name',
        middleName: 'M',
        role: 'manager',
        isActive: true,
      }
      mockRead.mockResolvedValue({ resource: existing })

      const request = mockRequest({
        method: 'PUT',
        params: { managerId: 'm1' },
        query: { companyId: 'c1' },
        body: { middleName: 'Updated' },
      })
      const response = await updateManagerHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toMatchObject({ middleName: 'Updated' })
    })
  })

  describe('deleteManagerHandler', () => {
    it('returns 200 and soft-deletes the manager', async () => {
      setup()
      const existing = { id: 'm1', companyId: 'c1', role: 'manager' }
      mockRead.mockResolvedValue({ resource: existing })

      const request = mockRequest({
        method: 'DELETE',
        params: { managerId: 'm1' },
        query: { companyId: 'c1' },
      })
      const response = await deleteManagerHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toEqual({ id: 'm1' })
      expect(mockReplace).toHaveBeenCalledOnce()
      const replaced = mockReplace.mock.calls[0][0]
      expect(replaced.isDeleted).toBe(true)
      expect(replaced.deletedAt).toBeDefined()
      expect(mockDeleteFn).not.toHaveBeenCalled()
    })

    it('returns 404 when manager not found', async () => {
      setup()
      const request = mockRequest({
        method: 'DELETE',
        params: { managerId: 'nope' },
        query: { companyId: 'c1' },
      })
      const response = await deleteManagerHandler(request)

      expect(response.status).toBe(404)
    })

    it('returns 404 when manager is already soft-deleted', async () => {
      setup()
      const existing = {
        id: 'm1',
        companyId: 'c1',
        role: 'manager',
        isDeleted: true,
        deletedAt: '2025-01-01T00:00:00.000Z',
      }
      mockRead.mockResolvedValue({ resource: existing })

      const request = mockRequest({
        method: 'DELETE',
        params: { managerId: 'm1' },
        query: { companyId: 'c1' },
      })
      const response = await deleteManagerHandler(request)

      expect(response.status).toBe(404)
    })
  })

  describe('updateManagerHandler - soft-delete guard', () => {
    it('returns 404 when trying to update a soft-deleted manager', async () => {
      setup()
      const existing = {
        id: 'm1',
        companyId: 'c1',
        role: 'manager',
        isDeleted: true,
        deletedAt: '2025-01-01T00:00:00.000Z',
      }
      mockRead.mockResolvedValue({ resource: existing })

      const request = mockRequest({
        method: 'PUT',
        params: { managerId: 'm1' },
        query: { companyId: 'c1' },
        body: { firstName: 'Updated' },
      })
      const response = await updateManagerHandler(request)

      expect(response.status).toBe(404)
    })
  })
})
