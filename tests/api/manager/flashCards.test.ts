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

import {
  listFlashCardsHandler,
  createFlashCardsHandler,
  getFlashCardHandler,
  updateFlashCardHandler,
  deleteFlashCardHandler,
} from '../../../api/manager/flashCards'
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
}

const validSingleChoiceItem = {
  type: 'single_choice',
  title: 'Question?',
  options: [
    { id: 'o1', label: 'Option A' },
    { id: 'o2', label: 'Option B' },
  ],
  correctAnswer: 'o1',
}

const validMultipleChoiceItem = {
  type: 'multiple_choice',
  title: 'Select all that apply',
  options: [
    { id: 'o1', label: 'Option A' },
    { id: 'o2', label: 'Option B' },
    { id: 'o3', label: 'Option C' },
  ],
  correctAnswer: ['o1', 'o3'],
}

describe('manager/flashCards', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('listFlashCardsHandler', () => {
    it('returns 200 with flash cards', async () => {
      setup()
      const cards = [{ id: 'fc_1', title: 'Card A' }]
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: cards }),
      })

      const request = mockRequest({ query: { companyId: 'c1' } })
      const response = await listFlashCardsHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toEqual(cards)
    })

    it('returns 400 when companyId missing', async () => {
      setup()
      const request = mockRequest({})
      const response = await listFlashCardsHandler(request)

      expect(response.status).toBe(400)
    })

    it('returns paginated flash cards when limit is provided', async () => {
      setup()
      const fetchNext = vi.fn().mockResolvedValue({
        resources: [{ id: 'fc_1', title: 'Card' }],
        continuationToken: 'cursor_1',
      })
      const fetchAll = vi.fn().mockResolvedValue({ resources: [5] })
      mockContainer.items.query
        .mockReturnValueOnce({ fetchNext })
        .mockReturnValueOnce({ fetchAll })

      const request = mockRequest({
        query: { companyId: 'c1', limit: '10' },
      })
      const response = await listFlashCardsHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody).toMatchObject({
        success: true,
        data: [{ id: 'fc_1', title: 'Card' }],
        total: 5,
      })
    })
  })

  describe('createFlashCardsHandler', () => {
    it('returns 201 with valid single-choice card', async () => {
      setup()
      const request = mockRequest({
        method: 'POST',
        body: { companyId: 'c1', items: [validSingleChoiceItem] },
      })
      const response = await createFlashCardsHandler(request)

      expect(response.status).toBe(201)
      expect(response.jsonBody?.data).toHaveLength(1)
      expect(response.jsonBody?.data[0]).toMatchObject({
        type: 'single_choice',
        title: 'Question?',
        companyId: 'c1',
      })
    })

    it('returns 201 with valid multiple-choice card', async () => {
      setup()
      const request = mockRequest({
        method: 'POST',
        body: { companyId: 'c1', items: [validMultipleChoiceItem] },
      })
      const response = await createFlashCardsHandler(request)

      expect(response.status).toBe(201)
      expect(response.jsonBody?.data[0]).toMatchObject({
        type: 'multiple_choice',
        correctAnswer: ['o1', 'o3'],
      })
    })

    it('returns 400 when items missing', async () => {
      setup()
      const request = mockRequest({
        method: 'POST',
        body: { companyId: 'c1' },
      })
      const response = await createFlashCardsHandler(request)

      expect(response.status).toBe(400)
    })

    it('returns 400 with invalid type', async () => {
      setup()
      const request = mockRequest({
        method: 'POST',
        body: {
          companyId: 'c1',
          items: [{ ...validSingleChoiceItem, type: 'text' }],
        },
      })
      const response = await createFlashCardsHandler(request)

      expect(response.status).toBe(400)
    })

    it('returns 400 when correctAnswer missing', async () => {
      setup()
      const noAnswer = { ...validSingleChoiceItem, correctAnswer: undefined }
      const request = mockRequest({
        method: 'POST',
        body: { companyId: 'c1', items: [noAnswer] },
      })
      const response = await createFlashCardsHandler(request)

      expect(response.status).toBe(400)
    })

    it('returns 403 when manager creates in different company', async () => {
      setup()
      const request = mockRequest({
        method: 'POST',
        body: { companyId: 'other', items: [validSingleChoiceItem] },
      })
      const response = await createFlashCardsHandler(request)

      expect(response.status).toBe(403)
    })
  })

  describe('getFlashCardHandler', () => {
    it('returns 200 when card exists', async () => {
      setup()
      const card = { id: 'fc_1', companyId: 'c1', title: 'Found' }
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [card] }),
      })

      const request = mockRequest({ params: { cardId: 'fc_1' } })
      const response = await getFlashCardHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toEqual(card)
    })

    it('returns 404 when card not found', async () => {
      setup()
      const request = mockRequest({ params: { cardId: 'nope' } })
      const response = await getFlashCardHandler(request)

      expect(response.status).toBe(404)
    })
  })

  describe('updateFlashCardHandler', () => {
    it('returns 200 on update', async () => {
      setup()
      const existing = {
        id: 'fc_1',
        companyId: 'c1',
        type: 'single_choice',
        title: 'Old Title',
        options: [
          { id: 'o1', label: 'A' },
          { id: 'o2', label: 'B' },
        ],
        correctAnswer: 'o1',
        imageId: null,
        categoryId: null,
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
        params: { cardId: 'fc_1' },
        body: { title: 'Updated Title' },
      })
      const response = await updateFlashCardHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toMatchObject({ title: 'Updated Title' })
    })

    it('returns 404 when card not found', async () => {
      setup()
      const request = mockRequest({
        method: 'PUT',
        params: { cardId: 'nope' },
        body: { title: 'X' },
      })
      const response = await updateFlashCardHandler(request)

      expect(response.status).toBe(404)
    })
  })

  describe('deleteFlashCardHandler', () => {
    it('returns 200 on delete', async () => {
      setup()
      const existing = { id: 'fc_1', companyId: 'c1', title: 'To Delete' }
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [existing] }),
      })
      mockContainer.item.mockReturnValue({
        read: vi.fn(),
        replace: vi.fn(),
        delete: vi.fn().mockResolvedValue({}),
      })

      const request = mockRequest({
        method: 'DELETE',
        params: { cardId: 'fc_1' },
      })
      const response = await deleteFlashCardHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toEqual({ id: 'fc_1' })
    })

    it('returns 404 when card not found', async () => {
      setup()
      const request = mockRequest({
        method: 'DELETE',
        params: { cardId: 'nope' },
      })
      const response = await deleteFlashCardHandler(request)

      expect(response.status).toBe(404)
    })
  })
})
