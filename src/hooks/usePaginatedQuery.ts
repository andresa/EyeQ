import { useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { TablePaginationConfig } from 'antd'
import type { PaginatedResponse } from '../types'

const DEFAULT_STALE_TIME = 5 * 60 * 1000

interface UsePaginatedQueryOptions<T> {
  queryKey: QueryKey
  fetchPage: (params: {
    limit: number
    cursor?: string | null
  }) => Promise<PaginatedResponse<T>>
  pageSize?: number
  enabled?: boolean
  filters?: Record<string, unknown>
  staleTime?: number
}

interface UsePaginatedQueryResult<T> {
  data: T[]
  response: PaginatedResponse<T> | undefined
  isLoading: boolean
  isFetching: boolean
  error: unknown
  refetch: () => Promise<unknown>
  currentPage: number
  pagination: TablePaginationConfig
  setPage: (page: number) => Promise<void>
}

const buildPageQueryKey = (
  queryKey: QueryKey,
  page: number,
  pageSize: number,
  filterKey: string,
): QueryKey => [...queryKey, { page, pageSize, filterKey }]

export const usePaginatedQuery = <T>({
  queryKey,
  fetchPage,
  pageSize = 10,
  enabled = true,
  filters,
  staleTime = DEFAULT_STALE_TIME,
}: UsePaginatedQueryOptions<T>): UsePaginatedQueryResult<T> => {
  const queryClient = useQueryClient()
  const [currentPage, setCurrentPage] = useState(1)
  const [isResolvingPage, setIsResolvingPage] = useState(false)
  const baseQueryKey = useMemo(() => JSON.stringify(queryKey), [queryKey])
  const filterKey = useMemo(() => JSON.stringify(filters ?? {}), [filters])
  const scopeKey = `${baseQueryKey}:${filterKey}`
  const cursorByPageRef = useRef(
    new Map<number, string | null | undefined>([[1, undefined]]),
  )
  const totalRef = useRef<number | undefined>(undefined)
  const scopeKeyRef = useRef(scopeKey)
  const hasMountedRef = useRef(false)

  const scopeChanged = scopeKeyRef.current !== scopeKey
  if (scopeChanged) {
    scopeKeyRef.current = scopeKey
    cursorByPageRef.current = new Map([[1, undefined]])
    totalRef.current = undefined
  }

  const page = scopeChanged ? 1 : currentPage

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      return
    }
    setCurrentPage(1)
  }, [scopeKey])

  const rememberPage = useCallback((page: number, response: PaginatedResponse<T>) => {
    if (response.total != null) {
      totalRef.current = response.total
    }

    if (response.nextCursor) {
      cursorByPageRef.current.set(page + 1, response.nextCursor)
    }
  }, [])

  const ensurePageCursor = useCallback(
    async (targetPage: number) => {
      if (targetPage <= 1 || cursorByPageRef.current.has(targetPage)) {
        return
      }

      setIsResolvingPage(true)
      try {
        let pageToResolve = 1

        while (pageToResolve < targetPage) {
          if (cursorByPageRef.current.has(pageToResolve + 1)) {
            pageToResolve += 1
            continue
          }

          const cursor = cursorByPageRef.current.get(pageToResolve)
          const response = await queryClient.fetchQuery({
            queryKey: buildPageQueryKey(queryKey, pageToResolve, pageSize, filterKey),
            queryFn: () => fetchPage({ limit: pageSize, cursor }),
            staleTime,
          })

          rememberPage(pageToResolve, response)

          if (!response.nextCursor) {
            break
          }

          pageToResolve += 1
        }
      } finally {
        setIsResolvingPage(false)
      }
    },
    [fetchPage, filterKey, pageSize, queryClient, queryKey, rememberPage, staleTime],
  )

  const query = useQuery({
    queryKey: buildPageQueryKey(queryKey, page, pageSize, filterKey),
    queryFn: () =>
      fetchPage({
        limit: pageSize,
        cursor: cursorByPageRef.current.get(page),
      }),
    enabled: enabled && cursorByPageRef.current.has(page),
    staleTime,
  })

  useEffect(() => {
    if (query.data) {
      rememberPage(page, query.data)
    }
  }, [page, query.data, rememberPage])

  const goToPage = useCallback(
    async (targetPage: number) => {
      if (targetPage === page || targetPage < 1) {
        return
      }

      const total = totalRef.current
      if (total != null && targetPage > Math.max(1, Math.ceil(total / pageSize))) {
        return
      }

      if (targetPage > page && !cursorByPageRef.current.has(targetPage)) {
        await ensurePageCursor(targetPage)
      }

      if (targetPage === 1 || cursorByPageRef.current.has(targetPage)) {
        setCurrentPage(targetPage)
      }
    },
    [ensurePageCursor, page, pageSize],
  )

  const total = query.data?.total ?? totalRef.current ?? query.data?.data?.length ?? 0

  const pagination = useMemo<TablePaginationConfig>(
    () => ({
      current: page,
      pageSize,
      total,
      showSizeChanger: false,
      onChange: (page) => {
        void goToPage(page)
      },
    }),
    [goToPage, page, pageSize, total],
  )

  return {
    data: query.data?.data ?? [],
    response: query.data,
    isLoading: query.isLoading || isResolvingPage,
    isFetching: query.isFetching || isResolvingPage,
    error: query.error,
    refetch: () => query.refetch(),
    currentPage: page,
    pagination,
    setPage: goToPage,
  }
}
