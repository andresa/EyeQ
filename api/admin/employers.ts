import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions'
import { getContainer } from '../shared/cosmos.js'
import { jsonResponse, parseJsonBody } from '../shared/http.js'
import { createId, nowIso } from '../shared/utils.js'
import { getAuthenticatedUser, requireAdmin } from '../shared/auth.js'

type UserRole = 'employee' | 'employer' | 'admin'

interface EmployerBody {
  companyId?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  role?: UserRole
  isActive?: boolean
}

export const listEmployersHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const companyId = request.query.get('companyId')
  if (!companyId) {
    return jsonResponse(400, { success: false, error: 'companyId is required.' })
  }
  const container = await getContainer('employers', '/companyId')
  const { resources } = await container.items
    .query({
      query: 'SELECT * FROM c WHERE c.companyId = @companyId',
      parameters: [{ name: '@companyId', value: companyId }],
    })
    .fetchAll()
  return jsonResponse(200, { success: true, data: resources })
}

export const createEmployerHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  // Verify admin role
  const user = await getAuthenticatedUser(request)
  const authError = requireAdmin(user)
  if (authError) return authError

  const body = await parseJsonBody<EmployerBody>(request)
  if (!body?.companyId || !body.firstName || !body.lastName || !body.email) {
    return jsonResponse(400, {
      success: false,
      error: 'companyId, firstName, lastName, and email are required.',
    })
  }

  // Validate role - only 'employee' or 'employer' allowed (not 'admin')
  const allowedRoles = ['employee', 'employer'] as const
  if (body.role && !allowedRoles.includes(body.role as (typeof allowedRoles)[number])) {
    return jsonResponse(400, {
      success: false,
      error: 'role must be either employee or employer.',
    })
  }

  const employer = {
    id: createId('employer'),
    companyId: body.companyId,
    firstName: body.firstName,
    lastName: body.lastName,
    email: body.email,
    phone: body.phone,
    role: (body.role || 'employer') as 'employee' | 'employer',
    createdAt: nowIso(),
    isActive: true,
  }

  const container = await getContainer('employers', '/companyId')
  await container.items.create(employer)
  return jsonResponse(201, { success: true, data: employer })
}

export const updateEmployerHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  // Verify admin role
  const user = await getAuthenticatedUser(request)
  const authError = requireAdmin(user)
  if (authError) return authError

  const employerId = request.params.employerId
  const companyId = request.query.get('companyId')

  if (!employerId) {
    return jsonResponse(400, { success: false, error: 'employerId is required.' })
  }
  if (!companyId) {
    return jsonResponse(400, { success: false, error: 'companyId is required.' })
  }

  const body = await parseJsonBody<EmployerBody>(request)
  if (!body) {
    return jsonResponse(400, { success: false, error: 'Request body is required.' })
  }

  // Validate role - only 'employee' or 'employer' allowed (not 'admin')
  const allowedRoles = ['employee', 'employer'] as const
  if (body.role && !allowedRoles.includes(body.role as (typeof allowedRoles)[number])) {
    return jsonResponse(400, {
      success: false,
      error: 'role must be either employee or employer.',
    })
  }

  const container = await getContainer('employers', '/companyId')

  // Fetch existing employer
  const { resource: existing } = await container.item(employerId, companyId).read()
  if (!existing) {
    return jsonResponse(404, { success: false, error: 'Employer not found.' })
  }

  // Update only provided fields
  const updated = {
    ...existing,
    firstName: body.firstName ?? existing.firstName,
    lastName: body.lastName ?? existing.lastName,
    email: body.email ?? existing.email,
    phone: body.phone ?? existing.phone,
    role: body.role ?? existing.role ?? 'employer',
    isActive: body.isActive ?? existing.isActive,
    updatedAt: nowIso(),
  }

  await container.item(employerId, companyId).replace(updated)
  return jsonResponse(200, { success: true, data: updated })
}

app.http('adminEmployers', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'management/employers',
  handler: async (request) => {
    // Verify admin role for all management operations
    const user = await getAuthenticatedUser(request)
    const authError = requireAdmin(user)
    if (authError) return authError

    return request.method === 'GET'
      ? listEmployersHandler(request)
      : createEmployerHandler(request)
  },
})

export const deleteEmployerHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  // Verify admin role
  const user = await getAuthenticatedUser(request)
  const authError = requireAdmin(user)
  if (authError) return authError

  const employerId = request.params.employerId
  const companyId = request.query.get('companyId')

  if (!employerId) {
    return jsonResponse(400, { success: false, error: 'employerId is required.' })
  }
  if (!companyId) {
    return jsonResponse(400, { success: false, error: 'companyId is required.' })
  }

  const container = await getContainer('employers', '/companyId')

  // Fetch existing employer to verify it exists
  const { resource: existing } = await container.item(employerId, companyId).read()
  if (!existing) {
    return jsonResponse(404, { success: false, error: 'Employer not found.' })
  }

  // Delete the employer
  await container.item(employerId, companyId).delete()
  return jsonResponse(200, { success: true, data: { id: employerId } })
}

app.http('adminEmployerUpdate', {
  methods: ['PUT', 'DELETE'],
  authLevel: 'anonymous',
  route: 'management/employers/{employerId}',
  handler: async (request) => {
    if (request.method === 'DELETE') {
      return deleteEmployerHandler(request)
    }
    return updateEmployerHandler(request)
  },
})

// Shared read-only endpoint for all authenticated users
app.http('sharedEmployers', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'shared/employers',
  handler: listEmployersHandler,
})
