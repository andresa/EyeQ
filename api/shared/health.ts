import { app, type HttpResponseInit } from '@azure/functions'
import { jsonResponse } from './http.js'

export const healthHandler = async (): Promise<HttpResponseInit> => {
  // Check which required environment variables are configured (not their values)
  const requiredVars = [
    'ACS_CONNECTION_STRING',
    'ACS_SENDER_ADDRESS',
    'COSMOS_CONNECTION_STRING',
    'COSMOS_DB_NAME',
  ]

  const envStatus: Record<string, boolean | string> = {}
  const missing: string[] = []

  for (const varName of requiredVars) {
    const isSet = !!process.env[varName]
    envStatus[varName] = isSet
    if (!isSet) {
      missing.push(varName)
    }
  }

  // Show APP_BASE_URL value since it has a fallback default
  envStatus.APP_BASE_URL = process.env.APP_BASE_URL || '(not set, using default)'

  return jsonResponse(200, {
    success: true,
    data: {
      status: missing.length === 0 ? 'ok' : 'missing_config',
      missing: missing.length > 0 ? missing : undefined,
      env: envStatus,
    },
  })
}

app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'shared/health',
  handler: healthHandler,
})
