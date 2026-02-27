import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions'
import { getContainer } from '../shared/cosmos.js'
import { jsonResponse, parseJsonBody } from '../shared/http.js'
import { createId, nowIso } from '../shared/utils.js'
import { getAuthenticatedUser, requireManager } from '../shared/auth.js'

const CONTAINER = 'questionCategories'
const PARTITION_KEY = '/companyId'

interface CreateBody {
  companyId?: string
  name?: string
}

interface UpdateBody {
  name?: string
}

const getCategoryById = async (categoryId: string) => {
  const container = await getContainer(CONTAINER, PARTITION_KEY)
  const { resources } = await container.items
    .query({
      query: 'SELECT * FROM c WHERE c.id = @id',
      parameters: [{ name: '@id', value: categoryId }],
    })
    .fetchAll()
  return resources[0]
}

const listHandler = async (request: HttpRequest): Promise<HttpResponseInit> => {
  const companyId = request.query.get('companyId')
  if (!companyId) {
    return jsonResponse(400, { success: false, error: 'companyId is required.' })
  }

  const container = await getContainer(CONTAINER, PARTITION_KEY)
  const { resources } = await container.items
    .query({
      query: 'SELECT * FROM c WHERE c.companyId = @companyId ORDER BY c.name ASC',
      parameters: [{ name: '@companyId', value: companyId }],
    })
    .fetchAll()
  return jsonResponse(200, { success: true, data: resources })
}

const createHandler = async (request: HttpRequest): Promise<HttpResponseInit> => {
  const user = await getAuthenticatedUser(request)
  const authError = requireManager(user)
  if (authError) return authError

  const body = await parseJsonBody<CreateBody>(request)
  if (!body?.companyId || !body.name?.trim()) {
    return jsonResponse(400, {
      success: false,
      error: 'companyId and name are required.',
    })
  }

  if (user!.role !== 'admin' && user!.companyId !== body.companyId) {
    return jsonResponse(403, {
      success: false,
      error: 'You can only add categories to your own company.',
    })
  }

  const container = await getContainer(CONTAINER, PARTITION_KEY)

  const doc = {
    id: createId('qc'),
    companyId: body.companyId,
    name: body.name.trim(),
    createdAt: nowIso(),
  }
  await container.items.create(doc)
  return jsonResponse(201, { success: true, data: doc })
}

const updateHandler = async (request: HttpRequest): Promise<HttpResponseInit> => {
  const user = await getAuthenticatedUser(request)
  const authError = requireManager(user)
  if (authError) return authError

  const categoryId = request.params.categoryId
  if (!categoryId) {
    return jsonResponse(400, { success: false, error: 'categoryId is required.' })
  }

  const existing = await getCategoryById(categoryId)
  if (!existing) {
    return jsonResponse(404, { success: false, error: 'Category not found.' })
  }

  if (user!.role !== 'admin' && user!.companyId !== existing.companyId) {
    return jsonResponse(403, {
      success: false,
      error: 'You can only update categories in your own company.',
    })
  }

  const body = await parseJsonBody<UpdateBody>(request)
  if (!body?.name?.trim()) {
    return jsonResponse(400, { success: false, error: 'name is required.' })
  }

  const updated = {
    ...existing,
    name: body.name.trim(),
    updatedAt: nowIso(),
  }

  const container = await getContainer(CONTAINER, PARTITION_KEY)
  await container.item(categoryId, existing.companyId).replace(updated)
  return jsonResponse(200, { success: true, data: updated })
}

const deleteHandler = async (request: HttpRequest): Promise<HttpResponseInit> => {
  const user = await getAuthenticatedUser(request)
  const authError = requireManager(user)
  if (authError) return authError

  const categoryId = request.params.categoryId
  if (!categoryId) {
    return jsonResponse(400, { success: false, error: 'categoryId is required.' })
  }

  const existing = await getCategoryById(categoryId)
  if (!existing) {
    return jsonResponse(404, { success: false, error: 'Category not found.' })
  }

  if (user!.role !== 'admin' && user!.companyId !== existing.companyId) {
    return jsonResponse(403, {
      success: false,
      error: 'You can only delete categories from your own company.',
    })
  }

  const container = await getContainer(CONTAINER, PARTITION_KEY)
  await container.item(categoryId, existing.companyId).delete()
  return jsonResponse(200, { success: true, data: { id: categoryId } })
}

app.http('managerQuestionCategories', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'manager/question-categories',
  handler: async (request) => {
    const user = await getAuthenticatedUser(request)
    const authError = requireManager(user)
    if (authError) return authError

    if (request.method === 'GET') {
      const companyId = request.query.get('companyId')
      if (user!.role !== 'admin' && user!.companyId !== companyId) {
        return jsonResponse(403, {
          success: false,
          error: 'You can only view your own company categories.',
        })
      }
      return listHandler(request)
    }
    return createHandler(request)
  },
})

app.http('managerQuestionCategoryItem', {
  methods: ['PUT', 'DELETE'],
  authLevel: 'anonymous',
  route: 'manager/question-categories/{categoryId}',
  handler: async (request) => {
    if (request.method === 'PUT') return updateHandler(request)
    return deleteHandler(request)
  },
})
