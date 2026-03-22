import type { SqlParameter } from '@azure/cosmos'
import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions'
import { getContainer } from '../shared/cosmos.js'
import { getAuthenticatedUser, requireEmployee } from '../shared/auth.js'
import { jsonResponse, paginatedJsonResponse } from '../shared/http.js'
import { getLearningResourcesSettings } from '../shared/learningResources.js'
import { paginatedQuery } from '../shared/pagination.js'

const ARTICLES_CONTAINER = 'articles'
const ARTICLE_TOPICS_CONTAINER = 'articleTopics'
const FLASH_CARDS_CONTAINER = 'flashCards'

const ensureCompanyAccess = (userCompanyId: string, companyId: string) =>
  userCompanyId === companyId
    ? null
    : jsonResponse(403, {
        success: false,
        error: 'You can only access learning resources for your own company.',
      })

const getArticleById = async (articleId: string) => {
  const container = await getContainer(ARTICLES_CONTAINER, '/companyId')
  const { resources } = await container.items
    .query({
      query: 'SELECT * FROM c WHERE c.id = @id',
      parameters: [{ name: '@id', value: articleId }],
    })
    .fetchAll()

  return resources[0]
}

export const listEmployeeArticleTopicsHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const companyId = request.query.get('companyId')
  if (!companyId) {
    return jsonResponse(400, { success: false, error: 'companyId is required.' })
  }

  const settings = await getLearningResourcesSettings(companyId)
  if (!settings.articlesEnabled) {
    return jsonResponse(403, {
      success: false,
      error: 'Articles are not enabled for your company.',
    })
  }

  const container = await getContainer(ARTICLE_TOPICS_CONTAINER, '/companyId')
  const { resources } = await container.items
    .query(
      {
        query: 'SELECT * FROM c WHERE c.companyId = @companyId ORDER BY c.name ASC',
        parameters: [{ name: '@companyId', value: companyId }],
      },
      { partitionKey: companyId },
    )
    .fetchAll()

  return jsonResponse(200, { success: true, data: resources })
}

export const listEmployeeArticlesHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const companyId = request.query.get('companyId')
  if (!companyId) {
    return jsonResponse(400, { success: false, error: 'companyId is required.' })
  }

  const settings = await getLearningResourcesSettings(companyId)
  if (!settings.articlesEnabled) {
    return jsonResponse(403, {
      success: false,
      error: 'Articles are not enabled for your company.',
    })
  }

  const topicFilter = request.query.get('topicId')
  const limit = request.query.get('limit')
  const cursor = request.query.get('cursor')

  let whereClause = 'FROM c WHERE c.companyId = @companyId'
  const parameters: SqlParameter[] = [{ name: '@companyId', value: companyId }]

  if (topicFilter) {
    whereClause += ' AND ARRAY_CONTAINS(c.topicIds, @topicId)'
    parameters.push({ name: '@topicId', value: topicFilter })
  }

  const query = `SELECT * ${whereClause} ORDER BY c.createdAt DESC`
  const countQuery = `SELECT VALUE COUNT(1) ${whereClause}`
  const container = await getContainer(ARTICLES_CONTAINER, '/companyId')

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

export const getEmployeeArticleHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const user = await getAuthenticatedUser(request)
  const authError = requireEmployee(user)
  if (authError) return authError

  const articleId = request.params.articleId
  if (!articleId) {
    return jsonResponse(400, { success: false, error: 'articleId is required.' })
  }

  const article = await getArticleById(articleId)
  if (!article) {
    return jsonResponse(404, { success: false, error: 'Article not found.' })
  }

  if (user!.role !== 'admin') {
    const companyError = ensureCompanyAccess(user!.companyId, article.companyId)
    if (companyError) return companyError
  }

  const settings = await getLearningResourcesSettings(article.companyId)
  if (!settings.articlesEnabled) {
    return jsonResponse(403, {
      success: false,
      error: 'Articles are not enabled for your company.',
    })
  }

  return jsonResponse(200, { success: true, data: article })
}

export const listEmployeeFlashCardsHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const companyId = request.query.get('companyId')
  if (!companyId) {
    return jsonResponse(400, { success: false, error: 'companyId is required.' })
  }

  const settings = await getLearningResourcesSettings(companyId)
  if (!settings.flashCardsEnabled) {
    return jsonResponse(403, {
      success: false,
      error: 'Flash cards are not enabled for your company.',
    })
  }

  const limit = request.query.get('limit')
  const cursor = request.query.get('cursor')
  const query = 'SELECT * FROM c WHERE c.companyId = @companyId ORDER BY c.createdAt DESC'
  const parameters: SqlParameter[] = [{ name: '@companyId', value: companyId }]
  const countQuery = 'SELECT VALUE COUNT(1) FROM c WHERE c.companyId = @companyId'
  const container = await getContainer(FLASH_CARDS_CONTAINER, '/companyId')

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

export const getEmployeeLearningResourcesSettingsHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const companyId = request.query.get('companyId')
  if (!companyId) {
    return jsonResponse(400, { success: false, error: 'companyId is required.' })
  }

  const settings = await getLearningResourcesSettings(companyId)
  return jsonResponse(200, { success: true, data: settings })
}

app.http('employeeLearningResourcesSettings', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'employee/learning-resources-settings',
  handler: async (request) => {
    const user = await getAuthenticatedUser(request)
    const authError = requireEmployee(user)
    if (authError) return authError

    const companyId = request.query.get('companyId')
    if (!companyId) {
      return jsonResponse(400, { success: false, error: 'companyId is required.' })
    }

    if (user!.role !== 'admin') {
      const companyError = ensureCompanyAccess(user!.companyId, companyId)
      if (companyError) return companyError
    }

    return getEmployeeLearningResourcesSettingsHandler(request)
  },
})

app.http('employeeArticles', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'employee/articles',
  handler: async (request) => {
    const user = await getAuthenticatedUser(request)
    const authError = requireEmployee(user)
    if (authError) return authError

    const companyId = request.query.get('companyId')
    if (!companyId) {
      return jsonResponse(400, { success: false, error: 'companyId is required.' })
    }

    if (user!.role !== 'admin') {
      const companyError = ensureCompanyAccess(user!.companyId, companyId)
      if (companyError) return companyError
    }

    return listEmployeeArticlesHandler(request)
  },
})

app.http('employeeArticleTopics', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'employee/article-topics',
  handler: async (request) => {
    const user = await getAuthenticatedUser(request)
    const authError = requireEmployee(user)
    if (authError) return authError

    const companyId = request.query.get('companyId')
    if (!companyId) {
      return jsonResponse(400, { success: false, error: 'companyId is required.' })
    }

    if (user!.role !== 'admin') {
      const companyError = ensureCompanyAccess(user!.companyId, companyId)
      if (companyError) return companyError
    }

    return listEmployeeArticleTopicsHandler(request)
  },
})

app.http('employeeArticleItem', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'employee/articles/{articleId}',
  handler: getEmployeeArticleHandler,
})

app.http('employeeFlashCards', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'employee/flash-cards',
  handler: async (request) => {
    const user = await getAuthenticatedUser(request)
    const authError = requireEmployee(user)
    if (authError) return authError

    const companyId = request.query.get('companyId')
    if (!companyId) {
      return jsonResponse(400, { success: false, error: 'companyId is required.' })
    }

    if (user!.role !== 'admin') {
      const companyError = ensureCompanyAccess(user!.companyId, companyId)
      if (companyError) return companyError
    }

    return listEmployeeFlashCardsHandler(request)
  },
})
