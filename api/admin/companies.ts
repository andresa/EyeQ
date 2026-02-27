import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions'
import { getContainer } from '../shared/cosmos.js'
import { jsonResponse, parseJsonBody } from '../shared/http.js'
import { createId, nowIso } from '../shared/utils.js'
import { getAuthenticatedUser, requireAdmin } from '../shared/auth.js'

interface CompanyBody {
  name?: string
  address?: string
  isActive?: boolean
}

export const listCompaniesHandler = async (): Promise<HttpResponseInit> => {
  const container = await getContainer('companies', '/id')
  const { resources } = await container.items.query('SELECT * FROM c').fetchAll()
  return jsonResponse(200, { success: true, data: resources })
}

export const createCompanyHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  // Verify admin role
  const user = await getAuthenticatedUser(request)
  const authError = requireAdmin(user)
  if (authError) return authError

  const body = await parseJsonBody<CompanyBody>(request)
  if (!body?.name) {
    return jsonResponse(400, { success: false, error: 'Company name is required.' })
  }

  const company = {
    id: createId('company'),
    name: body.name,
    address: body.address,
    createdAt: nowIso(),
    isActive: true,
  }

  const container = await getContainer('companies', '/id')
  await container.items.create(company)
  return jsonResponse(201, { success: true, data: company })
}

export const updateCompanyHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  // Verify admin role
  const user = await getAuthenticatedUser(request)
  const authError = requireAdmin(user)
  if (authError) return authError

  const companyId = request.params.companyId
  const body = await parseJsonBody<CompanyBody>(request)
  if (!companyId) {
    return jsonResponse(400, { success: false, error: 'Company ID is required.' })
  }

  const container = await getContainer('companies', '/id')
  let resource
  try {
    const result = await container.item(companyId, companyId).read()
    resource = result.resource
  } catch {
    resource = null
  }
  if (!resource) {
    return jsonResponse(404, { success: false, error: 'Company not found.' })
  }

  const updated = {
    ...resource,
    name: body?.name ?? resource.name,
    address: body?.address ?? resource.address,
    isActive: body?.isActive ?? resource.isActive,
  }

  await container.item(companyId, companyId).replace(updated)
  return jsonResponse(200, { success: true, data: updated })
}

app.http('adminCompanies', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'management/companies',
  handler: async (request) => {
    if (request.method === 'GET') {
      // List is admin-only for management endpoint
      const user = await getAuthenticatedUser(request)
      const authError = requireAdmin(user)
      if (authError) return authError
      return listCompaniesHandler()
    }
    return createCompanyHandler(request)
  },
})

export const deleteCompanyHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const user = await getAuthenticatedUser(request)
  const authError = requireAdmin(user)
  if (authError) return authError

  const companyId = request.params.companyId
  if (!companyId) {
    return jsonResponse(400, { success: false, error: 'Company ID is required.' })
  }

  const container = await getContainer('companies', '/id')
  try {
    await container.item(companyId, companyId).delete()
  } catch {
    return jsonResponse(404, { success: false, error: 'Company not found.' })
  }

  return jsonResponse(200, { success: true, data: { id: companyId } })
}

app.http('adminCompanyById', {
  methods: ['PUT', 'DELETE'],
  authLevel: 'anonymous',
  route: 'management/companies/{companyId}',
  handler: async (request) => {
    if (request.method === 'DELETE') return deleteCompanyHandler(request)
    return updateCompanyHandler(request)
  },
})

// Shared read-only endpoint for all authenticated users
app.http('sharedCompanies', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'shared/companies',
  handler: listCompaniesHandler,
})
