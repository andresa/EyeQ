import type { ApiResponse } from '../types'

const API_BASE = '/api'
const SESSION_TOKEN_KEY = 'eyeq_session_token'

/**
 * Get the session token from localStorage.
 */
export const getSessionToken = (): string | null => {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY)
  } catch {
    return null
  }
}

/**
 * Set the session token in localStorage.
 */
export const setSessionToken = (token: string): void => {
  try {
    localStorage.setItem(SESSION_TOKEN_KEY, token)
    // Debug: verify token was saved
    const saved = localStorage.getItem(SESSION_TOKEN_KEY)
    if (saved !== token) {
      console.error('[setSessionToken] Token mismatch after save!', {
        expected: token.substring(0, 10),
        got: saved?.substring(0, 10),
      })
    } else {
      console.log(
        '[setSessionToken] Token saved successfully:',
        token.substring(0, 10) + '...',
      )
    }
  } catch (e) {
    console.error('Failed to save session token', e)
  }
}

/**
 * Remove the session token from localStorage.
 */
export const clearSessionToken = (): void => {
  try {
    localStorage.removeItem(SESSION_TOKEN_KEY)
  } catch {
    console.error('Failed to clear session token')
  }
}

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
    const errorMessage = data.error || `Request failed with status ${response.status}.`
    return { success: false, error: errorMessage }
  }
  return data
}

export const apiRequest = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> => {
  try {
    const token = getSessionToken()
    // Debug logging
    console.log(`[apiRequest] ${options.method || 'GET'} ${path}`, {
      hasToken: !!token,
      tokenPrefix: token?.substring(0, 10),
    })

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Merge any existing headers from options
    if (options.headers) {
      const optHeaders = options.headers as Record<string, string>
      Object.assign(headers, optHeaders)
    }

    // Add session token header if we have one
    // Using X-Session-Token instead of Authorization because Azure Static Web Apps
    // intercepts/strips the Authorization header for its own auth system
    if (token) {
      headers['X-Session-Token'] = token
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    })

    const result = await handleResponse<T>(response)

    // Debug: log if auth failed
    if (!response.ok && response.status === 401) {
      console.error(`[apiRequest] 401 on ${path}`, {
        tokenWasSent: !!token,
        error: result.error,
      })
    }

    return result
  } catch (e) {
    console.error(`[apiRequest] Error on ${path}`, e)
    return { success: false, error: 'Network error. Please try again.' }
  }
}
