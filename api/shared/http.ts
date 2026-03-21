import type { HttpResponseInit, HttpRequest } from '@azure/functions'
import type { PaginatedResult } from './pagination.js'

export interface ApiResult<T> {
  success: boolean
  data?: T
  error?: string
}

export interface PaginatedApiResult<T> extends ApiResult<T[]> {
  nextCursor?: string | null
  total?: number
}

export const jsonResponse = <T>(
  status: number,
  payload: ApiResult<T>,
): HttpResponseInit => ({
  status,
  jsonBody: payload,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const paginatedJsonResponse = <T>(
  status: number,
  result: PaginatedResult<T>,
): HttpResponseInit =>
  jsonResponse(status, {
    success: true,
    data: result.items,
    nextCursor: result.nextCursor,
    total: result.total,
  } as PaginatedApiResult<T>)

export const parseJsonBody = async <T>(request: HttpRequest): Promise<T | null> => {
  try {
    return (await request.json()) as T
  } catch {
    return null
  }
}
