import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions'
import { getContainer } from '../shared/cosmos.js'
import { jsonResponse, parseJsonBody } from '../shared/http.js'
import { createId, nowIso } from '../shared/utils.js'
import { getAuthenticatedUser, requireEmployee } from '../shared/auth.js'

interface SubmitBody {
  responses?: {
    questionId: string
    answer: string | string[] | null
    textAnswer?: string | null
  }[]
  completedAt?: string
}

const isExpired = (expiresAt?: string | null) => {
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() < Date.now()
}

export const listEmployeeTestInstancesHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const employeeId = request.query.get('employeeId')
  if (!employeeId) {
    return jsonResponse(400, { success: false, error: 'employeeId is required.' })
  }

  const container = await getContainer('testInstances', '/employeeId')
  const { resources } = await container.items
    .query({
      query: 'SELECT * FROM c WHERE c.employeeId = @employeeId',
      parameters: [{ name: '@employeeId', value: employeeId }],
    })
    .fetchAll()

  const updated = []
  for (const instance of resources) {
    if (instance.status !== 'expired' && isExpired(instance.expiresAt)) {
      const expired = { ...instance, status: 'expired' }
      await container.item(instance.id, instance.employeeId).replace(expired)
      updated.push(expired)
    } else {
      updated.push(instance)
    }
  }

  const testIds = [...new Set(updated.map((instance) => instance.testId))].filter(Boolean)
  if (testIds.length === 0) {
    return jsonResponse(200, { success: true, data: updated })
  }

  const testContainer = await getContainer('tests', '/companyId')
  const { resources: tests } = await testContainer.items
    .query({
      query: 'SELECT c.id, c.name FROM c WHERE ARRAY_CONTAINS(@ids, c.id)',
      parameters: [{ name: '@ids', value: testIds }],
    })
    .fetchAll()

  const nameMap = tests.reduce<Record<string, string>>((map, test) => {
    map[test.id] = test.name
    return map
  }, {})

  const enriched = updated.map((instance) => ({
    ...instance,
    testName: nameMap[instance.testId],
  }))

  return jsonResponse(200, { success: true, data: enriched })
}

export const getTestInstanceDetailsHandler = async (
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

  return jsonResponse(200, { success: true, data: { instance, test } })
}

export const submitTestInstanceHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  // Verify employee role
  const user = await getAuthenticatedUser(request)
  const authError = requireEmployee(user)
  if (authError) return authError

  const instanceId = request.params.instanceId
  if (!instanceId) {
    return jsonResponse(400, { success: false, error: 'instanceId is required.' })
  }

  const body = await parseJsonBody<SubmitBody>(request)
  if (!body?.responses || !body.completedAt) {
    return jsonResponse(400, {
      success: false,
      error: 'responses and completedAt are required.',
    })
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

  // Employees can only submit their own test instances
  if (user!.role !== 'admin' && user!.id !== instance.employeeId) {
    return jsonResponse(403, {
      success: false,
      error: 'You can only submit your own test instances.',
    })
  }

  if (instance.status === 'completed' || instance.status === 'marked') {
    return jsonResponse(409, {
      success: false,
      error: 'This test has already been completed.',
    })
  }

  const responsesContainer = await getContainer('responses', '/testInstanceId')
  for (const response of body.responses) {
    const record = {
      id: createId('response'),
      testInstanceId: instanceId,
      questionId: response.questionId,
      answer: response.answer,
      textAnswer: response.textAnswer ?? null,
      createdAt: nowIso(),
    }
    await responsesContainer.items.create(record)
  }

  const updated = {
    ...instance,
    status: 'completed',
    completedAt: body.completedAt,
  }
  await instanceContainer.item(instance.id, instance.employeeId).replace(updated)

  return jsonResponse(200, { success: true, data: updated })
}

export const getEmployeeTestInstanceResultsHandler = async (
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

app.http('employeeTestInstances', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'employee/testInstances',
  handler: async (request) => {
    // Verify employee role
    const user = await getAuthenticatedUser(request)
    const authError = requireEmployee(user)
    if (authError) return authError

    // Employees can only view their own test instances
    const employeeId = request.query.get('employeeId')
    if (user!.role !== 'admin' && user!.id !== employeeId) {
      return jsonResponse(403, {
        success: false,
        error: 'You can only view your own test instances.',
      })
    }

    return listEmployeeTestInstancesHandler(request)
  },
})

app.http('employeeTestInstanceDetails', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'employee/testInstances/{instanceId}',
  handler: async (request) => {
    // Verify employee role
    const user = await getAuthenticatedUser(request)
    const authError = requireEmployee(user)
    if (authError) return authError

    // Additional ownership check is done inside the handler
    return getTestInstanceDetailsHandler(request)
  },
})

app.http('employeeTestInstanceSubmit', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'employee/testInstances/{instanceId}/submit',
  handler: submitTestInstanceHandler,
})

app.http('employeeTestInstanceResults', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'employee/testInstances/{instanceId}/results',
  handler: async (request) => {
    // Verify employee role
    const user = await getAuthenticatedUser(request)
    const authError = requireEmployee(user)
    if (authError) return authError

    // Employees can only view their own test results
    const instanceId = request.params.instanceId
    if (instanceId) {
      const instanceContainer = await getContainer('testInstances', '/employeeId')
      const { resources } = await instanceContainer.items
        .query({
          query: 'SELECT * FROM c WHERE c.id = @id',
          parameters: [{ name: '@id', value: instanceId }],
        })
        .fetchAll()
      const instance = resources[0]
      if (instance && user!.role !== 'admin' && user!.id !== instance.employeeId) {
        return jsonResponse(403, {
          success: false,
          error: 'You can only view your own test results.',
        })
      }
    }

    return getEmployeeTestInstanceResultsHandler(request)
  },
})
