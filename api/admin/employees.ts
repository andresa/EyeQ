import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions'
import { getContainer } from '../shared/cosmos.js'
import { jsonResponse, parseJsonBody } from '../shared/http.js'
import { createId, nowIso } from '../shared/utils.js'
import { getAuthenticatedUser, requireAdmin } from '../shared/auth.js'

type UserRole = 'employee' | 'manager' | 'admin'

interface EmployeeBody {
  companyId?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  dob?: string
  role?: UserRole
  isActive?: boolean
}

export const listAllEmployeesHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const companyId = request.query.get('companyId')
  const container = await getContainer('employees', '/companyId')

  if (companyId) {
    // Filter by company if provided
    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.companyId = @companyId',
        parameters: [{ name: '@companyId', value: companyId }],
      })
      .fetchAll()
    return jsonResponse(200, { success: true, data: resources })
  }

  // Return all employees
  const { resources } = await container.items.query('SELECT * FROM c').fetchAll()
  return jsonResponse(200, { success: true, data: resources })
}

export const createEmployeeHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  // Verify admin role
  const user = await getAuthenticatedUser(request)
  const authError = requireAdmin(user)
  if (authError) return authError

  const body = await parseJsonBody<EmployeeBody>(request)
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

  // Check if email already exists
  const container = await getContainer('employees', '/companyId')
  const { resources: existing } = await container.items
    .query({
      query: 'SELECT * FROM c WHERE LOWER(c.email) = @email',
      parameters: [{ name: '@email', value: body.email.toLowerCase() }],
    })
    .fetchAll()

  if (existing.length > 0) {
    return jsonResponse(409, {
      success: false,
      error: 'An employee with this email already exists.',
    })
  }

  const employee = {
    id: createId('employee'),
    companyId: body.companyId,
    firstName: body.firstName,
    lastName: body.lastName,
    email: body.email.toLowerCase(),
    phone: body.phone,
    dob: body.dob,
    role: body.role || 'employee',
    createdAt: nowIso(),
    isActive: body.isActive !== false,
  }

  await container.items.create(employee)
  return jsonResponse(201, { success: true, data: employee })
}

export const updateEmployeeHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  // Verify admin role
  const user = await getAuthenticatedUser(request)
  const authError = requireAdmin(user)
  if (authError) return authError

  const employeeId = request.params.employeeId
  const companyId = request.query.get('companyId')

  if (!employeeId) {
    return jsonResponse(400, { success: false, error: 'employeeId is required.' })
  }
  if (!companyId) {
    return jsonResponse(400, { success: false, error: 'companyId is required.' })
  }

  const body = await parseJsonBody<EmployeeBody>(request)
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

  const container = await getContainer('employees', '/companyId')

  // Fetch existing employee
  const { resource: existing } = await container.item(employeeId, companyId).read()
  if (!existing) {
    return jsonResponse(404, { success: false, error: 'Employee not found.' })
  }

  // Update only provided fields
  const updated = {
    ...existing,
    firstName: body.firstName ?? existing.firstName,
    lastName: body.lastName ?? existing.lastName,
    email: body.email ?? existing.email,
    phone: body.phone ?? existing.phone,
    dob: body.dob ?? existing.dob,
    role: body.role ?? existing.role ?? 'employee',
    isActive: body.isActive ?? existing.isActive,
    updatedAt: nowIso(),
  }

  await container.item(employeeId, companyId).replace(updated)
  return jsonResponse(200, { success: true, data: updated })
}

app.http('adminEmployees', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'management/employees',
  handler: async (request) => {
    // Verify admin role
    const user = await getAuthenticatedUser(request)
    const authError = requireAdmin(user)
    if (authError) return authError

    return request.method === 'GET'
      ? listAllEmployeesHandler(request)
      : createEmployeeHandler(request)
  },
})

app.http('adminEmployeeUpdate', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'management/employees/{employeeId}',
  handler: updateEmployeeHandler,
})
