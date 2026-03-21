import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { usePaginatedQuery } from '../../../src/hooks/usePaginatedQuery'

describe('hooks/usePaginatedQuery', () => {
  it('uses the next cursor when moving forward and resets to page 1 on filter changes', async () => {
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

    const { result, rerender } = renderHook(
      ({ filters }: { filters: Record<string, string | undefined> }) =>
        usePaginatedQuery({
          queryKey: ['items'],
          filters,
          pageSize: 1,
          fetchPage,
        }),
      {
        initialProps: { filters: { search: undefined as string | undefined } },
        wrapper,
      },
    )

    await waitFor(() => {
      expect(result.current.data).toEqual([{ id: 'page_1' }])
    })

    await act(async () => {
      await result.current.setPage(2)
    })

    await waitFor(() => {
      expect(result.current.currentPage).toBe(2)
      expect(result.current.data).toEqual([{ id: 'page_2' }])
    })
    expect(fetchPage).toHaveBeenCalledWith({ limit: 1, cursor: 'cursor_1' })

    rerender({ filters: { search: 'alice' } })

    await waitFor(() => {
      expect(result.current.currentPage).toBe(1)
      expect(result.current.data).toEqual([{ id: 'page_1' }])
    })
  })
})
