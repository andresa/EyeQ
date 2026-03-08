import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockRequest } from '../../helpers/api-helpers'

const mockFetchAll = vi.fn().mockResolvedValue({ resources: [] })
const mockQuery = vi.fn().mockReturnValue({ fetchAll: mockFetchAll })
const mockCreate = vi.fn().mockResolvedValue({})
const mockRead = vi.fn().mockResolvedValue({ resource: null })
const mockReplace = vi.fn().mockResolvedValue({})
const mockDelete = vi.fn().mockResolvedValue({})
const mockItem = vi
  .fn()
  .mockReturnValue({ read: mockRead, replace: mockReplace, delete: mockDelete })

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
  listCompaniesHandler,
  createCompanyHandler,
  updateCompanyHandler,
  deleteCompanyHandler,
} from '../../../api/admin/companies'
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
  mockDelete.mockResolvedValue({})
}

describe('admin/companies', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('listCompaniesHandler', () => {
    it('returns 200 with list of companies', async () => {
      setup()
      const companies = [{ id: 'c1', name: 'Acme' }]
      mockFetchAll.mockResolvedValue({ resources: companies })

      const response = await listCompaniesHandler()

      expect(response.status).toBe(200)
      expect(response.jsonBody).toEqual({ success: true, data: companies })
    })
  })

  describe('createCompanyHandler', () => {
    it('returns 201 when valid payload', async () => {
      setup()
      const request = mockRequest({
        method: 'POST',
        body: { name: 'New Corp', address: '456 St' },
      })

      const response = await createCompanyHandler(request)

      expect(response.status).toBe(201)
      expect(response.jsonBody?.success).toBe(true)
      expect(response.jsonBody?.data).toMatchObject({
        name: 'New Corp',
        address: '456 St',
        isActive: true,
      })
      expect(mockCreate).toHaveBeenCalledOnce()
    })

    it('returns 400 when name is missing', async () => {
      setup()
      const request = mockRequest({ method: 'POST', body: {} })

      const response = await createCompanyHandler(request)

      expect(response.status).toBe(400)
      expect(response.jsonBody?.error).toBe('Company name is required.')
    })

    it('returns 401 when not authenticated', async () => {
      setup({ isAdmin: false })
      const request = mockRequest({ method: 'POST', body: { name: 'Corp' } })

      const response = await createCompanyHandler(request)

      expect(response.status).toBe(401)
    })
  })

  describe('updateCompanyHandler', () => {
    it('returns 200 when company exists', async () => {
      setup()
      const existing = { id: 'c1', name: 'Old', address: 'Old St', isActive: true }
      mockRead.mockResolvedValue({ resource: existing })

      const request = mockRequest({
        method: 'PUT',
        params: { companyId: 'c1' },
        body: { name: 'Updated' },
      })

      const response = await updateCompanyHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toMatchObject({ name: 'Updated' })
    })

    it('returns 404 when company not found', async () => {
      setup()
      mockRead.mockRejectedValue(new Error('not found'))

      const request = mockRequest({
        method: 'PUT',
        params: { companyId: 'missing' },
        body: { name: 'X' },
      })

      const response = await updateCompanyHandler(request)

      expect(response.status).toBe(404)
    })

    it('returns 400 when companyId missing', async () => {
      setup()
      const request = mockRequest({ method: 'PUT', params: {}, body: { name: 'X' } })

      const response = await updateCompanyHandler(request)

      expect(response.status).toBe(400)
    })
  })

  describe('deleteCompanyHandler', () => {
    it('returns 200 on successful delete', async () => {
      setup()
      const request = mockRequest({ method: 'DELETE', params: { companyId: 'c1' } })

      const response = await deleteCompanyHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toEqual({ id: 'c1' })
    })

    it('returns 404 when delete throws', async () => {
      setup()
      mockDelete.mockRejectedValue(new Error('not found'))

      const request = mockRequest({ method: 'DELETE', params: { companyId: 'nope' } })

      const response = await deleteCompanyHandler(request)

      expect(response.status).toBe(404)
    })

    it('returns 400 when companyId missing', async () => {
      setup()
      const request = mockRequest({ method: 'DELETE', params: {} })

      const response = await deleteCompanyHandler(request)

      expect(response.status).toBe(400)
    })
  })
})
