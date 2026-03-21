import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useInfiniteList } from '../../../src/hooks/useInfiniteList'

describe('hooks/useInfiniteList', () => {
  it('flattens pages and fetches the next cursor on demand', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const fetchPage = vi
      .fn()
      .mockImplementation(
        async ({ cursor }: { limit: number; cursor?: string | null }) =>
          cursor === 'cursor_1'
            ? {
                success: true as const,
                data: [{ id: 'page_2' }],
                nextCursor: null,
              }
            : {
                success: true as const,
                data: [{ id: 'page_1' }],
                nextCursor: 'cursor_1',
                total: 2,
              },
      )

    const { result } = renderHook(
      () =>
        useInfiniteList({
          queryKey: ['items'],
          fetchPage,
        }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.items).toEqual([{ id: 'page_1' }])
      expect(result.current.hasNextPage).toBe(true)
    })

    await act(async () => {
      await result.current.fetchNextPage()
    })

    await waitFor(() => {
      expect(result.current.items).toEqual([{ id: 'page_1' }, { id: 'page_2' }])
      expect(result.current.hasNextPage).toBe(false)
    })
    expect(fetchPage).toHaveBeenCalledWith({ limit: 10, cursor: 'cursor_1' })
  })
})
