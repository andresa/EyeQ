import { describe, it, expect } from 'vitest'
import {
  jsonResponse,
  paginatedJsonResponse,
  parseJsonBody,
} from '../../../api/shared/http'
import type { HttpRequest } from '@azure/functions'

describe('shared/http', () => {
  describe('jsonResponse', () => {
    it('builds a 200 success response', () => {
      const response = jsonResponse(200, { success: true, data: { id: '1' } })

      expect(response.status).toBe(200)
      expect(response.jsonBody).toEqual({ success: true, data: { id: '1' } })
      expect((response.headers as Record<string, string>)?.['Content-Type']).toBe(
        'application/json',
      )
    })

    it('builds a 400 error response', () => {
      const response = jsonResponse(400, { success: false, error: 'Bad request' })

      expect(response.status).toBe(400)
      expect(response.jsonBody).toEqual({ success: false, error: 'Bad request' })
    })

    it('builds a 201 response with data', () => {
      const response = jsonResponse(201, { success: true, data: [1, 2, 3] })

      expect(response.status).toBe(201)
      expect(response.jsonBody?.data).toEqual([1, 2, 3])
    })

    it('builds a paginated response with cursor metadata', () => {
      const response = paginatedJsonResponse(200, {
        items: [{ id: '1' }],
        nextCursor: 'cursor_1',
        total: 25,
      })

      expect(response.status).toBe(200)
      expect(response.jsonBody).toEqual({
        success: true,
        data: [{ id: '1' }],
        nextCursor: 'cursor_1',
        total: 25,
      })
    })
  })

  describe('parseJsonBody', () => {
    it('parses valid JSON body', async () => {
      const request = {
        json: async () => ({ name: 'Test' }),
      } as unknown as HttpRequest

      const result = await parseJsonBody<{ name: string }>(request)

      expect(result).toEqual({ name: 'Test' })
    })

    it('returns null when JSON parsing fails', async () => {
      const request = {
        json: async () => {
          throw new Error('invalid')
        },
      } as unknown as HttpRequest

      const result = await parseJsonBody(request)

      expect(result).toBeNull()
    })
  })
})
