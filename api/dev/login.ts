import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions'
import { getContainer } from '../shared/cosmos.js'
import { jsonResponse, parseJsonBody } from '../shared/http.js'
import { createSession } from '../shared/auth.js'
import { isDevMode } from './utils.js'

type UserType = 'admin' | 'manager' | 'employee'

interface DevLoginRequest {
  userId: string
  userType: UserType
}

/**
 * POST /api/dev/login
 * Creates a session for a specified user (dev only).
 * Only works when DEV_MODE is enabled.
 */
export const devLoginHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  // Only allow in dev environment
  if (!isDevMode()) {
    return jsonResponse(403, {
      success: false,
      error: 'Dev endpoints are only available in development environment.',
    })
  }

  const body = await parseJsonBody<DevLoginRequest>(request)

  if (!body?.userId || !body?.userType) {
    return jsonResponse(400, {
      success: false,
      error: 'userId and userType are required.',
    })
  }

  const { userId, userType } = body

  try {
    // Find the user based on type
    let user: Record<string, unknown> | null = null

    if (userType === 'admin') {
      const container = await getContainer('admins', '/id')
      const { resource } = await container.item(userId, userId).read()
      user = resource
    } else if (userType === 'manager') {
      const container = await getContainer('managers', '/companyId')
      const { resources } = await container.items
        .query({
          query: 'SELECT * FROM c WHERE c.id = @id',
          parameters: [{ name: '@id', value: userId }],
        })
        .fetchAll()
      user = resources[0] || null
    } else if (userType === 'employee') {
      const container = await getContainer('employees', '/companyId')
      const { resources } = await container.items
        .query({
          query: 'SELECT * FROM c WHERE c.id = @id',
          parameters: [{ name: '@id', value: userId }],
        })
        .fetchAll()
      user = resources[0] || null
    }

    if (!user) {
      return jsonResponse(404, {
        success: false,
        error: 'User not found.',
      })
    }

    // Create session
    const session = await createSession(user.id as string, userType, user.email as string)

    // Get company name if applicable
    let companyName: string | undefined
    if (user.companyId) {
      const companiesContainer = await getContainer('companies', '/id')
      const { resource: company } = await companiesContainer
        .item(user.companyId as string, user.companyId as string)
        .read()
      companyName = company?.name
    }

    return jsonResponse(200, {
      success: true,
      data: {
        token: session.token,
        expiresAt: session.expiresAt,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role || userType,
          companyId: user.companyId || '',
          companyName,
          userType,
        },
      },
    })
  } catch (error) {
    console.error('Dev login failed:', error)
    return jsonResponse(500, {
      success: false,
      error: 'Failed to create session.',
    })
  }
}

app.http('devLogin', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'dev/login',
  handler: devLoginHandler,
})
