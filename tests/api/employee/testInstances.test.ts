import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockContainer, mockRequest } from '../../helpers/api-helpers'

const instancesContainer = createMockContainer().container
const testsContainer = createMockContainer().container
const responsesContainer = createMockContainer().container

vi.mock('../../../api/shared/cosmos', () => ({
  getContainer: vi.fn().mockImplementation((name: string) => {
    if (name === 'testInstances') return Promise.resolve(instancesContainer)
    if (name === 'tests') return Promise.resolve(testsContainer)
    if (name === 'responses') return Promise.resolve(responsesContainer)
    return Promise.resolve(instancesContainer)
  }),
}))

vi.mock('../../../api/shared/auth', () => ({
  getAuthenticatedUser: vi.fn(),
  requireEmployee: vi.fn(),
}))

import {
  listEmployeeTestInstancesHandler,
  getTestInstanceDetailsHandler,
  openTestInstanceHandler,
  saveTestResponsesHandler,
  submitTestInstanceHandler,
  timeoutTestInstanceHandler,
  getEmployeeTestInstanceResultsHandler,
} from '../../../api/employee/testInstances'
import { getAuthenticatedUser, requireEmployee } from '../../../api/shared/auth'

const employeeUser = {
  id: 'emp_1',
  email: 'e@t.com',
  firstName: 'E',
  lastName: 'M',
  role: 'employee' as const,
  companyId: 'c1',
  userType: 'employee' as const,
}

function setup() {
  vi.mocked(getAuthenticatedUser).mockResolvedValue(employeeUser)
  vi.mocked(requireEmployee).mockReturnValue(null)

  instancesContainer.items.query.mockReturnValue({
    fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
  })
  instancesContainer.items.create.mockResolvedValue({})
  instancesContainer.item.mockReturnValue({
    read: vi.fn().mockResolvedValue({ resource: null }),
    replace: vi.fn().mockResolvedValue({}),
    delete: vi.fn(),
  })

  testsContainer.items.query.mockReturnValue({
    fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
  })

  responsesContainer.items.query.mockReturnValue({
    fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
  })
  responsesContainer.items.create.mockResolvedValue({})
  responsesContainer.item.mockReturnValue({
    read: vi.fn().mockResolvedValue({ resource: null }),
    replace: vi.fn().mockResolvedValue({}),
    delete: vi.fn(),
  })
}

describe('employee/testInstances', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('listEmployeeTestInstancesHandler', () => {
    it('returns 200 with test instances', async () => {
      setup()
      const instances = [
        {
          id: 'i1',
          testId: 't1',
          employeeId: 'emp_1',
          status: 'assigned',
          expiresAt: '2099-01-01T00:00:00Z',
        },
      ]
      instancesContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: instances }),
      })
      testsContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [{ id: 't1', name: 'Test A', sections: [], settings: {} }],
        }),
      })

      const request = mockRequest({ query: { employeeId: 'emp_1' } })
      const response = await listEmployeeTestInstancesHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toHaveLength(1)
    })

    it('returns 400 when employeeId missing', async () => {
      setup()
      const request = mockRequest({})
      const response = await listEmployeeTestInstancesHandler(request)

      expect(response.status).toBe(400)
    })

    it('returns paginated test instances with filters when limit is provided', async () => {
      setup()
      const instance = {
        id: 'i1',
        testId: 't1',
        employeeId: 'emp_1',
        status: 'assigned',
        assignedAt: '2025-01-10T00:00:00.000Z',
        expiresAt: '2099-01-01T00:00:00Z',
      }

      instancesContainer.items.query
        .mockReturnValueOnce({ fetchAll: vi.fn().mockResolvedValue({ resources: [] }) })
        .mockReturnValueOnce({
          fetchNext: vi.fn().mockResolvedValue({
            resources: [instance],
            continuationToken: 'cursor_3',
          }),
        })
        .mockReturnValueOnce({ fetchAll: vi.fn().mockResolvedValue({ resources: [5] }) })

      testsContainer.items.query
        .mockReturnValueOnce({
          fetchAll: vi.fn().mockResolvedValue({ resources: [{ id: 't1' }] }),
        })
        .mockReturnValueOnce({
          fetchAll: vi.fn().mockResolvedValue({
            resources: [{ id: 't1', name: 'Test A', sections: [], settings: {} }],
          }),
        })

      const request = mockRequest({
        query: {
          employeeId: 'emp_1',
          status: 'assigned',
          name: 'test',
          limit: '10',
        },
      })
      const response = await listEmployeeTestInstancesHandler(request, 'c1')

      expect(response.status).toBe(200)
      expect(response.jsonBody).toMatchObject({
        success: true,
        data: [{ id: 'i1', testId: 't1', testName: 'Test A' }],
        total: 5,
        nextCursor: Buffer.from('cursor_3', 'utf8').toString('base64url'),
      })
    })
  })

  describe('getTestInstanceDetailsHandler', () => {
    it('returns 200 with instance details', async () => {
      setup()
      const instance = { id: 'i1', testId: 't1', employeeId: 'emp_1' }
      instancesContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [instance] }),
      })
      const test = { id: 't1', name: 'Test' }
      testsContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [test] }),
      })

      const request = mockRequest({ params: { instanceId: 'i1' } })
      const response = await getTestInstanceDetailsHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toMatchObject({ instance, test })
    })

    it('returns 404 when instance not found', async () => {
      setup()
      const request = mockRequest({ params: { instanceId: 'nope' } })
      const response = await getTestInstanceDetailsHandler(request)

      expect(response.status).toBe(404)
    })
  })

  describe('openTestInstanceHandler', () => {
    it('returns 200 and updates status to opened', async () => {
      setup()
      const instance = { id: 'i1', testId: 't1', employeeId: 'emp_1', status: 'assigned' }
      instancesContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [instance] }),
      })
      instancesContainer.item.mockReturnValue({
        read: vi.fn(),
        replace: vi.fn().mockResolvedValue({}),
        delete: vi.fn(),
      })

      const request = mockRequest({ method: 'POST', params: { instanceId: 'i1' } })
      const response = await openTestInstanceHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data?.status).toBe('opened')
    })

    it('returns 200 without updating already opened instance', async () => {
      setup()
      const instance = { id: 'i1', testId: 't1', employeeId: 'emp_1', status: 'opened' }
      instancesContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [instance] }),
      })

      const request = mockRequest({ method: 'POST', params: { instanceId: 'i1' } })
      const response = await openTestInstanceHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data?.status).toBe('opened')
    })

    it('returns 409 when test cannot be opened', async () => {
      setup()
      const instance = {
        id: 'i1',
        testId: 't1',
        employeeId: 'emp_1',
        status: 'completed',
      }
      instancesContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [instance] }),
      })

      const request = mockRequest({ method: 'POST', params: { instanceId: 'i1' } })
      const response = await openTestInstanceHandler(request)

      expect(response.status).toBe(409)
    })

    it('returns 403 when employee opens another users test', async () => {
      setup()
      const instance = {
        id: 'i1',
        testId: 't1',
        employeeId: 'other_emp',
        status: 'assigned',
      }
      instancesContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [instance] }),
      })

      const request = mockRequest({ method: 'POST', params: { instanceId: 'i1' } })
      const response = await openTestInstanceHandler(request)

      expect(response.status).toBe(403)
    })
  })

  describe('saveTestResponsesHandler', () => {
    it('returns 200 and saves responses', async () => {
      setup()
      const instance = { id: 'i1', testId: 't1', employeeId: 'emp_1', status: 'opened' }
      instancesContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [instance] }),
      })
      instancesContainer.item.mockReturnValue({
        read: vi.fn(),
        replace: vi.fn().mockResolvedValue({}),
        delete: vi.fn(),
      })

      const request = mockRequest({
        method: 'POST',
        params: { instanceId: 'i1' },
        body: { responses: [{ questionId: 'q1', answer: 'opt_1' }] },
      })
      const response = await saveTestResponsesHandler(request)

      expect(response.status).toBe(200)
    })

    it('returns 400 when responses missing', async () => {
      setup()
      const request = mockRequest({
        method: 'POST',
        params: { instanceId: 'i1' },
        body: {},
      })
      const response = await saveTestResponsesHandler(request)

      expect(response.status).toBe(400)
    })

    it('returns 409 when test is already completed', async () => {
      setup()
      const instance = {
        id: 'i1',
        testId: 't1',
        employeeId: 'emp_1',
        status: 'completed',
      }
      instancesContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [instance] }),
      })

      const request = mockRequest({
        method: 'POST',
        params: { instanceId: 'i1' },
        body: { responses: [{ questionId: 'q1', answer: 'a' }] },
      })
      const response = await saveTestResponsesHandler(request)

      expect(response.status).toBe(409)
    })
  })

  describe('submitTestInstanceHandler', () => {
    it('returns 200 and sets status to completed', async () => {
      setup()
      const instance = {
        id: 'i1',
        testId: 't1',
        employeeId: 'emp_1',
        status: 'in-progress',
      }
      instancesContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [instance] }),
      })
      instancesContainer.item.mockReturnValue({
        read: vi.fn(),
        replace: vi.fn().mockResolvedValue({}),
        delete: vi.fn(),
      })

      const request = mockRequest({
        method: 'POST',
        params: { instanceId: 'i1' },
        body: {
          responses: [{ questionId: 'q1', answer: 'a' }],
          completedAt: '2025-06-01T00:00:00Z',
        },
      })
      const response = await submitTestInstanceHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data?.status).toBe('completed')
    })

    it('returns 400 when completedAt missing', async () => {
      setup()
      const request = mockRequest({
        method: 'POST',
        params: { instanceId: 'i1' },
        body: { responses: [{ questionId: 'q1', answer: 'a' }] },
      })
      const response = await submitTestInstanceHandler(request)

      expect(response.status).toBe(400)
    })

    it('returns 409 when already completed', async () => {
      setup()
      const instance = {
        id: 'i1',
        testId: 't1',
        employeeId: 'emp_1',
        status: 'completed',
      }
      instancesContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [instance] }),
      })

      const request = mockRequest({
        method: 'POST',
        params: { instanceId: 'i1' },
        body: {
          responses: [{ questionId: 'q1', answer: 'a' }],
          completedAt: '2025-06-01T00:00:00Z',
        },
      })
      const response = await submitTestInstanceHandler(request)

      expect(response.status).toBe(409)
    })
  })

  describe('timeoutTestInstanceHandler', () => {
    it('returns 200 and sets status to timed-out', async () => {
      setup()
      const instance = {
        id: 'i1',
        testId: 't1',
        employeeId: 'emp_1',
        status: 'in-progress',
      }
      instancesContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [instance] }),
      })
      instancesContainer.item.mockReturnValue({
        read: vi.fn(),
        replace: vi.fn().mockResolvedValue({}),
        delete: vi.fn(),
      })

      const request = mockRequest({ method: 'POST', params: { instanceId: 'i1' } })
      const response = await timeoutTestInstanceHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data?.status).toBe('timed-out')
    })

    it('returns 409 when status is not in-progress or opened', async () => {
      setup()
      const instance = {
        id: 'i1',
        testId: 't1',
        employeeId: 'emp_1',
        status: 'completed',
      }
      instancesContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [instance] }),
      })

      const request = mockRequest({ method: 'POST', params: { instanceId: 'i1' } })
      const response = await timeoutTestInstanceHandler(request)

      expect(response.status).toBe(409)
    })
  })

  describe('getEmployeeTestInstanceResultsHandler', () => {
    it('returns 200 with results', async () => {
      setup()
      const instance = { id: 'i1', testId: 't1', employeeId: 'emp_1' }
      instancesContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [instance] }),
      })
      const test = { id: 't1', name: 'Test' }
      testsContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [test] }),
      })

      const request = mockRequest({ params: { instanceId: 'i1' } })
      const response = await getEmployeeTestInstanceResultsHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toMatchObject({ instance, test })
    })

    it('returns 404 when instance not found', async () => {
      setup()
      const request = mockRequest({ params: { instanceId: 'nope' } })
      const response = await getEmployeeTestInstanceResultsHandler(request)

      expect(response.status).toBe(404)
    })
  })
})
