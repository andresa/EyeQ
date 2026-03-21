import { useInfiniteQuery, type QueryKey } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { PaginatedResponse } from '../types'

const DEFAULT_STALE_TIME = 5 * 60 * 1000

interface UseInfiniteListOptions<T> {
  queryKey: QueryKey
  fetchPage: (params: {
    limit: number
    cursor?: string | null
  }) => Promise<PaginatedResponse<T>>
  pageSize?: number
  enabled?: boolean
  filters?: Record<string, unknown>
  staleTime?: number
  rootMargin?: string
}

interface UseInfiniteListResult<T> {
  items: T[]
  total?: number
  isLoading: boolean
  isFetching: boolean
  isFetchingNextPage: boolean
  hasNextPage: boolean
  fetchNextPage: () => Promise<unknown>
  refetch: () => Promise<unknown>
  sentinelRef: (node: HTMLDivElement | null) => void
}

export const useInfiniteList = <T>({
  queryKey,
  fetchPage,
  pageSize = 10,
  enabled = true,
  filters,
  staleTime = DEFAULT_STALE_TIME,
  rootMargin = '200px',
}: UseInfiniteListOptions<T>): UseInfiniteListResult<T> => {
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const filterKey = useMemo(() => JSON.stringify(filters ?? {}), [filters])
  const setSentinelRef = useCallback((node: HTMLDivElement | null) => {
    sentinelRef.current = node
  }, [])

  const query = useInfiniteQuery({
    queryKey: [...queryKey, { pageSize, filterKey }],
    queryFn: ({ pageParam }) =>
      fetchPage({
        limit: pageSize,
        cursor: typeof pageParam === 'string' ? pageParam : undefined,
      }),
    enabled,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime,
  })

  const { hasNextPage, isFetchingNextPage, fetchNextPage: fetchNext } = query

  useEffect(() => {
    const node = sentinelRef.current
    if (
      typeof IntersectionObserver === 'undefined' ||
      !node ||
      !hasNextPage ||
      isFetchingNextPage
    ) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNext()
        }
      },
      { rootMargin },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [fetchNext, hasNextPage, isFetchingNextPage, rootMargin])

  return {
    items: query.data?.pages.flatMap((page) => page.data ?? []) ?? [],
    total: query.data?.pages[0]?.total,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: Boolean(query.hasNextPage),
    fetchNextPage: () => query.fetchNextPage(),
    refetch: () => query.refetch(),
    sentinelRef: setSentinelRef,
  }
}
