import type { SqlParameter } from '@azure/cosmos'
import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions'
import { getContainer } from '../shared/cosmos.js'
import { jsonResponse, paginatedJsonResponse, parseJsonBody } from '../shared/http.js'
import { createId, nowIso } from '../shared/utils.js'
import { getAuthenticatedUser, requireManager } from '../shared/auth.js'
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from '../shared/pagination.js'

const normalisePageLimit = (limit?: string | null) => {
  const parsed = limit ? Number.parseInt(limit, 10) : DEFAULT_PAGE_LIMIT
  if (!parsed || Number.isNaN(parsed) || parsed < 1) {
    return DEFAULT_PAGE_LIMIT
  }
  return Math.min(parsed, MAX_PAGE_LIMIT)
}

const encodeOffsetCursor = (offset: number) =>
  Buffer.from(String(offset), 'utf8').toString('base64url')

const decodeOffsetCursor = (cursor?: string | null) => {
  if (!cursor) return 0
  try {
    const parsed = Number.parseInt(Buffer.from(cursor, 'base64url').toString('utf8'), 10)
    return Number.isNaN(parsed) || parsed < 0 ? 0 : parsed
  } catch {
    return 0
  }
}

const fetchOffsetPaginatedResults = async <T>(
  container: Awaited<ReturnType<typeof getContainer>>,
  querySpec: { query: string; parameters: SqlParameter[] },
  countQuery: { query: string; parameters: SqlParameter[] },
  limitParam?: string | null,
  cursor?: string | null,
) => {
  const limit = normalisePageLimit(limitParam)
  const offset = decodeOffsetCursor(cursor)
  const pageQuery = {
    query: `${querySpec.query} OFFSET @offset LIMIT @limit`,
    parameters: [
      ...querySpec.parameters,
      { name: '@offset', value: offset },
      { name: '@limit', value: limit },
    ],
  }

  const [pageResult, countResult] = await Promise.all([
    container.items.query<T>(pageQuery).fetchAll(),
    container.items.query<number>(countQuery).fetchAll(),
  ])

  const total = countResult?.resources?.[0]
  const nextOffset = offset + (pageResult.resources?.length ?? 0)
  const nextCursor =
    typeof total === 'number' && nextOffset < total
      ? encodeOffsetCursor(nextOffset)
      : null

  return {
    items: pageResult.resources ?? [],
    total: typeof total === 'number' ? total : undefined,
    nextCursor,
  }
}

export const listTestInstancesHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const testId = request.query.get('testId')
  const employeeIds = (request.query.get('employeeIds') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  const statuses = (request.query.get('statuses') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  const assignedAfter = request.query.get('assignedAfter')
  const assignedBefore = request.query.get('assignedBefore')
  const limit = request.query.get('limit')
  const cursor = request.query.get('cursor')
  const container = await getContainer('testInstances', '/employeeId')

  const buildQuery = (baseClause: string, parameters: SqlParameter[]) => {
    let whereClause = baseClause
    const queryParameters: SqlParameter[] = [...parameters]

    if (employeeIds.length > 0) {
      whereClause += ' AND ARRAY_CONTAINS(@employeeIds, c.employeeId)'
      queryParameters.push({ name: '@employeeIds', value: employeeIds })
    }

    if (statuses.length > 0) {
      whereClause += ' AND ARRAY_CONTAINS(@statuses, c.status)'
      queryParameters.push({ name: '@statuses', value: statuses })
    }

    if (assignedAfter) {
      whereClause += ' AND c.assignedAt >= @assignedAfter'
      queryParameters.push({ name: '@assignedAfter', value: assignedAfter })
    }

    if (assignedBefore) {
      whereClause += ' AND c.assignedAt <= @assignedBefore'
      queryParameters.push({ name: '@assignedBefore', value: assignedBefore })
    }

    return {
      pageQuery: {
        query: `SELECT * ${whereClause} ORDER BY c.assignedAt DESC`,
        parameters: queryParameters,
      },
      countQuery: {
        query: `SELECT VALUE COUNT(1) ${whereClause}`,
        parameters: queryParameters,
      },
    }
  }

  if (testId) {
    const querySpec = buildQuery('FROM c WHERE c.testId = @testId', [
      { name: '@testId', value: testId },
    ])

    if (limit) {
      const page = await fetchOffsetPaginatedResults(
        container,
        querySpec.pageQuery,
        querySpec.countQuery,
        limit,
        cursor,
      )
      return paginatedJsonResponse(200, page)
    }

    const { resources } = await container.items.query(querySpec.pageQuery).fetchAll()
    return jsonResponse(200, { success: true, data: resources })
  }

  const companyId = request.query.get('companyId')
  if (!companyId) {
    return jsonResponse(400, {
      success: false,
      error: 'companyId is required when testId is not provided.',
    })
  }

  const testsContainer = await getContainer('tests', '/companyId')
  const { resources: tests } = await testsContainer.items
    .query({
      query: 'SELECT c.id FROM c WHERE c.companyId = @companyId',
      parameters: [{ name: '@companyId', value: companyId }],
    })
    .fetchAll()

  const testIds = tests.map((test) => test.id)
  if (testIds.length === 0) {
    if (limit) {
      return paginatedJsonResponse(200, { items: [], nextCursor: null, total: 0 })
    }
    return jsonResponse(200, { success: true, data: [] })
  }

  const querySpec = buildQuery('FROM c WHERE ARRAY_CONTAINS(@testIds, c.testId)', [
    { name: '@testIds', value: testIds },
  ])

  if (limit) {
    const page = await fetchOffsetPaginatedResults(
      container,
      querySpec.pageQuery,
      querySpec.countQuery,
      limit,
      cursor,
    )
    return paginatedJsonResponse(200, page)
  }

  const { resources } = await container.items.query(querySpec.pageQuery).fetchAll()
  return jsonResponse(200, { success: true, data: resources })
}

interface MarkBody {
  marks?: {
    questionId: string
    isCorrect?: boolean | null
    note?: string | null
    correctAnswer?: string | string[] | null
  }[]
  markedByManagerId?: string
  markedAt?: string
}

export const getTestInstanceResultsHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const instanceId = request.params.instanceId
  if (!instanceId) {
    return jsonResponse(400, { success: false, error: 'instanceId is required.' })
  }

  const instanceContainer = await getContainer('testInstances', '/employeeId')
  const { resources } = await instanceContainer.items
    .query({
      query: 'SELECT * FROM c WHERE c.id = @id',
      parameters: [{ name: '@id', value: instanceId }],
    })
    .fetchAll()
  const instance = resources[0]
  if (!instance) {
    return jsonResponse(404, { success: false, error: 'Test instance not found.' })
  }

  const testContainer = await getContainer('tests', '/companyId')
  const { resources: tests } = await testContainer.items
    .query({
      query: 'SELECT * FROM c WHERE c.id = @id',
      parameters: [{ name: '@id', value: instance.testId }],
    })
    .fetchAll()
  const test = tests[0]
  if (!test) {
    return jsonResponse(404, { success: false, error: 'Test template not found.' })
  }

  const responsesContainer = await getContainer('responses', '/testInstanceId')
  const { resources: responses } = await responsesContainer.items
    .query({
      query: 'SELECT * FROM c WHERE c.testInstanceId = @testInstanceId',
      parameters: [{ name: '@testInstanceId', value: instanceId }],
    })
    .fetchAll()

  return jsonResponse(200, { success: true, data: { instance, test, responses } })
}

export const markTestInstanceHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  // Verify manager role
  const user = await getAuthenticatedUser(request)
  const authError = requireManager(user)
  if (authError) return authError

  const instanceId = request.params.instanceId
  if (!instanceId) {
    return jsonResponse(400, { success: false, error: 'instanceId is required.' })
  }
  const body = await parseJsonBody<MarkBody>(request)
  if (!body?.marks || body.marks.length === 0) {
    return jsonResponse(400, { success: false, error: 'marks are required.' })
  }

  const instanceContainer = await getContainer('testInstances', '/employeeId')
  const { resources } = await instanceContainer.items
    .query({
      query: 'SELECT * FROM c WHERE c.id = @id',
      parameters: [{ name: '@id', value: instanceId }],
    })
    .fetchAll()
  const instance = resources[0]
  if (!instance) {
    return jsonResponse(404, { success: false, error: 'Test instance not found.' })
  }

  // Verify the test belongs to the manager's company
  const testContainer = await getContainer('tests', '/companyId')
  const { resources: tests } = await testContainer.items
    .query({
      query: 'SELECT * FROM c WHERE c.id = @id',
      parameters: [{ name: '@id', value: instance.testId }],
    })
    .fetchAll()
  const test = tests[0]
  if (!test) {
    return jsonResponse(404, { success: false, error: 'Test template not found.' })
  }

  // Managers can only mark tests from their own company
  if (user!.role !== 'admin' && user!.companyId !== test.companyId) {
    return jsonResponse(403, {
      success: false,
      error: 'You can only mark tests from your own company.',
    })
  }

  const responsesContainer = await getContainer('responses', '/testInstanceId')
  const { resources: responses } = await responsesContainer.items
    .query({
      query: 'SELECT * FROM c WHERE c.testInstanceId = @testInstanceId',
      parameters: [{ name: '@testInstanceId', value: instanceId }],
    })
    .fetchAll()

  const responseMap = new Map(
    responses.map((response) => [response.questionId, response]),
  )

  const markedAt = body.markedAt || nowIso()
  for (const mark of body.marks) {
    const existing = responseMap.get(mark.questionId)
    if (existing) {
      const updated = {
        ...existing,
        isCorrect: mark.isCorrect ?? existing.isCorrect ?? null,
        note: mark.note ?? existing.note ?? null,
        correctAnswer: mark.correctAnswer ?? existing.correctAnswer ?? null,
        markedAt,
        markedByManagerId: body.markedByManagerId ?? existing.markedByManagerId,
      }
      await responsesContainer.item(existing.id, instanceId).replace(updated)
    } else {
      const record = {
        id: createId('response'),
        testInstanceId: instanceId,
        questionId: mark.questionId,
        answer: null,
        textAnswer: null,
        correctAnswer: mark.correctAnswer ?? null,
        isCorrect: mark.isCorrect ?? null,
        note: mark.note ?? null,
        markedAt,
        markedByManagerId: body.markedByManagerId,
        createdAt: nowIso(),
      }
      await responsesContainer.items.create(record)
    }
  }

  const correctCount = body.marks.filter((mark) => mark.isCorrect).length
  const scoreValue = body.marks.length
    ? Math.round((correctCount / body.marks.length) * 100)
    : null

  const updatedInstance = {
    ...instance,
    status: 'marked',
    markedAt,
    score: scoreValue,
  }

  await instanceContainer.item(instance.id, instance.employeeId).replace(updatedInstance)

  return jsonResponse(200, { success: true, data: updatedInstance })
}

app.http('managerTestInstances', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'manager/testInstances',
  handler: async (request) => {
    // Verify manager role
    const user = await getAuthenticatedUser(request)
    const authError = requireManager(user)
    if (authError) return authError

    // Verify user can only list test instances from their own company
    const companyId = request.query.get('companyId')
    const testId = request.query.get('testId')

    if (testId) {
      // If filtering by testId, verify the test belongs to the user's company
      const testContainer = await getContainer('tests', '/companyId')
      const { resources: tests } = await testContainer.items
        .query({
          query: 'SELECT * FROM c WHERE c.id = @id',
          parameters: [{ name: '@id', value: testId }],
        })
        .fetchAll()
      const test = tests[0]
      if (test && user!.role !== 'admin' && user!.companyId !== test.companyId) {
        return jsonResponse(403, {
          success: false,
          error: 'You can only view test instances from your own company.',
        })
      }
    } else if (companyId && user!.role !== 'admin' && user!.companyId !== companyId) {
      return jsonResponse(403, {
        success: false,
        error: 'You can only view test instances from your own company.',
      })
    }

    return listTestInstancesHandler(request)
  },
})

app.http('managerTestInstanceResults', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'manager/testInstances/{instanceId}',
  handler: async (request) => {
    // Verify manager role
    const user = await getAuthenticatedUser(request)
    const authError = requireManager(user)
    if (authError) return authError

    // Note: Additional company ownership check could be added here
    // For now, we rely on the manager role check
    return getTestInstanceResultsHandler(request)
  },
})

app.http('managerTestInstanceMark', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'manager/testInstances/{instanceId}/mark',
  handler: markTestInstanceHandler,
})
