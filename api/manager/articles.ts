import type { SqlParameter } from '@azure/cosmos'
import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions'
import { getContainer } from '../shared/cosmos.js'
import { jsonResponse, paginatedJsonResponse, parseJsonBody } from '../shared/http.js'
import { paginatedQuery } from '../shared/pagination.js'
import { createId, nowIso } from '../shared/utils.js'
import { getAuthenticatedUser, requireManager } from '../shared/auth.js'

const CONTAINER = 'articles'
const PARTITION_KEY = '/companyId'

interface CreateBody {
  companyId?: string
  title?: string
  description?: string
  topicIds?: string[]
}

interface UpdateBody {
  title?: string
  description?: string
  topicIds?: string[]
}

const stripRichText = (value: string) =>
  value
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*+/g, '')
    .trim()

const hasMeaningfulText = (value?: string | null) =>
  typeof value === 'string' && stripRichText(value).length > 0

const normaliseTopicIds = (topicIds?: string[]) =>
  Array.from(
    new Set(
      (Array.isArray(topicIds) ? topicIds : [])
        .map((topicId) => topicId?.trim())
        .filter((topicId): topicId is string => Boolean(topicId)),
    ),
  )

const getArticleById = async (articleId: string) => {
  const container = await getContainer(CONTAINER, PARTITION_KEY)
  const { resources } = await container.items
    .query({
      query: 'SELECT * FROM c WHERE c.id = @id',
      parameters: [{ name: '@id', value: articleId }],
    })
    .fetchAll()

  return resources[0]
}

export const listArticlesHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const companyId = request.query.get('companyId')
  if (!companyId) {
    return jsonResponse(400, { success: false, error: 'companyId is required.' })
  }

  const nameFilter = request.query.get('name')
  const topicFilter = request.query.get('topicId')
  const limit = request.query.get('limit')
  const cursor = request.query.get('cursor')

  let whereClause = 'FROM c WHERE c.companyId = @companyId'
  const parameters: SqlParameter[] = [{ name: '@companyId', value: companyId }]

  if (nameFilter) {
    whereClause += ' AND CONTAINS(LOWER(c.title), LOWER(@name))'
    parameters.push({ name: '@name', value: nameFilter })
  }

  if (topicFilter) {
    whereClause += ' AND ARRAY_CONTAINS(c.topicIds, @topicId)'
    parameters.push({ name: '@topicId', value: topicFilter })
  }

  const query = `SELECT * ${whereClause} ORDER BY c.createdAt DESC`
  const countQuery = `SELECT VALUE COUNT(1) ${whereClause}`
  const container = await getContainer(CONTAINER, PARTITION_KEY)

  if (limit) {
    const page = await paginatedQuery(
      container,
      { query, parameters },
      {
        limit,
        cursor,
        countQuery: { query: countQuery, parameters },
        partitionKey: companyId,
      },
    )

    return paginatedJsonResponse(200, page)
  }

  const { resources } = await container.items
    .query({ query, parameters }, { partitionKey: companyId })
    .fetchAll()

  return jsonResponse(200, { success: true, data: resources })
}

export const createArticleHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const user = await getAuthenticatedUser(request)
  const authError = requireManager(user)
  if (authError) return authError

  const body = await parseJsonBody<CreateBody>(request)
  if (
    !body?.companyId ||
    !hasMeaningfulText(body.title) ||
    !hasMeaningfulText(body.description)
  ) {
    return jsonResponse(400, {
      success: false,
      error: 'companyId, title, and description are required.',
    })
  }

  if (user!.role !== 'admin' && user!.companyId !== body.companyId) {
    return jsonResponse(403, {
      success: false,
      error: 'You can only create articles for your own company.',
    })
  }

  const title = body.title?.trim() ?? ''
  const description = body.description?.trim() ?? ''

  const doc = {
    id: createId('art'),
    companyId: body.companyId,
    createdBy: user!.id,
    title,
    description,
    topicIds: normaliseTopicIds(body.topicIds),
    createdAt: nowIso(),
  }

  const container = await getContainer(CONTAINER, PARTITION_KEY)
  await container.items.create(doc)
  return jsonResponse(201, { success: true, data: doc })
}

export const getArticleHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const user = await getAuthenticatedUser(request)
  const authError = requireManager(user)
  if (authError) return authError

  const articleId = request.params.articleId
  if (!articleId) {
    return jsonResponse(400, { success: false, error: 'articleId is required.' })
  }

  const article = await getArticleById(articleId)
  if (!article) {
    return jsonResponse(404, { success: false, error: 'Article not found.' })
  }

  if (user!.role !== 'admin' && user!.companyId !== article.companyId) {
    return jsonResponse(403, {
      success: false,
      error: 'You can only view articles from your own company.',
    })
  }

  return jsonResponse(200, { success: true, data: article })
}

export const updateArticleHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const user = await getAuthenticatedUser(request)
  const authError = requireManager(user)
  if (authError) return authError

  const articleId = request.params.articleId
  if (!articleId) {
    return jsonResponse(400, { success: false, error: 'articleId is required.' })
  }

  const existing = await getArticleById(articleId)
  if (!existing) {
    return jsonResponse(404, { success: false, error: 'Article not found.' })
  }

  if (user!.role !== 'admin' && user!.companyId !== existing.companyId) {
    return jsonResponse(403, {
      success: false,
      error: 'You can only update articles in your own company.',
    })
  }

  const body = await parseJsonBody<UpdateBody>(request)
  const title = body?.title !== undefined ? body.title.trim() : existing.title
  const description =
    body?.description !== undefined ? body.description.trim() : existing.description

  if (!hasMeaningfulText(title) || !hasMeaningfulText(description)) {
    return jsonResponse(400, {
      success: false,
      error: 'title and description are required.',
    })
  }

  const updated = {
    ...existing,
    title,
    description,
    topicIds:
      body?.topicIds !== undefined ? normaliseTopicIds(body.topicIds) : existing.topicIds,
    updatedAt: nowIso(),
  }

  const container = await getContainer(CONTAINER, PARTITION_KEY)
  await container.item(articleId, existing.companyId).replace(updated)
  return jsonResponse(200, { success: true, data: updated })
}

export const deleteArticleHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const user = await getAuthenticatedUser(request)
  const authError = requireManager(user)
  if (authError) return authError

  const articleId = request.params.articleId
  if (!articleId) {
    return jsonResponse(400, { success: false, error: 'articleId is required.' })
  }

  const existing = await getArticleById(articleId)
  if (!existing) {
    return jsonResponse(404, { success: false, error: 'Article not found.' })
  }

  if (user!.role !== 'admin' && user!.companyId !== existing.companyId) {
    return jsonResponse(403, {
      success: false,
      error: 'You can only delete articles from your own company.',
    })
  }

  const container = await getContainer(CONTAINER, PARTITION_KEY)
  await container.item(articleId, existing.companyId).delete()
  return jsonResponse(200, { success: true, data: { id: articleId } })
}

app.http('managerArticles', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'manager/articles',
  handler: async (request) => {
    const user = await getAuthenticatedUser(request)
    const authError = requireManager(user)
    if (authError) return authError

    if (request.method === 'GET') {
      const companyId = request.query.get('companyId')
      if (user!.role !== 'admin' && user!.companyId !== companyId) {
        return jsonResponse(403, {
          success: false,
          error: 'You can only view articles for your own company.',
        })
      }

      return listArticlesHandler(request)
    }

    return createArticleHandler(request)
  },
})

app.http('managerArticleItem', {
  methods: ['GET', 'PUT', 'DELETE'],
  authLevel: 'anonymous',
  route: 'manager/articles/{articleId}',
  handler: async (request) => {
    if (request.method === 'GET') return getArticleHandler(request)
    if (request.method === 'PUT') return updateArticleHandler(request)
    return deleteArticleHandler(request)
  },
})
