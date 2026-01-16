import type { ApiResponse } from '../types'

const API_BASE = '/api'

const parseJsonSafely = <T>(text: string): ApiResponse<T> | null => {
  try {
    return JSON.parse(text) as ApiResponse<T>
  } catch {
    return null
  }
}

const handleResponse = async <T>(response: Response): Promise<ApiResponse<T>> => {
  const text = await response.text()
  if (!text) {
    return {
      success: false,
      error: response.ok
        ? 'Empty response from server.'
        : `Request failed with status ${response.status}.`,
    }
  }

  const data = parseJsonSafely<T>(text)
  if (!data) {
    return { success: false, error: 'Invalid response from server.' }
  }

  if (!response.ok || !data.success) {
    const errorMessage =
      data.error || `Request failed with status ${response.status}.`
    return { success: false, error: errorMessage }
  }
  return data
}

export const apiRequest = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> => {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    })

    return handleResponse<T>(response)
  } catch {
    return { success: false, error: 'Network error. Please try again.' }
  }
}
