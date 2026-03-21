import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockContainer, mockRequest } from '../../helpers/api-helpers'

const { container: mockContainer } = createMockContainer()
const instancesContainer = createMockContainer().container

vi.mock('../../../api/shared/cosmos', () => ({
  getContainer: vi.fn().mockImplementation((name: string) => {
    if (name === 'testInstances') return Promise.resolve(instancesContainer)
    return Promise.resolve(mockContainer)
  }),
}))

vi.mock('../../../api/shared/auth', () => ({
  getAuthenticatedUser: vi.fn(),
  requireManager: vi.fn(),
}))

import {
  listTestsHandler,
  createTestHandler,
  updateTestHandler,
  deleteTestHandler,
  assignTestHandler,
  duplicateTestHandler,
} from '../../../api/manager/tests'
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

  instancesContainer.items.create.mockResolvedValue({ resource: {} })
}

describe('manager/tests', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('listTestsHandler', () => {
    it('returns 200 with tests', async () => {
      setup()
      const tests = [{ id: 't1', name: 'Test A' }]
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: tests }),
      })

      const request = mockRequest({ query: { companyId: 'c1' } })
      const response = await listTestsHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toEqual(tests)
    })

    it('returns 400 when companyId missing', async () => {
      setup()
      const request = mockRequest({})
      const response = await listTestsHandler(request)

      expect(response.status).toBe(400)
    })

    it('returns paginated tests when limit is provided', async () => {
      setup()
      const fetchNext = vi.fn().mockResolvedValue({
        resources: [{ id: 't1', name: 'Safety' }],
        continuationToken: 'cursor_1',
      })
      const fetchAll = vi.fn().mockResolvedValue({ resources: [7] })
      mockContainer.items.query
        .mockReturnValueOnce({ fetchNext })
        .mockReturnValueOnce({ fetchAll })

      const request = mockRequest({
        query: { companyId: 'c1', name: 'safe', limit: '10' },
      })
      const response = await listTestsHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody).toMatchObject({
        success: true,
        data: [{ id: 't1', name: 'Safety' }],
        total: 7,
        nextCursor: Buffer.from('cursor_1', 'utf8').toString('base64url'),
      })
    })
  })

  describe('createTestHandler', () => {
    it('returns 201 with valid payload', async () => {
      setup()
      const request = mockRequest({
        method: 'POST',
        body: {
          companyId: 'c1',
          managerId: 'mgr_1',
          name: 'New Test',
          sections: [{ id: 's1', title: 'S1', components: [] }],
        },
      })
      const response = await createTestHandler(request)

      expect(response.status).toBe(201)
      expect(response.jsonBody?.data).toMatchObject({ name: 'New Test', isActive: true })
    })

    it('returns 400 when required fields missing', async () => {
      setup()
      const request = mockRequest({ method: 'POST', body: { companyId: 'c1' } })
      const response = await createTestHandler(request)

      expect(response.status).toBe(400)
    })

    it('returns 403 when manager creates in different company', async () => {
      setup()
      const request = mockRequest({
        method: 'POST',
        body: { companyId: 'other', managerId: 'mgr_1', name: 'X', sections: [] },
      })
      const response = await createTestHandler(request)

      expect(response.status).toBe(403)
    })
  })

  describe('updateTestHandler', () => {
    it('returns 200 when test exists', async () => {
      setup()
      const existing = {
        id: 't1',
        companyId: 'c1',
        name: 'Old',
        sections: [],
        isActive: true,
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
        params: { testId: 't1' },
        body: { name: 'Updated' },
      })
      const response = await updateTestHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toMatchObject({ name: 'Updated' })
    })

    it('returns 404 when test not found', async () => {
      setup()
      const request = mockRequest({
        method: 'PUT',
        params: { testId: 'nope' },
        body: { name: 'X' },
      })
      const response = await updateTestHandler(request)

      expect(response.status).toBe(404)
    })
  })

  describe('deleteTestHandler (soft delete)', () => {
    it('returns 200 and sets isActive to false', async () => {
      setup()
      const existing = { id: 't1', companyId: 'c1', name: 'T', isActive: true }
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [existing] }),
      })
      const replaceMock = vi.fn().mockResolvedValue({})
      mockContainer.item.mockReturnValue({
        read: vi.fn(),
        replace: replaceMock,
        delete: vi.fn(),
      })

      const request = mockRequest({ method: 'DELETE', params: { testId: 't1' } })
      const response = await deleteTestHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data?.isActive).toBe(false)
    })

    it('returns 404 when test not found', async () => {
      setup()
      const request = mockRequest({ method: 'DELETE', params: { testId: 'nope' } })
      const response = await deleteTestHandler(request)

      expect(response.status).toBe(404)
    })
  })

  describe('assignTestHandler', () => {
    it('returns 201 when assigning to employees', async () => {
      setup()
      const test = { id: 't1', companyId: 'c1', managerId: 'mgr_1' }
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [test] }),
      })

      const request = mockRequest({
        method: 'POST',
        params: { testId: 't1' },
        body: { employeeIds: ['e1', 'e2'] },
      })
      const response = await assignTestHandler(request)

      expect(response.status).toBe(201)
      expect(response.jsonBody?.data).toHaveLength(2)
      expect(instancesContainer.items.create).toHaveBeenCalledTimes(2)
    })

    it('returns 400 when employeeIds missing', async () => {
      setup()
      const request = mockRequest({ method: 'POST', params: { testId: 't1' }, body: {} })
      const response = await assignTestHandler(request)

      expect(response.status).toBe(400)
    })

    it('returns 404 when test not found', async () => {
      setup()
      const request = mockRequest({
        method: 'POST',
        params: { testId: 'nope' },
        body: { employeeIds: ['e1'] },
      })
      const response = await assignTestHandler(request)

      expect(response.status).toBe(404)
    })
  })

  describe('duplicateTestHandler', () => {
    it('returns 201 with (Copy) appended', async () => {
      setup()
      const existing = {
        id: 't1',
        companyId: 'c1',
        name: 'Original',
        sections: [],
        isActive: true,
      }
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [existing] }),
      })

      const request = mockRequest({ method: 'POST', params: { testId: 't1' } })
      const response = await duplicateTestHandler(request)

      expect(response.status).toBe(201)
      expect(response.jsonBody?.data?.name).toBe('Original (Copy)')
      expect(response.jsonBody?.data?.id).not.toBe('t1')
    })

    it('returns 404 when test not found', async () => {
      setup()
      const request = mockRequest({ method: 'POST', params: { testId: 'nope' } })
      const response = await duplicateTestHandler(request)

      expect(response.status).toBe(404)
    })
  })
})
