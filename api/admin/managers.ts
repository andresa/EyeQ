import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions'
import { getContainer } from '../shared/cosmos.js'
import { jsonResponse, parseJsonBody } from '../shared/http.js'
import { createId, nowIso } from '../shared/utils.js'
import { getAuthenticatedUser, requireAdmin } from '../shared/auth.js'
import { USERS_CONTAINER, USERS_PARTITION_KEY } from '../shared/userTypes.js'

type UserRole = 'employee' | 'manager' | 'admin'

interface ManagerBody {
  companyId?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  role?: UserRole
  isActive?: boolean
}

export const listManagersHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const companyId = request.query.get('companyId')
  if (!companyId) {
    return jsonResponse(400, { success: false, error: 'companyId is required.' })
  }
  const container = await getContainer(USERS_CONTAINER, USERS_PARTITION_KEY)
  const { resources } = await container.items
    .query({
      query: 'SELECT * FROM c WHERE c.companyId = @companyId AND c.role = @role',
      parameters: [
        { name: '@companyId', value: companyId },
        { name: '@role', value: 'manager' },
      ],
    })
    .fetchAll()
  return jsonResponse(200, { success: true, data: resources })
}

export const createManagerHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  // Verify admin role
  const user = await getAuthenticatedUser(request)
  const authError = requireAdmin(user)
  if (authError) return authError

  const body = await parseJsonBody<ManagerBody>(request)
  if (!body?.companyId || !body.firstName || !body.lastName || !body.email) {
    return jsonResponse(400, {
      success: false,
      error: 'companyId, firstName, lastName, and email are required.',
    })
  }

  // Validate role - only 'employee' or 'manager' allowed (not 'admin')
  const allowedRoles = ['employee', 'manager'] as const
  if (body.role && !allowedRoles.includes(body.role as (typeof allowedRoles)[number])) {
    return jsonResponse(400, {
      success: false,
      error: 'role must be either employee or manager.',
    })
  }

  const manager = {
    id: createId('user'),
    companyId: body.companyId,
    firstName: body.firstName,
    lastName: body.lastName,
    email: body.email,
    phone: body.phone,
    role: 'manager' as const, // Always 'manager' for this endpoint
    createdAt: nowIso(),
    isActive: true,
  }

  const container = await getContainer(USERS_CONTAINER, USERS_PARTITION_KEY)
  await container.items.create(manager)
  return jsonResponse(201, { success: true, data: manager })
}

export const updateManagerHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  // Verify admin role
  const user = await getAuthenticatedUser(request)
  const authError = requireAdmin(user)
  if (authError) return authError

  const managerId = request.params.managerId
  const companyId = request.query.get('companyId')

  if (!managerId) {
    return jsonResponse(400, { success: false, error: 'managerId is required.' })
  }
  if (!companyId) {
    return jsonResponse(400, { success: false, error: 'companyId is required.' })
  }

  const body = await parseJsonBody<ManagerBody>(request)
  if (!body) {
    return jsonResponse(400, { success: false, error: 'Request body is required.' })
  }

  // Validate role - only 'employee' or 'manager' allowed (not 'admin')
  const allowedRoles = ['employee', 'manager'] as const
  if (body.role && !allowedRoles.includes(body.role as (typeof allowedRoles)[number])) {
    return jsonResponse(400, {
      success: false,
      error: 'role must be either employee or manager.',
    })
  }

  const container = await getContainer(USERS_CONTAINER, USERS_PARTITION_KEY)

  // Fetch existing manager
  const { resource: existing } = await container.item(managerId, companyId).read()
  if (!existing || existing.role !== 'manager') {
    return jsonResponse(404, { success: false, error: 'Manager not found.' })
  }

  // Update only provided fields
  const updated = {
    ...existing,
    firstName: body.firstName ?? existing.firstName,
    lastName: body.lastName ?? existing.lastName,
    email: body.email ?? existing.email,
    phone: body.phone ?? existing.phone,
    role: body.role ?? existing.role ?? 'manager',
    isActive: body.isActive ?? existing.isActive,
    updatedAt: nowIso(),
  }

  await container.item(managerId, companyId).replace(updated)
  return jsonResponse(200, { success: true, data: updated })
}

app.http('adminManagers', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'management/managers',
  handler: async (request) => {
    // Verify admin role for all management operations
    const user = await getAuthenticatedUser(request)
    const authError = requireAdmin(user)
    if (authError) return authError

    return request.method === 'GET'
      ? listManagersHandler(request)
      : createManagerHandler(request)
  },
})

export const deleteManagerHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  // Verify admin role
  const user = await getAuthenticatedUser(request)
  const authError = requireAdmin(user)
  if (authError) return authError

  const managerId = request.params.managerId
  const companyId = request.query.get('companyId')

  if (!managerId) {
    return jsonResponse(400, { success: false, error: 'managerId is required.' })
  }
  if (!companyId) {
    return jsonResponse(400, { success: false, error: 'companyId is required.' })
  }

  const container = await getContainer(USERS_CONTAINER, USERS_PARTITION_KEY)

  // Fetch existing manager to verify it exists and is a manager
  const { resource: existing } = await container.item(managerId, companyId).read()
  if (!existing || existing.role !== 'manager') {
    return jsonResponse(404, { success: false, error: 'Manager not found.' })
  }

  // Delete the manager
  await container.item(managerId, companyId).delete()
  return jsonResponse(200, { success: true, data: { id: managerId } })
}

app.http('adminManagerUpdate', {
  methods: ['PUT', 'DELETE'],
  authLevel: 'anonymous',
  route: 'management/managers/{managerId}',
  handler: async (request) => {
    if (request.method === 'DELETE') {
      return deleteManagerHandler(request)
    }
    return updateManagerHandler(request)
  },
})

// Shared read-only endpoint for all authenticated users
app.http('sharedManagers', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'shared/managers',
  handler: listManagersHandler,
})
