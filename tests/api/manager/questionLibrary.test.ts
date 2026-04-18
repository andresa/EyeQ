import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockContainer, mockRequest } from '../../helpers/api-helpers'

const { container: mockContainer } = createMockContainer()

vi.mock('../../../api/shared/cosmos', () => ({
  getContainer: vi.fn().mockImplementation(() => Promise.resolve(mockContainer)),
}))

vi.mock('../../../api/shared/auth', () => ({
  getAuthenticatedUser: vi.fn(),
  requireManager: vi.fn(),
}))

import { createHandler, updateHandler } from '../../../api/manager/questionLibrary'
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
  mockContainer.items.create.mockResolvedValue({ resource: {} })
  mockContainer.item.mockReturnValue({
    read: vi.fn().mockResolvedValue({ resource: null }),
    replace: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  })
}

describe('manager/questionLibrary', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('createHandler – option validation', () => {
    it('normalises options and stores trimmed values', async () => {
      setup()
      const request = mockRequest({
        method: 'POST',
        body: {
          companyId: 'c1',
          managerId: 'mgr_1',
          items: [
            {
              type: 'single_choice',
              title: 'Q?',
              options: [
                { id: ' o1 ', label: ' A ', imageId: ' img_1 ' },
                { id: 'o2', label: 'B' },
              ],
              correctAnswer: 'o1',
            },
          ],
        },
      })
      const response = await createHandler(request)

      expect(response.status).toBe(201)
      const options = response.jsonBody?.data[0].options
      expect(options[0]).toMatchObject({ id: 'o1', label: 'A', imageId: 'img_1' })
      expect(options[1]).toEqual({ id: 'o2', label: 'B' })
    })

    it('rejects when an option has id but no label', async () => {
      setup()
      const request = mockRequest({
        method: 'POST',
        body: {
          companyId: 'c1',
          managerId: 'mgr_1',
          items: [
            {
              type: 'single_choice',
              title: 'Q?',
              options: [
                { id: 'o1', label: 'A' },
                { id: 'o2', label: '', imageId: 'img_2' },
              ],
              correctAnswer: 'o1',
            },
          ],
        },
      })
      const response = await createHandler(request)

      expect(response.status).toBe(400)
      expect(response.jsonBody?.error).toMatch(/label/i)
    })

    it('rejects when fewer than two valid options', async () => {
      setup()
      const request = mockRequest({
        method: 'POST',
        body: {
          companyId: 'c1',
          managerId: 'mgr_1',
          items: [
            {
              type: 'single_choice',
              title: 'Q?',
              options: [{ id: 'o1', label: 'A' }],
              correctAnswer: 'o1',
            },
          ],
        },
      })
      const response = await createHandler(request)

      expect(response.status).toBe(400)
      expect(response.jsonBody?.error).toMatch(/at least two/i)
    })

    it('strips whitespace-only imageId from options', async () => {
      setup()
      const request = mockRequest({
        method: 'POST',
        body: {
          companyId: 'c1',
          managerId: 'mgr_1',
          items: [
            {
              type: 'single_choice',
              title: 'Q?',
              options: [
                { id: 'o1', label: 'A', imageId: '   ' },
                { id: 'o2', label: 'B', imageId: null },
              ],
              correctAnswer: 'o1',
            },
          ],
        },
      })
      const response = await createHandler(request)

      expect(response.status).toBe(201)
      const options = response.jsonBody?.data[0].options
      expect(options[0]).not.toHaveProperty('imageId')
      expect(options[1]).not.toHaveProperty('imageId')
    })

    it('skips option validation for non-choice types', async () => {
      setup()
      const request = mockRequest({
        method: 'POST',
        body: {
          companyId: 'c1',
          managerId: 'mgr_1',
          items: [
            {
              type: 'text',
              title: 'Free text question',
              options: [],
            },
          ],
        },
      })
      const response = await createHandler(request)

      expect(response.status).toBe(201)
    })
  })

  describe('updateHandler – option validation', () => {
    const existing = {
      id: 'ql_1',
      companyId: 'c1',
      createdBy: 'mgr_1',
      type: 'single_choice',
      title: 'Original',
      options: [
        { id: 'o1', label: 'A' },
        { id: 'o2', label: 'B' },
      ],
      correctAnswer: 'o1',
      imageId: null,
      categoryId: null,
    }

    it('normalises options on update', async () => {
      setup()
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [existing] }),
      })
      const replace = vi.fn().mockResolvedValue({})
      mockContainer.item.mockReturnValue({
        read: vi.fn().mockResolvedValue({ resource: existing }),
        replace,
        delete: vi.fn(),
      })

      const request = mockRequest({
        method: 'PUT',
        params: { itemId: 'ql_1' },
        body: {
          options: [
            { id: 'o1', label: 'A', imageId: 'img_new' },
            { id: 'o2', label: 'B' },
          ],
        },
      })
      const response = await updateHandler(request)

      expect(response.status).toBe(200)
      const options = response.jsonBody?.data.options
      expect(options[0]).toMatchObject({ id: 'o1', label: 'A', imageId: 'img_new' })
      expect(options[1]).not.toHaveProperty('imageId')
    })

    it('rejects update when option has id but no label', async () => {
      setup()
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [existing] }),
      })
      mockContainer.item.mockReturnValue({
        read: vi.fn().mockResolvedValue({ resource: existing }),
        replace: vi.fn(),
        delete: vi.fn(),
      })

      const request = mockRequest({
        method: 'PUT',
        params: { itemId: 'ql_1' },
        body: {
          options: [
            { id: 'o1', label: '' },
            { id: 'o2', label: 'B' },
          ],
        },
      })
      const response = await updateHandler(request)

      expect(response.status).toBe(400)
      expect(response.jsonBody?.error).toMatch(/label/i)
    })
  })
})
