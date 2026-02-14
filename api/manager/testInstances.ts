import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions'
import { getContainer } from '../shared/cosmos.js'
import { jsonResponse, parseJsonBody } from '../shared/http.js'
import { createId, nowIso } from '../shared/utils.js'
import { getAuthenticatedUser, requireManager } from '../shared/auth.js'

export const listTestInstancesHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const testId = request.query.get('testId')
  const container = await getContainer('testInstances', '/employeeId')
  if (testId) {
    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.testId = @testId',
        parameters: [{ name: '@testId', value: testId }],
      })
      .fetchAll()
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
    return jsonResponse(200, { success: true, data: [] })
  }

  const { resources } = await container.items
    .query({
      query: 'SELECT * FROM c WHERE ARRAY_CONTAINS(@testIds, c.testId)',
      parameters: [{ name: '@testIds', value: testIds }],
    })
    .fetchAll()
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
