/** @jest-environment node */
import { jest } from '@jest/globals'
import type { HttpRequest } from '@azure/functions'

const createMockContainer = () => ({
  items: {
    create: jest.fn(),
    query: jest.fn().mockReturnValue({
      fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
    }),
  },
  item: jest.fn().mockReturnValue({
    read: jest.fn().mockResolvedValue({ resource: null }),
    replace: jest.fn(),
  }),
})

const mockContainer = createMockContainer()

jest.unstable_mockModule('../shared/cosmos', () => ({
  getContainer: jest.fn().mockResolvedValue(mockContainer),
}))

const { createCompanyHandler } = await import('../admin/companies')

describe('admin companies API', () => {
  it('returns 400 when name is missing', async () => {
    const response = await createCompanyHandler({
      json: async () => ({}),
    } as unknown as HttpRequest)
    expect(response.status).toBe(400)
  })

  it('creates a company when payload is valid', async () => {
    const response = await createCompanyHandler({
      json: async () => ({ name: 'Acme Corp' }),
    } as unknown as HttpRequest)
    expect(response.status).toBe(201)
    expect(mockContainer.items.create).toHaveBeenCalled()
  })
})
