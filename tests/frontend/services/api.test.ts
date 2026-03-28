import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getSessionToken,
  setSessionToken,
  clearSessionToken,
  apiRequest,
} from '../../../src/services/api'

describe('services/api', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  describe('session token management', () => {
    it('getSessionToken returns null when no token', () => {
      expect(getSessionToken()).toBeNull()
    })

    it('setSessionToken stores token and getSessionToken retrieves it', () => {
      setSessionToken('test-token')
      expect(getSessionToken()).toBe('test-token')
    })

    it('clearSessionToken removes the token', () => {
      setSessionToken('test-token')
      clearSessionToken()
      expect(getSessionToken()).toBeNull()
    })
  })

  describe('apiRequest', () => {
    it('sends request with X-Session-Token header', async () => {
      setSessionToken('my-token')
      const mockResponse = { success: true, data: { id: '1' } }
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockResponse),
      } as Response)

      const result = await apiRequest('/test-path')

      expect(fetch).toHaveBeenCalledWith(
        '/api/test-path',
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-Session-Token': 'my-token' }),
        }),
      )
      expect(result).toEqual(mockResponse)
    })

    it('handles network error gracefully', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network failure'))

      const result = await apiRequest('/test')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error. Please try again.')
    })

    it('handles non-OK response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({ success: false, error: 'Server error' }),
      } as Response)

      const result = await apiRequest('/test')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Server error')
    })

    it('handles empty response body', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        text: async () => '',
      } as Response)

      const result = await apiRequest('/test')

      expect(result.success).toBe(false)
    })

    it('handles invalid JSON response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        text: async () => 'not json',
      } as Response)

      const result = await apiRequest('/test')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid response from server.')
    })

    it('sends POST with body', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ success: true, data: null }),
      } as Response)

      await apiRequest('/test', { method: 'POST', body: JSON.stringify({ name: 'A' }) })

      expect(fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({ method: 'POST', body: '{"name":"A"}' }),
      )
    })

    it('dispatches session-expired event on 401 response', async () => {
      const handler = vi.fn()
      window.addEventListener('session-expired', handler)

      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 401,
        text: async () =>
          JSON.stringify({ success: false, error: 'Session expired or invalid.' }),
      } as Response)

      const result = await apiRequest('/test')

      expect(result.success).toBe(false)
      expect(handler).toHaveBeenCalledOnce()
      expect(getSessionToken()).toBeNull()

      window.removeEventListener('session-expired', handler)
    })

    it('dispatches session-expired event on 403 with ACCOUNT_DEACTIVATED code', async () => {
      setSessionToken('my-token')
      const handler = vi.fn()
      window.addEventListener('session-expired', handler)

      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 403,
        text: async () =>
          JSON.stringify({
            success: false,
            error: 'Your account has been deactivated.',
            code: 'ACCOUNT_DEACTIVATED',
          }),
      } as Response)

      const result = await apiRequest('/test')

      expect(result.success).toBe(false)
      expect(handler).toHaveBeenCalledOnce()
      expect(getSessionToken()).toBeNull()

      window.removeEventListener('session-expired', handler)
    })

    it('does not dispatch session-expired event for other 403 errors', async () => {
      setSessionToken('my-token')
      const handler = vi.fn()
      window.addEventListener('session-expired', handler)

      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 403,
        text: async () =>
          JSON.stringify({ success: false, error: 'You do not have permission.' }),
      } as Response)

      const result = await apiRequest('/test')

      expect(result.success).toBe(false)
      expect(handler).not.toHaveBeenCalled()
      expect(getSessionToken()).toBe('my-token')

      window.removeEventListener('session-expired', handler)
    })
  })
})
