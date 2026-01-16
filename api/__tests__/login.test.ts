/** @jest-environment node */
import { jest } from '@jest/globals'
import type { HttpRequest } from '@azure/functions'

const queryMock = jest.fn()
const createMock = jest.fn()
const mockContainer = {
  items: {
    query: () => ({
      fetchAll: queryMock,
    }),
    create: createMock,
  },
}

jest.unstable_mockModule('../shared/cosmos', () => ({
  getContainer: jest.fn().mockResolvedValue(mockContainer),
}))

const { loginHandler } = await import('../shared/login')

describe('login API', () => {
  beforeEach(() => {
    queryMock.mockReset()
    createMock.mockReset()
  })

  it('returns existing user when found', async () => {
    queryMock.mockResolvedValue({ resources: [{ id: 'user_1', email: 'a@b.com' }] })
    const response = await loginHandler({
      json: async () => ({ email: 'a@b.com' }),
    } as unknown as HttpRequest)
    expect(response.status).toBe(200)
    expect(createMock).not.toHaveBeenCalled()
  })

  it('creates user when not found', async () => {
    queryMock.mockResolvedValue({ resources: [] })
    const response = await loginHandler({
      json: async () => ({ email: 'new@b.com' }),
    } as unknown as HttpRequest)
    expect(response.status).toBe(200)
    expect(createMock).toHaveBeenCalled()
  })
})
