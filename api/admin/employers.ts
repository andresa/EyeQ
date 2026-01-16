import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions'
import { getContainer } from '../shared/cosmos.js'
import { jsonResponse, parseJsonBody } from '../shared/http.js'
import { createId, nowIso } from '../shared/utils.js'

interface EmployerBody {
  companyId?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
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
  const body = await parseJsonBody<EmployerBody>(request)
  if (!body?.companyId || !body.firstName || !body.lastName || !body.email) {
    return jsonResponse(400, {
      success: false,
      error: 'companyId, firstName, lastName, and email are required.',
    })
  }

  const employer = {
    id: createId('employer'),
    companyId: body.companyId,
    firstName: body.firstName,
    lastName: body.lastName,
    email: body.email,
    phone: body.phone,
    createdAt: nowIso(),
    isActive: true,
  }

  const container = await getContainer('employers', '/companyId')
  await container.items.create(employer)
  return jsonResponse(201, { success: true, data: employer })
}

app.http('adminEmployers', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'management/employers',
  handler: async (request) =>
    request.method === 'GET'
      ? listEmployersHandler(request)
      : createEmployerHandler(request),
})
