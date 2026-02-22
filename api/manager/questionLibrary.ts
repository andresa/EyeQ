import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions'
import { getContainer } from '../shared/cosmos.js'
import { jsonResponse, parseJsonBody } from '../shared/http.js'
import { createId, nowIso } from '../shared/utils.js'
import { getAuthenticatedUser, requireManager } from '../shared/auth.js'

const CONTAINER = 'questionLibrary'
const PARTITION_KEY = '/companyId'

interface LibraryItemInput {
  type: string
  title: string
  description?: string
  required?: boolean
  options?: { id: string; label: string }[]
  correctAnswer?: string | string[]
  categoryId?: string
}

interface CreateBody {
  companyId?: string
  managerId?: string
  items?: LibraryItemInput[]
}

interface UpdateBody {
  type?: string
  title?: string
  description?: string
  required?: boolean
  options?: { id: string; label: string }[]
  correctAnswer?: string | string[]
  categoryId?: string | null
}

const getItemById = async (itemId: string) => {
  const container = await getContainer(CONTAINER, PARTITION_KEY)
  const { resources } = await container.items
    .query({
      query: 'SELECT * FROM c WHERE c.id = @id',
      parameters: [{ name: '@id', value: itemId }],
    })
    .fetchAll()
  return resources[0]
}

const listHandler = async (request: HttpRequest): Promise<HttpResponseInit> => {
  const companyId = request.query.get('companyId')
  if (!companyId) {
    return jsonResponse(400, { success: false, error: 'companyId is required.' })
  }

  const nameFilter = request.query.get('name')
  const typeFilter = request.query.get('type')
  const categoryFilter = request.query.get('categoryId')

  let query = 'SELECT * FROM c WHERE c.companyId = @companyId'
  const parameters: { name: string; value: string }[] = [
    { name: '@companyId', value: companyId },
  ]

  if (nameFilter) {
    query += ' AND CONTAINS(LOWER(c.title), LOWER(@name))'
    parameters.push({ name: '@name', value: nameFilter })
  }
  if (typeFilter) {
    query += ' AND c.type = @type'
    parameters.push({ name: '@type', value: typeFilter })
  }
  if (categoryFilter) {
    if (categoryFilter === 'uncategorised') {
      query += ' AND (NOT IS_DEFINED(c.categoryId) OR IS_NULL(c.categoryId))'
    } else {
      query += ' AND c.categoryId = @categoryId'
      parameters.push({ name: '@categoryId', value: categoryFilter })
    }
  }

  query += ' ORDER BY c.createdAt DESC'

  const container = await getContainer(CONTAINER, PARTITION_KEY)
  const { resources } = await container.items.query({ query, parameters }).fetchAll()
  return jsonResponse(200, { success: true, data: resources })
}

const createHandler = async (request: HttpRequest): Promise<HttpResponseInit> => {
  const user = await getAuthenticatedUser(request)
  const authError = requireManager(user)
  if (authError) return authError

  const body = await parseJsonBody<CreateBody>(request)
  if (!body?.companyId || !body.managerId || !body.items || body.items.length === 0) {
    return jsonResponse(400, {
      success: false,
      error: 'companyId, managerId, and at least one item are required.',
    })
  }

  if (user!.role !== 'admin' && user!.companyId !== body.companyId) {
    return jsonResponse(403, {
      success: false,
      error: 'You can only add to your own company library.',
    })
  }

  const container = await getContainer(CONTAINER, PARTITION_KEY)
  const created = []

  for (const item of body.items) {
    if (!item.title || !item.type) continue

    const doc = {
      id: createId('ql'),
      companyId: body.companyId,
      createdBy: body.managerId,
      type: item.type,
      title: item.title,
      description: item.description ?? '',
      required: item.required ?? false,
      options: item.options ?? [],
      correctAnswer: item.correctAnswer,
      categoryId: item.categoryId ?? null,
      createdAt: nowIso(),
    }
    await container.items.create(doc)
    created.push(doc)
  }

  return jsonResponse(201, { success: true, data: created })
}

const getHandler = async (request: HttpRequest): Promise<HttpResponseInit> => {
  const user = await getAuthenticatedUser(request)
  const authError = requireManager(user)
  if (authError) return authError

  const itemId = request.params.itemId
  if (!itemId) {
    return jsonResponse(400, { success: false, error: 'itemId is required.' })
  }

  const item = await getItemById(itemId)
  if (!item) {
    return jsonResponse(404, { success: false, error: 'Library item not found.' })
  }

  if (user!.role !== 'admin' && user!.companyId !== item.companyId) {
    return jsonResponse(403, {
      success: false,
      error: 'You can only view items from your own company library.',
    })
  }

  return jsonResponse(200, { success: true, data: item })
}

const updateHandler = async (request: HttpRequest): Promise<HttpResponseInit> => {
  const user = await getAuthenticatedUser(request)
  const authError = requireManager(user)
  if (authError) return authError

  const itemId = request.params.itemId
  if (!itemId) {
    return jsonResponse(400, { success: false, error: 'itemId is required.' })
  }

  const existing = await getItemById(itemId)
  if (!existing) {
    return jsonResponse(404, { success: false, error: 'Library item not found.' })
  }

  if (user!.role !== 'admin' && user!.companyId !== existing.companyId) {
    return jsonResponse(403, {
      success: false,
      error: 'You can only update items in your own company library.',
    })
  }

  const body = await parseJsonBody<UpdateBody>(request)

  const updated = {
    ...existing,
    type: body?.type ?? existing.type,
    title: body?.title ?? existing.title,
    description: body?.description ?? existing.description,
    required: body?.required ?? existing.required,
    options: body?.options ?? existing.options,
    correctAnswer:
      body?.correctAnswer !== undefined ? body.correctAnswer : existing.correctAnswer,
    categoryId: body?.categoryId !== undefined ? body.categoryId : existing.categoryId,
    updatedAt: nowIso(),
  }

  const container = await getContainer(CONTAINER, PARTITION_KEY)
  await container.item(itemId, existing.companyId).replace(updated)
  return jsonResponse(200, { success: true, data: updated })
}

const deleteHandler = async (request: HttpRequest): Promise<HttpResponseInit> => {
  const user = await getAuthenticatedUser(request)
  const authError = requireManager(user)
  if (authError) return authError

  const itemId = request.params.itemId
  if (!itemId) {
    return jsonResponse(400, { success: false, error: 'itemId is required.' })
  }

  const existing = await getItemById(itemId)
  if (!existing) {
    return jsonResponse(404, { success: false, error: 'Library item not found.' })
  }

  if (user!.role !== 'admin' && user!.companyId !== existing.companyId) {
    return jsonResponse(403, {
      success: false,
      error: 'You can only delete items from your own company library.',
    })
  }

  const container = await getContainer(CONTAINER, PARTITION_KEY)
  await container.item(itemId, existing.companyId).delete()
  return jsonResponse(200, { success: true, data: { id: itemId } })
}

app.http('managerQuestionLibrary', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'manager/question-library',
  handler: async (request) => {
    const user = await getAuthenticatedUser(request)
    const authError = requireManager(user)
    if (authError) return authError

    if (request.method === 'GET') {
      const companyId = request.query.get('companyId')
      if (user!.role !== 'admin' && user!.companyId !== companyId) {
        return jsonResponse(403, {
          success: false,
          error: 'You can only view your own company library.',
        })
      }
      return listHandler(request)
    }
    return createHandler(request)
  },
})

app.http('managerQuestionLibraryItem', {
  methods: ['GET', 'PUT', 'DELETE'],
  authLevel: 'anonymous',
  route: 'manager/question-library/{itemId}',
  handler: async (request) => {
    if (request.method === 'GET') return getHandler(request)
    if (request.method === 'PUT') return updateHandler(request)
    return deleteHandler(request)
  },
})
