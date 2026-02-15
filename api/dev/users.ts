import { app, type HttpResponseInit } from '@azure/functions'
import { getContainer } from '../shared/cosmos.js'
import { jsonResponse } from '../shared/http.js'
import { isDevMode } from './utils.js'
import {
  USERS_CONTAINER,
  USERS_PARTITION_KEY,
  ADMINS_CONTAINER,
  ADMINS_PARTITION_KEY,
} from '../shared/userTypes.js'

interface DevUser {
  id: string
  email: string
  firstName: string
  lastName: string
  companyId?: string
  role?: string
}

/**
 * GET /api/dev/users
 * Returns all users grouped by role for dev login.
 * Only works when DEV_MODE is enabled.
 */
export const getDevUsersHandler = async (): Promise<HttpResponseInit> => {
  // Only allow in dev environment
  if (!isDevMode()) {
    return jsonResponse(403, {
      success: false,
      error: 'Dev endpoints are only available in development environment.',
    })
  }

  try {
    // Fetch admins (separate container)
    const adminsContainer = await getContainer(ADMINS_CONTAINER, ADMINS_PARTITION_KEY)
    const { resources: admins } = await adminsContainer.items
      .query({
        query: 'SELECT c.id, c.email, c.firstName, c.lastName FROM c',
      })
      .fetchAll()

    // Fetch all company users from unified container, then split by role
    const usersContainer = await getContainer(USERS_CONTAINER, USERS_PARTITION_KEY)
    const { resources: allUsers } = await usersContainer.items
      .query({
        query:
          'SELECT c.id, c.email, c.firstName, c.lastName, c.companyId, c.role FROM c WHERE c.isActive = true',
      })
      .fetchAll()

    // Split users by role
    const managers = allUsers.filter((u: DevUser) => u.role === 'manager')
    const employees = allUsers.filter((u: DevUser) => u.role === 'employee')

    return jsonResponse(200, {
      success: true,
      data: {
        admins: admins as DevUser[],
        managers: managers as DevUser[],
        employees: employees as DevUser[],
      },
    })
  } catch (error) {
    console.error('Failed to fetch dev users:', error)
    return jsonResponse(500, {
      success: false,
      error: 'Failed to fetch users.',
    })
  }
}

app.http('getDevUsers', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'dev/users',
  handler: getDevUsersHandler,
})
