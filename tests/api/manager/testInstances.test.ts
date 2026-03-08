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

  mockContainer.items.query.mockReturnValue({
    fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
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

    it('returns 400 when neither testId nor companyId provided', async () => {
      setup()
      const request = mockRequest({})
      const response = await listTestInstancesHandler(request)

      expect(response.status).toBe(400)
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
