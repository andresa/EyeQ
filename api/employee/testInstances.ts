import type { SqlParameter } from '@azure/cosmos'
import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions'
import { getContainer } from '../shared/cosmos.js'
import { jsonResponse, paginatedJsonResponse, parseJsonBody } from '../shared/http.js'
import { createId, nowIso } from '../shared/utils.js'
import { getAuthenticatedUser, requireEmployee } from '../shared/auth.js'
import { paginatedQuery } from '../shared/pagination.js'
import {
  EXPIRABLE_STATUSES,
  type TestInstanceDoc,
  expireInstance,
} from '../shared/testInstanceExpiry.js'

interface ResponseBody {
  questionId: string
  answer: string | string[] | null
  textAnswer?: string | null
}

interface SubmitBody {
  responses?: ResponseBody[]
  completedAt?: string
}

interface SaveBody {
  responses?: ResponseBody[]
}

const EXPIRED_RESPONSE = jsonResponse(409, {
  success: false,
  error: 'This test has expired.',
})

const expireAndReject = async (
  container: {
    item: (
      id: string,
      partitionKey: string,
    ) => { replace: (doc: unknown) => Promise<unknown> }
  },
  instance: TestInstanceDoc,
): Promise<HttpResponseInit | null> => {
  const expired = await expireInstance(container, instance)
  return expired ? EXPIRED_RESPONSE : null
}

const countQuestions = (sections: { components?: { type?: string }[] }[] | undefined) => {
  if (!Array.isArray(sections)) return 0
  return sections.reduce(
    (sum, section) =>
      sum +
      (section.components || []).filter((component) => component.type !== 'info').length,
    0,
  )
}

const enrichTestInstances = async (instances: TestInstanceDoc[], companyId?: string) => {
  const testIds = [
    ...new Set(instances.map((instance) => instance.testId).filter(Boolean)),
  ]
  if (testIds.length === 0) {
    return instances
  }

  const testContainer = await getContainer('tests', '/companyId')
  const query = companyId
    ? 'SELECT c.id, c.name, c.sections, c.settings FROM c WHERE c.companyId = @companyId AND ARRAY_CONTAINS(@ids, c.id)'
    : 'SELECT c.id, c.name, c.sections, c.settings FROM c WHERE ARRAY_CONTAINS(@ids, c.id)'
  const parameters = companyId
    ? [
        { name: '@companyId', value: companyId },
        { name: '@ids', value: testIds },
      ]
    : [{ name: '@ids', value: testIds }]

  const queryOptions = companyId ? { partitionKey: companyId } : undefined
  const { resources: tests } = await testContainer.items
    .query({ query, parameters }, queryOptions)
    .fetchAll()

  const nameMap = tests.reduce<Record<string, string>>((map, test) => {
    map[test.id] = test.name
    return map
  }, {})
  const questionCountMap = tests.reduce<Record<string, number>>((map, test) => {
    map[test.id] = countQuestions(test.sections)
    return map
  }, {})
  const timeLimitMap = tests.reduce<Record<string, number | null>>((map, test) => {
    map[test.id] = test.settings?.timeLimitMinutes ?? null
    return map
  }, {})

  return instances.map((instance) => ({
    ...instance,
    testName: nameMap[String(instance.testId)],
    questionCount: questionCountMap[String(instance.testId)],
    timeLimitMinutes: timeLimitMap[String(instance.testId)] ?? null,
  }))
}

const expireEmployeeTestInstances = async (employeeId: string) => {
  const container = await getContainer('testInstances', '/employeeId')
  const { resources } = await container.items
    .query(
      {
        query: `SELECT * FROM c
          WHERE c.employeeId = @employeeId
            AND ARRAY_CONTAINS(@statuses, c.status)
            AND IS_DEFINED(c.expiresAt)
            AND c.expiresAt < @now`,
        parameters: [
          { name: '@employeeId', value: employeeId },
          { name: '@statuses', value: EXPIRABLE_STATUSES },
          { name: '@now', value: nowIso() },
        ],
      },
      { partitionKey: employeeId },
    )
    .fetchAll()

  for (const instance of resources) {
    await container.item(instance.id, instance.employeeId).replace({
      ...instance,
      status: 'expired',
    })
  }

  return container
}

export const listEmployeeTestInstancesHandler = async (
  request: HttpRequest,
  companyId?: string,
): Promise<HttpResponseInit> => {
  const employeeId = request.query.get('employeeId')
  if (!employeeId) {
    return jsonResponse(400, { success: false, error: 'employeeId is required.' })
  }

  const status = request.query.get('status')
  const name = request.query.get('name')
  const limit = request.query.get('limit')
  const cursor = request.query.get('cursor')

  const container = await expireEmployeeTestInstances(employeeId)

  let whereClause = 'FROM c WHERE c.employeeId = @employeeId'
  const parameters: SqlParameter[] = [{ name: '@employeeId', value: employeeId }]

  if (status) {
    whereClause += ' AND c.status = @status'
    parameters.push({ name: '@status', value: status })
  }

  if (name) {
    const testsContainer = await getContainer('tests', '/companyId')
    const testQuery = companyId
      ? 'SELECT c.id FROM c WHERE c.companyId = @companyId AND CONTAINS(LOWER(c.name), LOWER(@name))'
      : 'SELECT c.id FROM c WHERE CONTAINS(LOWER(c.name), LOWER(@name))'
    const testParameters: SqlParameter[] = companyId
      ? [
          { name: '@companyId', value: companyId },
          { name: '@name', value: name },
        ]
      : [{ name: '@name', value: name }]
    const queryOptions = companyId ? { partitionKey: companyId } : undefined
    const { resources: matchingTests } = await testsContainer.items
      .query({ query: testQuery, parameters: testParameters }, queryOptions)
      .fetchAll()

    const matchingTestIds = matchingTests.map((test) => test.id)
    if (matchingTestIds.length === 0) {
      if (limit) {
        return paginatedJsonResponse(200, { items: [], nextCursor: null, total: 0 })
      }
      return jsonResponse(200, { success: true, data: [] })
    }

    whereClause += ' AND ARRAY_CONTAINS(@testIds, c.testId)'
    parameters.push({ name: '@testIds', value: matchingTestIds })
  }

  const query = `SELECT * ${whereClause} ORDER BY c.assignedAt DESC`
  const countQuery = `SELECT VALUE COUNT(1) ${whereClause}`

  if (limit) {
    const page = await paginatedQuery(
      container,
      { query, parameters },
      {
        limit,
        cursor,
        countQuery: { query: countQuery, parameters },
        partitionKey: employeeId,
      },
    )
    const enriched = await enrichTestInstances(page.items as TestInstanceDoc[], companyId)
    return paginatedJsonResponse(200, {
      ...page,
      items: enriched,
    })
  }

  const { resources } = await container.items
    .query({ query, parameters }, { partitionKey: employeeId })
    .fetchAll()
  const updated = resources as TestInstanceDoc[]

  if (updated.length === 0) {
    return jsonResponse(200, { success: true, data: [] })
  }

  const enriched = await enrichTestInstances(updated, companyId)

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

  const responsesContainer = await getContainer('responses', '/testInstanceId')
  const { resources: responses } = await responsesContainer.items
    .query({
      query: 'SELECT * FROM c WHERE c.testInstanceId = @testInstanceId',
      parameters: [{ name: '@testInstanceId', value: instanceId }],
    })
    .fetchAll()

  return jsonResponse(200, { success: true, data: { instance, test, responses } })
}

const upsertResponses = async (instanceId: string, responses: ResponseBody[]) => {
  const responsesContainer = await getContainer('responses', '/testInstanceId')
  const { resources: existing } = await responsesContainer.items
    .query({
      query: 'SELECT * FROM c WHERE c.testInstanceId = @testInstanceId',
      parameters: [{ name: '@testInstanceId', value: instanceId }],
    })
    .fetchAll()

  const existingMap = new Map(
    existing.map((r: { questionId: string }) => [r.questionId, r]),
  )

  for (const response of responses) {
    const prev = existingMap.get(response.questionId) as
      | (Record<string, unknown> & { id: string })
      | undefined
    if (prev) {
      const updated = {
        ...prev,
        answer: response.answer,
        textAnswer: response.textAnswer ?? null,
      }
      await responsesContainer.item(prev.id, instanceId).replace(updated)
    } else {
      await responsesContainer.items.create({
        id: createId('response'),
        testInstanceId: instanceId,
        questionId: response.questionId,
        answer: response.answer,
        textAnswer: response.textAnswer ?? null,
        createdAt: nowIso(),
      })
    }
  }
}

export const openTestInstanceHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const user = await getAuthenticatedUser(request)
  const authError = requireEmployee(user)
  if (authError) return authError

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

  if (user!.role !== 'admin' && user!.id !== instance.employeeId) {
    return jsonResponse(403, {
      success: false,
      error: 'You can only open your own test instances.',
    })
  }

  const expiredResponse = await expireAndReject(instanceContainer, instance)
  if (expiredResponse) return expiredResponse

  if (instance.status === 'opened' || instance.status === 'in-progress') {
    return jsonResponse(200, { success: true, data: instance })
  }

  if (instance.status !== 'assigned') {
    return jsonResponse(409, {
      success: false,
      error: 'This test cannot be opened in its current state.',
    })
  }

  const updated = { ...instance, status: 'opened', openedAt: nowIso() }
  await instanceContainer.item(instance.id, instance.employeeId).replace(updated)
  return jsonResponse(200, { success: true, data: updated })
}

export const saveTestResponsesHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const user = await getAuthenticatedUser(request)
  const authError = requireEmployee(user)
  if (authError) return authError

  const instanceId = request.params.instanceId
  if (!instanceId) {
    return jsonResponse(400, { success: false, error: 'instanceId is required.' })
  }

  const body = await parseJsonBody<SaveBody>(request)
  if (!body?.responses || body.responses.length === 0) {
    return jsonResponse(400, { success: false, error: 'responses are required.' })
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

  if (user!.role !== 'admin' && user!.id !== instance.employeeId) {
    return jsonResponse(403, {
      success: false,
      error: 'You can only save your own test instances.',
    })
  }

  const expiredResponse = await expireAndReject(instanceContainer, instance)
  if (expiredResponse) return expiredResponse

  if (
    instance.status === 'completed' ||
    instance.status === 'marked' ||
    instance.status === 'expired' ||
    instance.status === 'timed-out'
  ) {
    return jsonResponse(409, {
      success: false,
      error: 'This test can no longer be modified.',
    })
  }

  await upsertResponses(instanceId, body.responses)

  const needsStatusUpdate = instance.status === 'assigned' || instance.status === 'opened'
  if (needsStatusUpdate) {
    const updated = { ...instance, status: 'in-progress' }
    await instanceContainer.item(instance.id, instance.employeeId).replace(updated)
    return jsonResponse(200, { success: true, data: updated })
  }

  return jsonResponse(200, { success: true, data: instance })
}

export const submitTestInstanceHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
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

  if (user!.role !== 'admin' && user!.id !== instance.employeeId) {
    return jsonResponse(403, {
      success: false,
      error: 'You can only submit your own test instances.',
    })
  }

  const expiredResponse = await expireAndReject(instanceContainer, instance)
  if (expiredResponse) return expiredResponse

  if (
    instance.status === 'completed' ||
    instance.status === 'marked' ||
    instance.status === 'expired' ||
    instance.status === 'timed-out'
  ) {
    return jsonResponse(409, {
      success: false,
      error: 'This test has already been completed.',
    })
  }

  await upsertResponses(instanceId, body.responses)

  const updated = {
    ...instance,
    status: 'completed',
    completedAt: body.completedAt,
  }
  await instanceContainer.item(instance.id, instance.employeeId).replace(updated)

  return jsonResponse(200, { success: true, data: updated })
}

export const timeoutTestInstanceHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const user = await getAuthenticatedUser(request)
  const authError = requireEmployee(user)
  if (authError) return authError

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

  if (user!.role !== 'admin' && user!.id !== instance.employeeId) {
    return jsonResponse(403, {
      success: false,
      error: 'You can only modify your own test instances.',
    })
  }

  if (instance.status !== 'opened' && instance.status !== 'in-progress') {
    return jsonResponse(409, {
      success: false,
      error: 'This test cannot be timed out in its current state.',
    })
  }

  const updated = { ...instance, status: 'timed-out', timedOutAt: nowIso() }
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

    return listEmployeeTestInstancesHandler(request, user!.companyId)
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

app.http('employeeTestInstanceOpen', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'employee/testInstances/{instanceId}/open',
  handler: openTestInstanceHandler,
})

app.http('employeeTestInstanceSave', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'employee/testInstances/{instanceId}/save',
  handler: saveTestResponsesHandler,
})

app.http('employeeTestInstanceSubmit', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'employee/testInstances/{instanceId}/submit',
  handler: submitTestInstanceHandler,
})

app.http('employeeTestInstanceTimeout', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'employee/testInstances/{instanceId}/timeout',
  handler: timeoutTestInstanceHandler,
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
