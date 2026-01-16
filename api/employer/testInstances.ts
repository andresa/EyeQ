import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions'
import { getContainer } from '../shared/cosmos.js'
import { jsonResponse, parseJsonBody } from '../shared/http.js'
import { createId, nowIso } from '../shared/utils.js'

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
  markedByEmployerId?: string
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
        markedByEmployerId: body.markedByEmployerId ?? existing.markedByEmployerId,
      }
      await responsesContainer
        .item(existing.id, instanceId)
        .replace(updated)
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
        markedByEmployerId: body.markedByEmployerId,
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

  await instanceContainer
    .item(instance.id, instance.employeeId)
    .replace(updatedInstance)

  return jsonResponse(200, { success: true, data: updatedInstance })
}

app.http('employerTestInstances', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'employer/testInstances',
  handler: listTestInstancesHandler,
})

app.http('employerTestInstanceResults', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'employer/testInstances/{instanceId}',
  handler: getTestInstanceResultsHandler,
})

app.http('employerTestInstanceMark', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'employer/testInstances/{instanceId}/mark',
  handler: markTestInstanceHandler,
})
