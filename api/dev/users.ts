import { app, type HttpResponseInit } from '@azure/functions'
import { getContainer } from '../shared/cosmos.js'
import { jsonResponse } from '../shared/http.js'
import { isDevMode } from './utils.js'

interface DevUser {
  id: string
  email: string
  firstName: string
  lastName: string
  companyId?: string
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
    // Fetch admins
    const adminsContainer = await getContainer('admins', '/id')
    const { resources: admins } = await adminsContainer.items
      .query({
        query: 'SELECT c.id, c.email, c.firstName, c.lastName FROM c',
      })
      .fetchAll()

    // Fetch managers
    const managersContainer = await getContainer('managers', '/companyId')
    const { resources: managers } = await managersContainer.items
      .query({
        query:
          'SELECT c.id, c.email, c.firstName, c.lastName, c.companyId FROM c WHERE c.isActive = true',
      })
      .fetchAll()

    // Fetch employees
    const employeesContainer = await getContainer('employees', '/companyId')
    const { resources: employees } = await employeesContainer.items
      .query({
        query:
          'SELECT c.id, c.email, c.firstName, c.lastName, c.companyId FROM c WHERE c.isActive = true',
      })
      .fetchAll()

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
