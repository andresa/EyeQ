import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions'
import { getContainer } from '../shared/cosmos.js'
import { jsonResponse, parseJsonBody } from '../shared/http.js'
import { createId, nowIso } from '../shared/utils.js'
import { getAuthenticatedUser, requireManager } from '../shared/auth.js'

interface TestSettings {
  allowBackNavigation: boolean
}

interface TestBody {
  companyId?: string
  managerId?: string
  name?: string
  sections?: unknown[]
  settings?: TestSettings
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
      query:
        'SELECT * FROM c WHERE c.companyId = @companyId AND (c.isActive = true OR NOT IS_DEFINED(c.isActive))',
      parameters: [{ name: '@companyId', value: companyId }],
    })
    .fetchAll()
  return jsonResponse(200, { success: true, data: resources })
}

export const createTestHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  // Verify manager role
  const user = await getAuthenticatedUser(request)
  const authError = requireManager(user)
  if (authError) return authError

  const body = await parseJsonBody<TestBody>(request)
  if (!body?.companyId || !body.managerId || !body.name || !body.sections) {
    return jsonResponse(400, {
      success: false,
      error: 'companyId, managerId, name, and sections are required.',
    })
  }

  // Managers can only create tests in their own company
  if (user!.role !== 'admin' && user!.companyId !== body.companyId) {
    return jsonResponse(403, {
      success: false,
      error: 'You can only create tests in your own company.',
    })
  }

  const test = {
    id: createId('test'),
    companyId: body.companyId,
    managerId: body.managerId,
    name: body.name,
    sections: body.sections,
    settings: body.settings ?? { allowBackNavigation: false },
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
  // Verify manager role
  const user = await getAuthenticatedUser(request)
  const authError = requireManager(user)
  if (authError) return authError

  const testId = request.params.testId
  if (!testId) {
    return jsonResponse(400, { success: false, error: 'testId is required.' })
  }
  const body = await parseJsonBody<TestBody>(request)
  const existing = await getTestById(testId)
  if (!existing) {
    return jsonResponse(404, { success: false, error: 'Test not found.' })
  }

  // Managers can only update tests in their own company
  if (user!.role !== 'admin' && user!.companyId !== existing.companyId) {
    return jsonResponse(403, {
      success: false,
      error: 'You can only update tests in your own company.',
    })
  }

  const updated = {
    ...existing,
    name: body?.name ?? existing.name,
    sections: body?.sections ?? existing.sections,
    settings: body?.settings ?? existing.settings,
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
  // Verify manager role
  const user = await getAuthenticatedUser(request)
  const authError = requireManager(user)
  if (authError) return authError

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

  // Managers can only assign tests from their own company
  if (user!.role !== 'admin' && user!.companyId !== test.companyId) {
    return jsonResponse(403, {
      success: false,
      error: 'You can only assign tests from your own company.',
    })
  }

  const container = await getContainer('testInstances', '/employeeId')
  const created = []
  for (const employeeId of body.employeeIds) {
    const instance = {
      id: createId('instance'),
      testId,
      employeeId,
      assignedByManagerId: test.managerId,
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

interface TestOption {
  id: string
  label: string
  [key: string]: unknown
}

interface TestComponent {
  id: string
  options?: TestOption[]
  [key: string]: unknown
}

interface TestSection {
  id: string
  components?: TestComponent[]
  [key: string]: unknown
}

const cloneSections = (sections: TestSection[]) =>
  sections.map((section) => ({
    ...section,
    id: createId('section'),
    components: (section.components || []).map((component: TestComponent) => ({
      ...component,
      id: createId('component'),
      options: (component.options || []).map((option: TestOption) => ({
        ...option,
        id: createId('option'),
      })),
    })),
  }))

export const duplicateTestHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  // Verify manager role
  const user = await getAuthenticatedUser(request)
  const authError = requireManager(user)
  if (authError) return authError

  const testId = request.params.testId
  if (!testId) {
    return jsonResponse(400, { success: false, error: 'testId is required.' })
  }

  const existing = await getTestById(testId)
  if (!existing) {
    return jsonResponse(404, { success: false, error: 'Test not found.' })
  }

  // Managers can only duplicate tests from their own company
  if (user!.role !== 'admin' && user!.companyId !== existing.companyId) {
    return jsonResponse(403, {
      success: false,
      error: 'You can only duplicate tests from your own company.',
    })
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
  // Verify manager role
  const user = await getAuthenticatedUser(request)
  const authError = requireManager(user)
  if (authError) return authError

  const testId = request.params.testId
  if (!testId) {
    return jsonResponse(400, { success: false, error: 'testId is required.' })
  }

  const existing = await getTestById(testId)
  if (!existing) {
    return jsonResponse(404, { success: false, error: 'Test not found.' })
  }

  // Managers can only delete tests from their own company
  if (user!.role !== 'admin' && user!.companyId !== existing.companyId) {
    return jsonResponse(403, {
      success: false,
      error: 'You can only delete tests from your own company.',
    })
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

app.http('managerTests', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'manager/tests',
  handler: async (request) => {
    // Verify manager role
    const user = await getAuthenticatedUser(request)
    const authError = requireManager(user)
    if (authError) return authError

    if (request.method === 'GET') {
      // Verify user can only list tests from their own company
      const companyId = request.query.get('companyId')
      if (user!.role !== 'admin' && user!.companyId !== companyId) {
        return jsonResponse(403, {
          success: false,
          error: 'You can only view tests from your own company.',
        })
      }
      return listTestsHandler(request)
    }
    return createTestHandler(request)
  },
})

app.http('managerTestUpdate', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'manager/tests/{testId}',
  handler: updateTestHandler,
})

app.http('managerAssignTest', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'manager/tests/{testId}/assign',
  handler: assignTestHandler,
})

app.http('managerDuplicateTest', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'manager/tests/{testId}/duplicate',
  handler: duplicateTestHandler,
})

app.http('managerDeleteTest', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'manager/tests/{testId}',
  handler: deleteTestHandler,
})
