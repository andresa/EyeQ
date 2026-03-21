import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockContainer, mockRequest } from '../../helpers/api-helpers'

const { container: mockContainer } = createMockContainer()
const companiesContainer = createMockContainer().container

vi.mock('../../../api/shared/cosmos', () => ({
  getContainer: vi.fn().mockImplementation((name: string) => {
    if (name === 'companies') return Promise.resolve(companiesContainer)
    return Promise.resolve(mockContainer)
  }),
}))

vi.mock('../../../api/shared/auth', () => ({
  getAuthenticatedUser: vi.fn(),
  requireManager: vi.fn(),
}))

vi.mock('../../../api/shared/invitations', () => ({
  createInvitationRecord: vi.fn().mockResolvedValue({ id: 'inv_1', token: 'tok' }),
}))

import {
  listEmployeesHandler,
  createEmployeesHandler,
  updateEmployeeHandler,
  deleteEmployeeHandler,
} from '../../../api/manager/employees'
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

  companiesContainer.item.mockReturnValue({
    read: vi.fn().mockResolvedValue({ resource: { id: 'c1', name: 'Acme' } }),
    replace: vi.fn(),
    delete: vi.fn(),
  })

  return { mockContainer }
}

describe('manager/employees', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('listEmployeesHandler', () => {
    it('returns 200 scoped to company', async () => {
      setup()
      const employees = [{ id: 'e1' }]
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: employees }),
      })

      const request = mockRequest({ query: { companyId: 'c1' } })
      const response = await listEmployeesHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toEqual(employees)
    })

    it('returns 400 when companyId missing', async () => {
      setup()
      const request = mockRequest({})
      const response = await listEmployeesHandler(request)

      expect(response.status).toBe(400)
    })

    it('returns paginated data when limit is provided', async () => {
      setup()
      const fetchNext = vi
        .fn()
        .mockResolvedValue({ resources: [{ id: 'e1' }], continuationToken: 'next-page' })
      const fetchAll = vi.fn().mockResolvedValue({ resources: [11] })
      mockContainer.items.query
        .mockReturnValueOnce({ fetchNext })
        .mockReturnValueOnce({ fetchAll })

      const request = mockRequest({
        query: { companyId: 'c1', name: 'alice', limit: '10' },
      })
      const response = await listEmployeesHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody).toMatchObject({
        success: true,
        data: [{ id: 'e1' }],
        total: 11,
        nextCursor: Buffer.from('next-page', 'utf8').toString('base64url'),
      })
    })
  })

  describe('createEmployeesHandler', () => {
    it('returns 201 with valid batch payload', async () => {
      setup()
      const request = mockRequest({
        method: 'POST',
        body: {
          companyId: 'c1',
          employees: [
            {
              firstName: 'John',
              lastName: 'S',
              email: 'john@t.com',
              sendInvitation: false,
            },
          ],
        },
      })
      const response = await createEmployeesHandler(request)

      expect(response.status).toBe(201)
      expect(response.jsonBody?.data).toHaveLength(1)
    })

    it('returns 400 when employees missing', async () => {
      setup()
      const request = mockRequest({ method: 'POST', body: { companyId: 'c1' } })
      const response = await createEmployeesHandler(request)

      expect(response.status).toBe(400)
    })

    it('returns 400 when employee fields missing', async () => {
      setup()
      const request = mockRequest({
        method: 'POST',
        body: { companyId: 'c1', employees: [{ firstName: 'J' }] },
      })
      const response = await createEmployeesHandler(request)

      expect(response.status).toBe(400)
    })

    it('returns 403 when manager tries to create in different company', async () => {
      setup()
      const request = mockRequest({
        method: 'POST',
        body: {
          companyId: 'other_company',
          employees: [{ firstName: 'J', lastName: 'S', email: 'j@t.com' }],
        },
      })
      const response = await createEmployeesHandler(request)

      expect(response.status).toBe(403)
    })
  })

  describe('updateEmployeeHandler', () => {
    it('returns 200 when employee exists', async () => {
      setup()
      const existing = {
        id: 'e1',
        companyId: 'c1',
        firstName: 'Old',
        role: 'employee',
        isActive: true,
      }
      mockContainer.item.mockReturnValue({
        read: vi.fn().mockResolvedValue({ resource: existing }),
        replace: vi.fn().mockResolvedValue({}),
        delete: vi.fn(),
      })

      const request = mockRequest({
        method: 'PUT',
        params: { employeeId: 'e1' },
        query: { companyId: 'c1' },
        body: { firstName: 'Updated' },
      })
      const response = await updateEmployeeHandler(request)

      expect(response.status).toBe(200)
    })

    it('returns 403 when manager tries to change role', async () => {
      setup()
      const existing = {
        id: 'e1',
        companyId: 'c1',
        firstName: 'Old',
        role: 'employee',
        isActive: true,
      }
      mockContainer.item.mockReturnValue({
        read: vi.fn().mockResolvedValue({ resource: existing }),
        replace: vi.fn().mockResolvedValue({}),
        delete: vi.fn(),
      })

      const request = mockRequest({
        method: 'PUT',
        params: { employeeId: 'e1' },
        query: { companyId: 'c1' },
        body: { role: 'manager' },
      })
      const response = await updateEmployeeHandler(request)

      expect(response.status).toBe(403)
      expect(response.jsonBody?.error).toContain('Only admins can change')
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
  })

  describe('deleteEmployeeHandler', () => {
    it('returns 200 on successful delete', async () => {
      setup()
      const existing = { id: 'e1', companyId: 'c1', role: 'employee' }
      mockContainer.item.mockReturnValue({
        read: vi.fn().mockResolvedValue({ resource: existing }),
        replace: vi.fn(),
        delete: vi.fn().mockResolvedValue({}),
      })

      const request = mockRequest({
        method: 'DELETE',
        params: { employeeId: 'e1' },
        query: { companyId: 'c1' },
      })
      const response = await deleteEmployeeHandler(request)

      expect(response.status).toBe(200)
    })

    it('returns 404 when employee not found', async () => {
      setup()
      const request = mockRequest({
        method: 'DELETE',
        params: { employeeId: 'nope' },
        query: { companyId: 'c1' },
      })
      const response = await deleteEmployeeHandler(request)

      expect(response.status).toBe(404)
    })
  })
})
