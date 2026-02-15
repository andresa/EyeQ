import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions'
import { getContainer } from './cosmos.js'
import { jsonResponse } from './http.js'
import { nowIso } from './utils.js'
import { getAuthenticatedUser } from './auth.js'
import {
  USERS_CONTAINER,
  USERS_PARTITION_KEY,
  ADMINS_CONTAINER,
  ADMINS_PARTITION_KEY,
} from './userTypes.js'

/**
 * GET /api/shared/me
 * Returns the current user's profile based on their session token.
 * Updates lastLogin timestamp on each call.
 */
export const meHandler = async (request: HttpRequest): Promise<HttpResponseInit> => {
  const user = await getAuthenticatedUser(request)

  if (!user) {
    return jsonResponse(401, { success: false, error: 'Not authenticated.' })
  }

  const now = nowIso()

  // Update lastLogin based on user type
  if (user.userType === 'admin') {
    const adminsContainer = await getContainer(ADMINS_CONTAINER, ADMINS_PARTITION_KEY)
    const { resource: admin } = await adminsContainer.item(user.id, user.id).read()
    if (admin) {
      const updated = { ...admin, lastLogin: now }
      await adminsContainer.item(admin.id, admin.id).replace(updated)
    }

    return jsonResponse(200, {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: 'admin',
        lastLogin: now,
        userType: 'admin',
      },
    })
  }

  // Handle both managers and employees from the unified users container
  if (user.userType === 'manager' || user.userType === 'employee') {
    const usersContainer = await getContainer(USERS_CONTAINER, USERS_PARTITION_KEY)
    const { resources: users } = await usersContainer.items
      .query({
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: user.id }],
      })
      .fetchAll()

    if (users.length > 0) {
      const companyUser = users[0]
      const updated = { ...companyUser, lastLogin: now }
      await usersContainer.item(companyUser.id, companyUser.companyId).replace(updated)

      // Get company name
      const companiesContainer = await getContainer('companies', '/id')
      const { resource: company } = await companiesContainer
        .item(companyUser.companyId, companyUser.companyId)
        .read()

      return jsonResponse(200, {
        success: true,
        data: {
          id: companyUser.id,
          email: companyUser.email,
          firstName: companyUser.firstName,
          lastName: companyUser.lastName,
          role: companyUser.role || user.userType,
          companyId: companyUser.companyId,
          companyName: company?.name,
          lastLogin: now,
          userType: user.userType,
        },
      })
    }
  }

  // User not found
  return jsonResponse(404, {
    success: false,
    error: 'User not found. Please contact your administrator.',
  })
}

app.http('sharedMe', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'shared/me',
  handler: meHandler,
})
