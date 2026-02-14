import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions'
import { getContainer } from './cosmos.js'
import { jsonResponse } from './http.js'
import { nowIso } from './utils.js'
import { getAuthenticatedUser } from './auth.js'

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
    const adminsContainer = await getContainer('admins', '/id')
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

  if (user.userType === 'employer') {
    const employersContainer = await getContainer('employers', '/companyId')
    const { resources: employers } = await employersContainer.items
      .query({
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: user.id }],
      })
      .fetchAll()

    if (employers.length > 0) {
      const employer = employers[0]
      const updated = { ...employer, lastLogin: now }
      await employersContainer.item(employer.id, employer.companyId).replace(updated)

      // Get company name
      const companiesContainer = await getContainer('companies', '/id')
      const { resource: company } = await companiesContainer
        .item(employer.companyId, employer.companyId)
        .read()

      return jsonResponse(200, {
        success: true,
        data: {
          id: employer.id,
          email: employer.email,
          firstName: employer.firstName,
          lastName: employer.lastName,
          role: employer.role || 'employer',
          companyId: employer.companyId,
          companyName: company?.name,
          lastLogin: now,
          userType: 'employer',
        },
      })
    }
  }

  if (user.userType === 'employee') {
    const employeesContainer = await getContainer('employees', '/companyId')
    const { resources: employees } = await employeesContainer.items
      .query({
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: user.id }],
      })
      .fetchAll()

    if (employees.length > 0) {
      const employee = employees[0]
      const updated = { ...employee, lastLogin: now }
      await employeesContainer.item(employee.id, employee.companyId).replace(updated)

      // Get company name
      const companiesContainer = await getContainer('companies', '/id')
      const { resource: company } = await companiesContainer
        .item(employee.companyId, employee.companyId)
        .read()

      return jsonResponse(200, {
        success: true,
        data: {
          id: employee.id,
          email: employee.email,
          firstName: employee.firstName,
          lastName: employee.lastName,
          role: employee.role || 'employee',
          companyId: employee.companyId,
          companyName: company?.name,
          lastLogin: now,
          userType: 'employee',
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
