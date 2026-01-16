import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions'
import { getContainer } from '../shared/cosmos.js'
import { jsonResponse, parseJsonBody } from '../shared/http.js'
import { createId, nowIso } from '../shared/utils.js'

interface EmployeeInput {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  dob?: string
}

interface EmployeesBody {
  companyId?: string
  employees?: EmployeeInput[]
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
  const body = await parseJsonBody<EmployeesBody>(request)
  if (!body?.companyId || !body.employees || body.employees.length === 0) {
    return jsonResponse(400, {
      success: false,
      error: 'companyId and employees are required.',
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
      query: 'SELECT * FROM c WHERE c.companyId = @companyId AND ARRAY_CONTAINS(@emails, c.email)',
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
      createdAt: nowIso(),
      isActive: true,
    }
    await container.items.create(record)
    created.push(record)
  }

  return jsonResponse(201, { success: true, data: created })
}

app.http('employerEmployees', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'employer/employees',
  handler: async (request) =>
    request.method === 'GET'
      ? listEmployeesHandler(request)
      : createEmployeesHandler(request),
})
