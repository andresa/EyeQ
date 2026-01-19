import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions'
import { getContainer } from './cosmos.js'
import { jsonResponse } from './http.js'
import { nowIso } from './utils.js'

interface SwaClientPrincipal {
  identityProvider: string
  userId: string
  userDetails: string
  userRoles: string[]
}

/**
 * Parses the SWA client principal from the request headers.
 * In Azure SWA, the client principal is passed via x-ms-client-principal header
 * as a Base64-encoded JSON string.
 */
function getClientPrincipal(request: HttpRequest): SwaClientPrincipal | null {
  const header = request.headers.get('x-ms-client-principal')
  if (!header) return null

  try {
    const decoded = Buffer.from(header, 'base64').toString('utf-8')
    return JSON.parse(decoded) as SwaClientPrincipal
  } catch {
    return null
  }
}

/**
 * GET /api/shared/me
 * Returns the current user's profile based on their SWA authentication.
 * Looks up user in employees or employers table by email.
 * Updates lastLogin timestamp on each call.
 */
export const meHandler = async (request: HttpRequest): Promise<HttpResponseInit> => {
  const clientPrincipal = getClientPrincipal(request)

  if (!clientPrincipal) {
    return jsonResponse(401, { success: false, error: 'Not authenticated.' })
  }

  const email = clientPrincipal.userDetails?.toLowerCase()
  if (!email) {
    return jsonResponse(400, {
      success: false,
      error: 'Email not found in authentication.',
    })
  }

  const now = nowIso()

  // First, try to find the user in the admins table
  const adminsContainer = await getContainer('admins', '/id')
  const { resources: admins } = await adminsContainer.items
    .query({
      query: 'SELECT * FROM c WHERE LOWER(c.email) = @email',
      parameters: [{ name: '@email', value: email }],
    })
    .fetchAll()

  if (admins.length > 0) {
    const admin = admins[0]

    // Update lastLogin
    const updated = { ...admin, lastLogin: now }
    await adminsContainer.item(admin.id, admin.id).replace(updated)

    return jsonResponse(200, {
      success: true,
      data: {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: 'admin',
        lastLogin: now,
        userType: 'admin',
      },
    })
  }

  // Try to find the user in the employers table
  const employersContainer = await getContainer('employers', '/companyId')
  const { resources: employers } = await employersContainer.items
    .query({
      query: 'SELECT * FROM c WHERE LOWER(c.email) = @email',
      parameters: [{ name: '@email', value: email }],
    })
    .fetchAll()

  if (employers.length > 0) {
    const employer = employers[0]

    // Update lastLogin
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

  // Try to find the user in the employees table
  const employeesContainer = await getContainer('employees', '/companyId')
  const { resources: employees } = await employeesContainer.items
    .query({
      query: 'SELECT * FROM c WHERE LOWER(c.email) = @email',
      parameters: [{ name: '@email', value: email }],
    })
    .fetchAll()

  if (employees.length > 0) {
    const employee = employees[0]

    // Update lastLogin
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

  // User not found in either table
  return jsonResponse(404, {
    success: false,
    error: 'User not found. Please contact your administrator to create your account.',
  })
}

app.http('sharedMe', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'shared/me',
  handler: meHandler,
})
