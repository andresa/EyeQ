import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions'
import { getContainer } from '../shared/cosmos.js'
import { jsonResponse, parseJsonBody } from '../shared/http.js'
import { createId, nowIso } from '../shared/utils.js'

interface TestBody {
  companyId?: string
  employerId?: string
  name?: string
  sections?: unknown[]
  isActive?: boolean
}

interface AssignBody {
  employeeIds?: string[]
  expiresAt?: string
}

const getTestById = async (testId: string) => {
  const container = await getContainer('tests', '/companyId')
  const { resources } = await container.items
    .query({
      query: 'SELECT * FROM c WHERE c.id = @id',
      parameters: [{ name: '@id', value: testId }],
    })
    .fetchAll()
  return resources[0]
}

export const listTestsHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const companyId = request.query.get('companyId')
  if (!companyId) {
    return jsonResponse(400, { success: false, error: 'companyId is required.' })
  }
  const container = await getContainer('tests', '/companyId')
  const { resources } = await container.items
    .query({
      query: 'SELECT * FROM c WHERE c.companyId = @companyId AND (c.isActive = true OR NOT IS_DEFINED(c.isActive))',
      parameters: [{ name: '@companyId', value: companyId }],
    })
    .fetchAll()
  return jsonResponse(200, { success: true, data: resources })
}

export const createTestHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const body = await parseJsonBody<TestBody>(request)
  if (!body?.companyId || !body.employerId || !body.name || !body.sections) {
    return jsonResponse(400, {
      success: false,
      error: 'companyId, employerId, name, and sections are required.',
    })
  }

  const test = {
    id: createId('test'),
    companyId: body.companyId,
    employerId: body.employerId,
    name: body.name,
    sections: body.sections,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    isActive: true,
  }

  const container = await getContainer('tests', '/companyId')
  await container.items.create(test)
  return jsonResponse(201, { success: true, data: test })
}

export const updateTestHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const testId = request.params.testId
  if (!testId) {
    return jsonResponse(400, { success: false, error: 'testId is required.' })
  }
  const body = await parseJsonBody<TestBody>(request)
  const existing = await getTestById(testId)
  if (!existing) {
    return jsonResponse(404, { success: false, error: 'Test not found.' })
  }

  const updated = {
    ...existing,
    name: body?.name ?? existing.name,
    sections: body?.sections ?? existing.sections,
    isActive: body?.isActive ?? existing.isActive,
    updatedAt: nowIso(),
  }

  const container = await getContainer('tests', '/companyId')
  await container.item(testId, existing.companyId).replace(updated)
  return jsonResponse(200, { success: true, data: updated })
}

export const assignTestHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const testId = request.params.testId
  const body = await parseJsonBody<AssignBody>(request)
  if (!testId || !body?.employeeIds || body.employeeIds.length === 0) {
    return jsonResponse(400, {
      success: false,
      error: 'testId and employeeIds are required.',
    })
  }

  const test = await getTestById(testId)
  if (!test) {
    return jsonResponse(404, { success: false, error: 'Test not found.' })
  }

  const container = await getContainer('testInstances', '/employeeId')
  const created = []
  for (const employeeId of body.employeeIds) {
    const instance = {
      id: createId('instance'),
      testId,
      employeeId,
      assignedByEmployerId: test.employerId,
      status: 'pending',
      assignedAt: nowIso(),
      expiresAt: body.expiresAt,
      completedAt: null,
      score: null,
    }
    await container.items.create(instance)
    created.push(instance)
  }

  return jsonResponse(201, { success: true, data: created })
}

const cloneSections = (sections: any[]) =>
  sections.map((section) => ({
    ...section,
    id: createId('section'),
    components: (section.components || []).map((component: any) => ({
      ...component,
      id: createId('component'),
      options: (component.options || []).map((option: any) => ({
        ...option,
        id: createId('option'),
      })),
    })),
  }))

export const duplicateTestHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const testId = request.params.testId
  if (!testId) {
    return jsonResponse(400, { success: false, error: 'testId is required.' })
  }

  const existing = await getTestById(testId)
  if (!existing) {
    return jsonResponse(404, { success: false, error: 'Test not found.' })
  }

  const duplicated = {
    ...existing,
    id: createId('test'),
    name: `${existing.name} (Copy)`,
    sections: cloneSections(existing.sections || []),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    isActive: true,
  }

  const container = await getContainer('tests', '/companyId')
  await container.items.create(duplicated)
  return jsonResponse(201, { success: true, data: duplicated })
}

export const deleteTestHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const testId = request.params.testId
  if (!testId) {
    return jsonResponse(400, { success: false, error: 'testId is required.' })
  }

  const existing = await getTestById(testId)
  if (!existing) {
    return jsonResponse(404, { success: false, error: 'Test not found.' })
  }

  const updated = {
    ...existing,
    isActive: false,
    updatedAt: nowIso(),
  }

  const container = await getContainer('tests', '/companyId')
  await container.item(testId, existing.companyId).replace(updated)
  return jsonResponse(200, { success: true, data: updated })
}

app.http('employerTests', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'employer/tests',
  handler: async (request) =>
    request.method === 'GET' ? listTestsHandler(request) : createTestHandler(request),
})

app.http('employerTestUpdate', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'employer/tests/{testId}',
  handler: updateTestHandler,
})

app.http('employerAssignTest', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'employer/tests/{testId}/assign',
  handler: assignTestHandler,
})

app.http('employerDuplicateTest', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'employer/tests/{testId}/duplicate',
  handler: duplicateTestHandler,
})

app.http('employerDeleteTest', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'employer/tests/{testId}',
  handler: deleteTestHandler,
})
