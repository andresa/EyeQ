import { app, type HttpResponseInit } from '@azure/functions'
import { jsonResponse } from '../shared/http.js'
import { isDevMode } from './utils.js'

/**
 * GET /api/dev/status
 * Returns whether dev features are enabled.
 * This endpoint always responds (even in production) so the frontend
 * can determine whether to show dev login options.
 */
export const getDevStatusHandler = async (): Promise<HttpResponseInit> => {
  return jsonResponse(200, {
    success: true,
    data: {
      devMode: isDevMode(),
    },
  })
}

app.http('getDevStatus', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'dev/status',
  handler: getDevStatusHandler,
})
