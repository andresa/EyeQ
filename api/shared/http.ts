import type { HttpResponseInit, HttpRequest } from '@azure/functions'

export interface ApiResult<T> {
  success: boolean
  data?: T
  error?: string
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

export const parseJsonBody = async <T>(request: HttpRequest): Promise<T | null> => {
  try {
    return (await request.json()) as T
  } catch {
    return null
  }
}
