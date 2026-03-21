import { describe, expect, it, vi } from 'vitest'
import { createMockContainer } from '../../helpers/api-helpers'
import { paginatedQuery } from '../../../api/shared/pagination'

describe('shared/pagination', () => {
  it('returns encoded next cursor and total on the first page', async () => {
    const { container } = createMockContainer()
    const fetchNext = vi
      .fn()
      .mockResolvedValue({ resources: [{ id: 'one' }], continuationToken: 'token-1' })
    const fetchAll = vi.fn().mockResolvedValue({ resources: [24] })

    container.items.query
      .mockReturnValueOnce({ fetchNext })
      .mockReturnValueOnce({ fetchAll })

    const result = await paginatedQuery(
      container as never,
      { query: 'SELECT * FROM c', parameters: [] },
      {
        limit: '10',
        countQuery: 'SELECT VALUE COUNT(1) FROM c',
        partitionKey: 'company_1',
      },
    )

    expect(result.items).toEqual([{ id: 'one' }])
    expect(result.total).toBe(24)
    expect(result.nextCursor).toBe(Buffer.from('token-1', 'utf8').toString('base64url'))
    expect(container.items.query).toHaveBeenNthCalledWith(
      1,
      { query: 'SELECT * FROM c', parameters: [] },
      { maxItemCount: 10, partitionKey: 'company_1' },
    )
    expect(container.items.query).toHaveBeenNthCalledWith(
      2,
      'SELECT VALUE COUNT(1) FROM c',
      { partitionKey: 'company_1' },
    )
  })

  it('decodes the incoming cursor and skips the count query on later pages', async () => {
    const { container } = createMockContainer()
    const encodedCursor = Buffer.from('token-2', 'utf8').toString('base64url')
    const fetchNext = vi
      .fn()
      .mockResolvedValue({ resources: [{ id: 'two' }], continuationToken: null })

    container.items.query.mockReturnValueOnce({ fetchNext })

    const result = await paginatedQuery(container as never, 'SELECT * FROM c', {
      limit: 5,
      cursor: encodedCursor,
    })

    expect(result.items).toEqual([{ id: 'two' }])
    expect(result.total).toBeUndefined()
    expect(result.nextCursor).toBeNull()
    expect(container.items.query).toHaveBeenCalledOnce()
    expect(container.items.query).toHaveBeenCalledWith('SELECT * FROM c', {
      maxItemCount: 5,
      continuationToken: 'token-2',
    })
  })
})
