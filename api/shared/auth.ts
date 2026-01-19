import type { HttpRequest, HttpResponseInit } from '@azure/functions'
import { getContainer } from './cosmos.js'
import { jsonResponse } from './http.js'

type UserRole = 'employee' | 'employer' | 'admin'

interface SwaClientPrincipal {
  identityProvider: string
  userId: string
  userDetails: string
  userRoles: string[]
}

export interface AuthenticatedUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  companyId: string
  userType: 'employee' | 'employer'
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
 * Gets the authenticated user from the database based on SWA authentication.
 * Returns null if not authenticated or user not found in database.
 */
export async function getAuthenticatedUser(
  request: HttpRequest,
): Promise<AuthenticatedUser | null> {
  const clientPrincipal = getClientPrincipal(request)
  if (!clientPrincipal) return null

  const email = clientPrincipal.userDetails?.toLowerCase()
  if (!email) return null

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
    return {
      id: admin.id,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      role: 'admin',
      companyId: '', // Admins don't belong to a specific company
      userType: 'employer', // Treat as employer for compatibility
    }
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
    return {
      id: employer.id,
      email: employer.email,
      firstName: employer.firstName,
      lastName: employer.lastName,
      role: employer.role || 'employer',
      companyId: employer.companyId,
      userType: 'employer',
    }
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
    return {
      id: employee.id,
      email: employee.email,
      firstName: employee.firstName,
      lastName: employee.lastName,
      role: employee.role || 'employee',
      companyId: employee.companyId,
      userType: 'employee',
    }
  }

  return null
}

/**
 * Requires the user to have one of the specified roles.
 * Returns an error response if unauthorized, or null if authorized.
 */
export function requireRole(
  user: AuthenticatedUser | null,
  allowedRoles: UserRole[],
): HttpResponseInit | null {
  if (!user) {
    return jsonResponse(401, {
      success: false,
      error: 'Authentication required.',
    })
  }

  // Admin can access everything
  if (user.role === 'admin') {
    return null
  }

  if (!allowedRoles.includes(user.role)) {
    return jsonResponse(403, {
      success: false,
      error: 'You do not have permission to perform this action.',
    })
  }

  return null
}

/**
 * Requires the user to be an admin.
 * Returns an error response if not admin, or null if authorized.
 */
export function requireAdmin(user: AuthenticatedUser | null): HttpResponseInit | null {
  return requireRole(user, ['admin'])
}

/**
 * Requires the user to be an employer (or admin).
 * Returns an error response if not employer/admin, or null if authorized.
 */
export function requireEmployer(user: AuthenticatedUser | null): HttpResponseInit | null {
  return requireRole(user, ['employer'])
}

/**
 * Requires the user to be an employee (or admin).
 * Returns an error response if not employee/admin, or null if authorized.
 */
export function requireEmployee(user: AuthenticatedUser | null): HttpResponseInit | null {
  return requireRole(user, ['employee'])
}
