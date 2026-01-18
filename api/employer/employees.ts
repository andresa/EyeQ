import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions'
import { getContainer } from '../shared/cosmos.js'
import { jsonResponse, parseJsonBody } from '../shared/http.js'
import { createId, nowIso } from '../shared/utils.js'
import { getAuthenticatedUser, requireEmployer } from '../shared/auth.js'

type UserRole = 'employee' | 'employer' | 'admin'

interface EmployeeInput {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  dob?: string
  role?: UserRole
}

interface EmployeesBody {
  companyId?: string
  employees?: EmployeeInput[]
}

interface EmployeeUpdateBody {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  dob?: string
  role?: UserRole
  isActive?: boolean
}

export const listEmployeesHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const companyId = request.query.get('companyId')
  if (!companyId) {
    return jsonResponse(400, { success: false, error: 'companyId is required.' })
  }
  const container = await getContainer('employees', '/companyId')
  const { resources } = await container.items
    .query({
      query: 'SELECT * FROM c WHERE c.companyId = @companyId',
      parameters: [{ name: '@companyId', value: companyId }],
    })
    .fetchAll()
  return jsonResponse(200, { success: true, data: resources })
}

export const createEmployeesHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  // Verify employer role
  const user = await getAuthenticatedUser(request)
  const authError = requireEmployer(user)
  if (authError) return authError

  const body = await parseJsonBody<EmployeesBody>(request)
  if (!body?.companyId || !body.employees || body.employees.length === 0) {
    return jsonResponse(400, {
      success: false,
      error: 'companyId and employees are required.',
    })
  }

  // Employers can only create employees in their own company
  if (user!.role !== 'admin' && user!.companyId !== body.companyId) {
    return jsonResponse(403, {
      success: false,
      error: 'You can only create employees in your own company.',
    })
  }

  const employees = body.employees as EmployeeInput[]

  const missingFields = employees.find(
    (employee) => !employee.firstName || !employee.lastName || !employee.email,
  )
  if (missingFields) {
    return jsonResponse(400, {
      success: false,
      error: 'Each employee requires firstName, lastName, and email.',
    })
  }

  const normalizedEmails = employees
    .map((employee) => employee.email?.toLowerCase())
    .filter(Boolean) as string[]

  const duplicates = normalizedEmails.filter(
    (email, index) => normalizedEmails.indexOf(email) !== index,
  )
  if (duplicates.length > 0) {
    return jsonResponse(400, {
      success: false,
      error: `Duplicate emails found: ${[...new Set(duplicates)].join(', ')}`,
    })
  }

  const container = await getContainer('employees', '/companyId')
  const { resources: existing } = await container.items
    .query({
      query:
        'SELECT * FROM c WHERE c.companyId = @companyId AND ARRAY_CONTAINS(@emails, c.email)',
      parameters: [
        { name: '@companyId', value: body.companyId },
        { name: '@emails', value: normalizedEmails },
      ],
    })
    .fetchAll()

  if (existing.length > 0) {
    return jsonResponse(409, {
      success: false,
      error: `Emails already exist: ${existing
        .map((employee) => employee.email)
        .join(', ')}`,
    })
  }

  const created = []
  for (const employee of employees) {
    const record = {
      id: createId('employee'),
      companyId: body.companyId,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone,
      dob: employee.dob,
      role: 'employee' as UserRole, // Always default to 'employee' role
      createdAt: nowIso(),
      isActive: true,
    }
    await container.items.create(record)
    created.push(record)
  }

  return jsonResponse(201, { success: true, data: created })
}

export const updateEmployeeHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  // Verify employer role
  const user = await getAuthenticatedUser(request)
  const authError = requireEmployer(user)
  if (authError) return authError

  const employeeId = request.params.employeeId
  const companyId = request.query.get('companyId')

  if (!employeeId) {
    return jsonResponse(400, { success: false, error: 'employeeId is required.' })
  }
  if (!companyId) {
    return jsonResponse(400, { success: false, error: 'companyId is required.' })
  }

  // Employers can only update employees in their own company
  if (user!.role !== 'admin' && user!.companyId !== companyId) {
    return jsonResponse(403, {
      success: false,
      error: 'You can only update employees in your own company.',
    })
  }

  const body = await parseJsonBody<EmployeeUpdateBody>(request)
  if (!body) {
    return jsonResponse(400, { success: false, error: 'Request body is required.' })
  }

  // Employers cannot change roles - only admins can
  if (body.role && user!.role !== 'admin') {
    return jsonResponse(403, {
      success: false,
      error: 'Only admins can change employee roles.',
    })
  }

  // Validate role if provided
  const validRoles: UserRole[] = ['employee', 'employer', 'admin']
  if (body.role && !validRoles.includes(body.role)) {
    return jsonResponse(400, {
      success: false,
      error: 'role must be one of: employee, employer, admin.',
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

app.http('employerEmployees', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'employer/employees',
  handler: async (request) => {
    // Verify employer role
    const user = await getAuthenticatedUser(request)
    const authError = requireEmployer(user)
    if (authError) return authError

    // For GET, verify the user can only access their own company's employees
    if (request.method === 'GET') {
      const companyId = request.query.get('companyId')
      if (user!.role !== 'admin' && user!.companyId !== companyId) {
        return jsonResponse(403, {
          success: false,
          error: 'You can only view employees in your own company.',
        })
      }
      return listEmployeesHandler(request)
    }

    return createEmployeesHandler(request)
  },
})

app.http('employerEmployeeUpdate', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'employer/employees/{employeeId}',
  handler: updateEmployeeHandler,
})

// Shared read-only endpoint for all authenticated users
app.http('sharedEmployees', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'shared/employees',
  handler: listEmployeesHandler,
})
