import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockContainer, mockRequest } from '../../helpers/api-helpers'

const { container: mockContainer } = createMockContainer()
const testsContainer = createMockContainer().container
const responsesContainer = createMockContainer().container

vi.mock('../../../api/shared/cosmos', () => ({
  getContainer: vi.fn().mockImplementation((name: string) => {
    if (name === 'tests') return Promise.resolve(testsContainer)
    if (name === 'responses') return Promise.resolve(responsesContainer)
    return Promise.resolve(mockContainer)
  }),
}))

vi.mock('../../../api/shared/auth', () => ({
  getAuthenticatedUser: vi.fn(),
  requireManager: vi.fn(),
}))

import {
  listTestInstancesHandler,
  getTestInstanceResultsHandler,
  markTestInstanceHandler,
} from '../../../api/manager/testInstances'
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

function setup() {
  vi.mocked(getAuthenticatedUser).mockResolvedValue(managerUser)
  vi.mocked(requireManager).mockReturnValue(null)

  mockContainer.items.query.mockReset()
  mockContainer.items.query.mockReturnValue({
    fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
  })
  testsContainer.items.query.mockReset()
  testsContainer.items.query.mockReturnValue({
    fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
  })
  responsesContainer.items.query.mockReset()
  responsesContainer.items.query.mockReturnValue({
    fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
  })
  responsesContainer.items.create.mockResolvedValue({ resource: {} })
  responsesContainer.item.mockReturnValue({
    read: vi.fn().mockResolvedValue({ resource: null }),
    replace: vi.fn().mockResolvedValue({}),
    delete: vi.fn(),
  })
  mockContainer.item.mockReturnValue({
    read: vi.fn().mockResolvedValue({ resource: null }),
    replace: vi.fn().mockResolvedValue({}),
    delete: vi.fn(),
  })
}

describe('manager/testInstances', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('listTestInstancesHandler', () => {
    it('returns 200 with instances filtered by testId', async () => {
      setup()
      const instances = [{ id: 'i1', testId: 't1' }]
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: instances }),
      })

      const request = mockRequest({ query: { testId: 't1' } })
      const response = await listTestInstancesHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toEqual(instances)
    })

    it('expires stale instances in non-paginated results', async () => {
      setup()
      const instances = [
        {
          id: 'i1',
          testId: 't1',
          employeeId: 'e1',
          status: 'assigned',
          expiresAt: '2020-01-01T00:00:00Z',
        },
        {
          id: 'i2',
          testId: 't1',
          employeeId: 'e2',
          status: 'completed',
          expiresAt: '2020-01-01T00:00:00Z',
        },
      ]
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: instances }),
      })
      const replaceFn = vi.fn().mockResolvedValue({})
      mockContainer.item.mockReturnValue({
        read: vi.fn(),
        replace: replaceFn,
        delete: vi.fn(),
      })

      const request = mockRequest({ query: { testId: 't1' } })
      const response = await listTestInstancesHandler(request)

      expect(response.status).toBe(200)
      const data = response.jsonBody?.data as { id: string; status: string }[]
      expect(data[0].status).toBe('expired')
      expect(data[1].status).toBe('completed')
      expect(replaceFn).toHaveBeenCalledTimes(1)
      expect(replaceFn).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'i1', status: 'expired' }),
      )
    })

    it('returns 400 when neither testId nor companyId provided', async () => {
      setup()
      const request = mockRequest({})
      const response = await listTestInstancesHandler(request)

      expect(response.status).toBe(400)
    })

    it('returns paginated instances with filters when limit is provided', async () => {
      setup()
      testsContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [{ id: 't1' }] }),
      })
      const pageFetchAll = vi
        .fn()
        .mockResolvedValue({ resources: [{ id: 'i1', testId: 't1' }] })
      const countFetchAll = vi.fn().mockResolvedValue({ resources: [3] })
      mockContainer.items.query
        .mockReturnValueOnce({ fetchAll: pageFetchAll })
        .mockReturnValueOnce({ fetchAll: countFetchAll })

      const request = mockRequest({
        query: {
          companyId: 'c1',
          employeeIds: 'e1,e2',
          statuses: 'completed,marked',
          assignedAfter: '2025-01-01T00:00:00.000Z',
          assignedBefore: '2025-01-31T23:59:59.999Z',
          limit: '10',
        },
      })
      const response = await listTestInstancesHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody).toMatchObject({
        success: true,
        data: [{ id: 'i1', testId: 't1' }],
        total: 3,
        nextCursor: Buffer.from('1', 'utf8').toString('base64url'),
      })
    })
  })

  describe('getTestInstanceResultsHandler', () => {
    it('returns 200 with instance, test, and responses', async () => {
      setup()
      const instance = { id: 'i1', testId: 't1', employeeId: 'e1' }
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [instance] }),
      })
      const test = { id: 't1', name: 'Test', companyId: 'c1' }
      testsContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [test] }),
      })
      const responses = [{ id: 'r1', questionId: 'q1' }]
      responsesContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: responses }),
      })

      const request = mockRequest({ params: { instanceId: 'i1' } })
      const response = await getTestInstanceResultsHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toEqual({ instance, test, responses })
    })

    it('returns 404 when instance not found', async () => {
      setup()
      const request = mockRequest({ params: { instanceId: 'nope' } })
      const response = await getTestInstanceResultsHandler(request)

      expect(response.status).toBe(404)
    })

    it('returns 400 when instanceId missing', async () => {
      setup()
      const request = mockRequest({ params: {} })
      const response = await getTestInstanceResultsHandler(request)

      expect(response.status).toBe(400)
    })

    it('expires a stale instance and returns corrected status', async () => {
      setup()
      const instance = {
        id: 'i1',
        testId: 't1',
        employeeId: 'e1',
        status: 'assigned',
        expiresAt: '2020-01-01T00:00:00Z',
      }
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [instance] }),
      })
      const replaceFn = vi.fn().mockResolvedValue({})
      mockContainer.item.mockReturnValue({
        read: vi.fn(),
        replace: replaceFn,
        delete: vi.fn(),
      })
      const test = { id: 't1', name: 'Test', companyId: 'c1' }
      testsContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [test] }),
      })
      responsesContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
      })

      const request = mockRequest({ params: { instanceId: 'i1' } })
      const response = await getTestInstanceResultsHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data?.instance?.status).toBe('expired')
      expect(replaceFn).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'i1', status: 'expired' }),
      )
    })
  })

  describe('markTestInstanceHandler', () => {
    it('returns 200 and updates score', async () => {
      setup()
      const instance = { id: 'i1', testId: 't1', employeeId: 'e1', status: 'completed' }
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [instance] }),
      })
      mockContainer.item.mockReturnValue({
        read: vi.fn(),
        replace: vi.fn().mockResolvedValue({}),
        delete: vi.fn(),
      })
      const test = { id: 't1', companyId: 'c1' }
      testsContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [test] }),
      })

      const request = mockRequest({
        method: 'POST',
        params: { instanceId: 'i1' },
        body: {
          marks: [
            { questionId: 'q1', isCorrect: true },
            { questionId: 'q2', isCorrect: false },
          ],
        },
      })
      const response = await markTestInstanceHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data?.status).toBe('marked')
      expect(response.jsonBody?.data?.score).toBe(50)
    })

    it('returns 400 when marks missing', async () => {
      setup()
      const request = mockRequest({
        method: 'POST',
        params: { instanceId: 'i1' },
        body: {},
      })
      const response = await markTestInstanceHandler(request)

      expect(response.status).toBe(400)
    })

    it('returns 404 when instance not found', async () => {
      setup()
      const request = mockRequest({
        method: 'POST',
        params: { instanceId: 'nope' },
        body: { marks: [{ questionId: 'q1', isCorrect: true }] },
      })
      const response = await markTestInstanceHandler(request)

      expect(response.status).toBe(404)
    })
  })
})
