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
  listAllEmployeesHandler,
  createEmployeeHandler,
  updateEmployeeHandler,
} from '../../../api/admin/employees'
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

describe('admin/employees', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('listAllEmployeesHandler', () => {
    it('returns 200 with employees filtered by companyId', async () => {
      setup()
      const employees = [{ id: 'e1', firstName: 'John' }]
      mockFetchAll.mockResolvedValue({ resources: employees })

      const request = mockRequest({ query: { companyId: 'c1' } })
      const response = await listAllEmployeesHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toEqual(employees)
    })

    it('returns 200 with all employees when no companyId', async () => {
      setup()
      const employees = [{ id: 'e1' }, { id: 'e2' }]
      mockFetchAll.mockResolvedValue({ resources: employees })

      const request = mockRequest({})
      const response = await listAllEmployeesHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toEqual(employees)
    })

    it('excludes soft-deleted employees from query', async () => {
      setup()
      mockFetchAll.mockResolvedValue({ resources: [] })

      const request = mockRequest({ query: { companyId: 'c1' } })
      await listAllEmployeesHandler(request)

      const queryArg = mockQuery.mock.calls[0][0]
      expect(queryArg.query).toContain('isDeleted')
    })
  })

  describe('createEmployeeHandler', () => {
    it('returns 201 with valid payload', async () => {
      setup()
      const request = mockRequest({
        method: 'POST',
        body: {
          companyId: 'c1',
          firstName: 'John',
          lastName: 'Smith',
          email: 'john@t.com',
        },
      })
      const response = await createEmployeeHandler(request)

      expect(response.status).toBe(201)
      expect(response.jsonBody?.data).toMatchObject({
        firstName: 'John',
        role: 'employee',
      })
    })

    it('stores middleName when provided', async () => {
      setup()
      const request = mockRequest({
        method: 'POST',
        body: {
          companyId: 'c1',
          firstName: 'John',
          middleName: 'Michael',
          lastName: 'Smith',
          email: 'johnm@t.com',
        },
      })
      const response = await createEmployeeHandler(request)

      expect(response.status).toBe(201)
      expect(response.jsonBody?.data).toMatchObject({
        firstName: 'John',
        middleName: 'Michael',
        lastName: 'Smith',
      })
    })

    it('returns 400 when required fields missing', async () => {
      setup()
      const request = mockRequest({ method: 'POST', body: { companyId: 'c1' } })
      const response = await createEmployeeHandler(request)

      expect(response.status).toBe(400)
    })

    it('returns 409 when email already exists', async () => {
      setup()
      mockFetchAll.mockResolvedValue({
        resources: [{ id: 'existing', email: 'john@t.com' }],
      })

      const request = mockRequest({
        method: 'POST',
        body: { companyId: 'c1', firstName: 'John', lastName: 'S', email: 'john@t.com' },
      })
      const response = await createEmployeeHandler(request)

      expect(response.status).toBe(409)
    })

    it('returns 401 when not admin', async () => {
      setup({ isAdmin: false })
      const request = mockRequest({
        method: 'POST',
        body: { companyId: 'c1', firstName: 'J', lastName: 'S', email: 'j@t.com' },
      })
      const response = await createEmployeeHandler(request)

      expect(response.status).toBe(401)
    })
  })

  describe('updateEmployeeHandler', () => {
    it('returns 200 when employee exists', async () => {
      setup()
      const existing = {
        id: 'e1',
        companyId: 'c1',
        firstName: 'Old',
        lastName: 'N',
        role: 'employee',
        isActive: true,
      }
      mockRead.mockResolvedValue({ resource: existing })

      const request = mockRequest({
        method: 'PUT',
        params: { employeeId: 'e1' },
        query: { companyId: 'c1' },
        body: { firstName: 'Updated' },
      })
      const response = await updateEmployeeHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toMatchObject({ firstName: 'Updated' })
    })

    it('returns 404 when employee not found', async () => {
      setup()
      const request = mockRequest({
        method: 'PUT',
        params: { employeeId: 'nope' },
        query: { companyId: 'c1' },
        body: { firstName: 'X' },
      })
      const response = await updateEmployeeHandler(request)

      expect(response.status).toBe(404)
    })

    it('returns 400 when companyId missing', async () => {
      setup()
      const request = mockRequest({
        method: 'PUT',
        params: { employeeId: 'e1' },
        body: { firstName: 'X' },
      })
      const response = await updateEmployeeHandler(request)

      expect(response.status).toBe(400)
    })

    it('persists middleName on update', async () => {
      setup()
      const existing = {
        id: 'e1',
        companyId: 'c1',
        firstName: 'Old',
        lastName: 'N',
        middleName: 'M',
        role: 'employee',
        isActive: true,
      }
      mockRead.mockResolvedValue({ resource: existing })

      const request = mockRequest({
        method: 'PUT',
        params: { employeeId: 'e1' },
        query: { companyId: 'c1' },
        body: { middleName: 'NewMiddle' },
      })
      const response = await updateEmployeeHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toMatchObject({ middleName: 'NewMiddle' })
    })

    it('returns 404 when trying to update a soft-deleted employee', async () => {
      setup()
      const existing = {
        id: 'e1',
        companyId: 'c1',
        firstName: 'Old',
        lastName: 'N',
        role: 'employee',
        isActive: true,
        isDeleted: true,
        deletedAt: '2025-01-01T00:00:00.000Z',
      }
      mockRead.mockResolvedValue({ resource: existing })

      const request = mockRequest({
        method: 'PUT',
        params: { employeeId: 'e1' },
        query: { companyId: 'c1' },
        body: { firstName: 'Updated' },
      })
      const response = await updateEmployeeHandler(request)

      expect(response.status).toBe(404)
    })
  })
})
