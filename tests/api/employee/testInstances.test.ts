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
  stripCorrectAnswers,
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
  instancesContainer.items.create.mockResolvedValue({ resource: {} })
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
  responsesContainer.items.create.mockResolvedValue({ resource: {} })
  responsesContainer.item.mockReturnValue({
    read: vi.fn().mockResolvedValue({ resource: null }),
    replace: vi.fn().mockResolvedValue({}),
    delete: vi.fn(),
  })
}

const testWithAnswers = {
  id: 't1',
  name: 'Test',
  sections: [
    {
      id: 's1',
      title: 'Section 1',
      components: [
        {
          id: 'c_info',
          type: 'info',
          title: 'Welcome',
          description: 'Read carefully',
          required: false,
        },
        {
          id: 'c_sc',
          type: 'single_choice',
          title: 'Pick one',
          description: 'desc',
          required: true,
          options: [
            { id: 'opt_1', label: 'A' },
            { id: 'opt_2', label: 'B' },
          ],
          correctAnswer: 'opt_1',
          saveToLibrary: true,
          addToFlashCards: true,
          categoryId: 'cat_1',
          imageId: 'img_1',
        },
        {
          id: 'c_mc',
          type: 'multiple_choice',
          title: 'Pick many',
          description: '',
          required: true,
          options: [
            { id: 'opt_3', label: 'X' },
            { id: 'opt_4', label: 'Y' },
          ],
          correctAnswer: ['opt_3', 'opt_4'],
        },
        {
          id: 'c_text',
          type: 'text',
          title: 'Explain',
          description: '',
          required: false,
        },
      ],
    },
  ],
  settings: { allowBackNavigation: false },
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
    it('returns 200 with instance details and strips correctAnswer', async () => {
      setup()
      const instance = { id: 'i1', testId: 't1', employeeId: 'emp_1' }
      instancesContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [instance] }),
      })
      testsContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [testWithAnswers] }),
      })

      const request = mockRequest({ params: { instanceId: 'i1' } })
      const response = await getTestInstanceDetailsHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data?.instance).toEqual(instance)
      const returnedTest = response.jsonBody?.data?.test
      expect(returnedTest.id).toBe('t1')
      expect(returnedTest.name).toBe('Test')

      for (const section of returnedTest.sections) {
        for (const component of section.components) {
          expect(component).not.toHaveProperty('correctAnswer')
          expect(component).not.toHaveProperty('saveToLibrary')
          expect(component).not.toHaveProperty('addToFlashCards')
          expect(component).not.toHaveProperty('categoryId')
        }
      }
    })

    it('preserves all non-sensitive component fields', async () => {
      setup()
      const instance = { id: 'i1', testId: 't1', employeeId: 'emp_1' }
      instancesContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [instance] }),
      })
      testsContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [testWithAnswers] }),
      })

      const request = mockRequest({ params: { instanceId: 'i1' } })
      const response = await getTestInstanceDetailsHandler(request)
      const components = response.jsonBody?.data?.test.sections[0].components

      const scComponent = components.find((c: { id: string }) => c.id === 'c_sc')
      expect(scComponent).toMatchObject({
        id: 'c_sc',
        type: 'single_choice',
        title: 'Pick one',
        description: 'desc',
        required: true,
        imageId: 'img_1',
        options: [
          { id: 'opt_1', label: 'A' },
          { id: 'opt_2', label: 'B' },
        ],
      })

      const infoComponent = components.find((c: { id: string }) => c.id === 'c_info')
      expect(infoComponent).toMatchObject({
        id: 'c_info',
        type: 'info',
        title: 'Welcome',
      })

      const textComponent = components.find((c: { id: string }) => c.id === 'c_text')
      expect(textComponent).toMatchObject({
        id: 'c_text',
        type: 'text',
        title: 'Explain',
      })
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

    it('returns 409 and marks instance as expired when expiresAt is in the past', async () => {
      setup()
      const instance = {
        id: 'i1',
        testId: 't1',
        employeeId: 'emp_1',
        status: 'assigned',
        expiresAt: '2020-01-01T00:00:00Z',
      }
      instancesContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [instance] }),
      })
      const replaceFn = vi.fn().mockResolvedValue({})
      instancesContainer.item.mockReturnValue({
        read: vi.fn(),
        replace: replaceFn,
        delete: vi.fn(),
      })

      const request = mockRequest({ method: 'POST', params: { instanceId: 'i1' } })
      const response = await openTestInstanceHandler(request)

      expect(response.status).toBe(409)
      expect(response.jsonBody?.error).toBe('This test has expired.')
      expect(replaceFn).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'expired' }),
      )
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

    it('returns 409 and marks instance as expired when expiresAt is in the past', async () => {
      setup()
      const instance = {
        id: 'i1',
        testId: 't1',
        employeeId: 'emp_1',
        status: 'in-progress',
        expiresAt: '2020-01-01T00:00:00Z',
      }
      instancesContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [instance] }),
      })
      const replaceFn = vi.fn().mockResolvedValue({})
      instancesContainer.item.mockReturnValue({
        read: vi.fn(),
        replace: replaceFn,
        delete: vi.fn(),
      })

      const request = mockRequest({
        method: 'POST',
        params: { instanceId: 'i1' },
        body: { responses: [{ questionId: 'q1', answer: 'a' }] },
      })
      const response = await saveTestResponsesHandler(request)

      expect(response.status).toBe(409)
      expect(response.jsonBody?.error).toBe('This test has expired.')
      expect(replaceFn).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'expired' }),
      )
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

    it('returns 409 and marks instance as expired when expiresAt is in the past', async () => {
      setup()
      const instance = {
        id: 'i1',
        testId: 't1',
        employeeId: 'emp_1',
        status: 'in-progress',
        expiresAt: '2020-01-01T00:00:00Z',
      }
      instancesContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [instance] }),
      })
      const replaceFn = vi.fn().mockResolvedValue({})
      instancesContainer.item.mockReturnValue({
        read: vi.fn(),
        replace: replaceFn,
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

      expect(response.status).toBe(409)
      expect(response.jsonBody?.error).toBe('This test has expired.')
      expect(replaceFn).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'expired' }),
      )
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
    it('returns 200 with results and strips correctAnswer', async () => {
      setup()
      const instance = { id: 'i1', testId: 't1', employeeId: 'emp_1' }
      instancesContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [instance] }),
      })
      testsContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [testWithAnswers] }),
      })

      const request = mockRequest({ params: { instanceId: 'i1' } })
      const response = await getEmployeeTestInstanceResultsHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data?.instance).toEqual(instance)
      const returnedTest = response.jsonBody?.data?.test
      expect(returnedTest.id).toBe('t1')

      for (const section of returnedTest.sections) {
        for (const component of section.components) {
          expect(component).not.toHaveProperty('correctAnswer')
          expect(component).not.toHaveProperty('saveToLibrary')
          expect(component).not.toHaveProperty('addToFlashCards')
          expect(component).not.toHaveProperty('categoryId')
        }
      }
    })

    it('returns 404 when instance not found', async () => {
      setup()
      const request = mockRequest({ params: { instanceId: 'nope' } })
      const response = await getEmployeeTestInstanceResultsHandler(request)

      expect(response.status).toBe(404)
    })
  })

  describe('stripCorrectAnswers', () => {
    it('strips correctAnswer from single_choice and multiple_choice components', () => {
      const result = stripCorrectAnswers(testWithAnswers)
      const components = result.sections[0].components as Record<string, unknown>[]
      const sc = components.find((c) => c.id === 'c_sc')
      const mc = components.find((c) => c.id === 'c_mc')
      expect(sc).not.toHaveProperty('correctAnswer')
      expect(mc).not.toHaveProperty('correctAnswer')
    })

    it('strips manager-only fields: saveToLibrary, addToFlashCards, categoryId', () => {
      const result = stripCorrectAnswers(testWithAnswers)
      const components = result.sections[0].components as Record<string, unknown>[]
      const sc = components.find((c) => c.id === 'c_sc')
      expect(sc).not.toHaveProperty('saveToLibrary')
      expect(sc).not.toHaveProperty('addToFlashCards')
      expect(sc).not.toHaveProperty('categoryId')
    })

    it('preserves all other fields', () => {
      const result = stripCorrectAnswers(testWithAnswers)
      const components = result.sections[0].components as Record<string, unknown>[]
      const sc = components.find((c) => c.id === 'c_sc')
      expect(sc).toMatchObject({
        id: 'c_sc',
        type: 'single_choice',
        title: 'Pick one',
        description: 'desc',
        required: true,
        imageId: 'img_1',
        options: [
          { id: 'opt_1', label: 'A' },
          { id: 'opt_2', label: 'B' },
        ],
      })
      expect(result).toHaveProperty('id', 't1')
      expect(result).toHaveProperty('name', 'Test')
      expect(result).toHaveProperty('settings', { allowBackNavigation: false })
    })

    it('handles empty sections array', () => {
      const result = stripCorrectAnswers({ id: 't2', sections: [] })
      expect(result.sections).toEqual([])
    })

    it('handles undefined sections', () => {
      const result = stripCorrectAnswers({ id: 't3' })
      expect(result.sections).toEqual([])
    })

    it('handles components without correctAnswer (info and text types)', () => {
      const result = stripCorrectAnswers(testWithAnswers)
      const components = result.sections[0].components as Record<string, unknown>[]
      const info = components.find((c) => c.id === 'c_info')
      const text = components.find((c) => c.id === 'c_text')
      expect(info).toMatchObject({ id: 'c_info', type: 'info', title: 'Welcome' })
      expect(text).toMatchObject({ id: 'c_text', type: 'text', title: 'Explain' })
    })

    it('handles sections with empty components array', () => {
      const test = {
        id: 't4',
        sections: [{ id: 's1', title: 'Empty', components: [] }],
      }
      const result = stripCorrectAnswers(test)
      expect(result.sections[0].components).toEqual([])
    })
  })
})
