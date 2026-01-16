import { app, type HttpResponseInit } from '@azure/functions'
import { jsonResponse } from './http.js'

export const healthHandler = async (): Promise<HttpResponseInit> =>
  jsonResponse(200, { success: true, data: { status: 'ok' } })

app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'shared/health',
  handler: healthHandler,
})
