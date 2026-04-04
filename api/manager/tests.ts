import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions'
import { getContainer } from '../shared/cosmos.js'
import { jsonResponse, paginatedJsonResponse, parseJsonBody } from '../shared/http.js'
import { createId, nowIso } from '../shared/utils.js'
import { getAuthenticatedUser, requireManager } from '../shared/auth.js'
import { paginatedQuery } from '../shared/pagination.js'
import {
  USERS_CONTAINER,
  USERS_PARTITION_KEY,
  NOT_DELETED_FILTER,
} from '../shared/userTypes.js'

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
  const nameFilter = request.query.get('name')
  const limit = request.query.get('limit')
  const cursor = request.query.get('cursor')

  let whereClause =
    'FROM c WHERE c.companyId = @companyId AND (c.isActive = true OR NOT IS_DEFINED(c.isActive))'
  const parameters: { name: string; value: string }[] = [
    { name: '@companyId', value: companyId },
  ]

  if (nameFilter) {
    whereClause += ' AND CONTAINS(LOWER(c.name), LOWER(@name))'
    parameters.push({ name: '@name', value: nameFilter })
  }

  const query = `SELECT * ${whereClause} ORDER BY c.createdAt DESC`
  const countQuery = `SELECT VALUE COUNT(1) ${whereClause}`

  const container = await getContainer('tests', '/companyId')

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

  // Reject inactive employees
  const usersContainer = await getContainer(USERS_CONTAINER, USERS_PARTITION_KEY)
  const { resources: employees } = await usersContainer.items
    .query({
      query: `SELECT c.id, c.isActive FROM c WHERE ARRAY_CONTAINS(@ids, c.id) AND c.companyId = @companyId AND ${NOT_DELETED_FILTER}`,
      parameters: [
        { name: '@ids', value: body.employeeIds },
        { name: '@companyId', value: test.companyId },
      ],
    })
    .fetchAll()

  const employeeMap = new Map(
    employees.map((e: { id: string; isActive: boolean }) => [e.id, e]),
  )
  const inactiveIds = body.employeeIds.filter((id) => {
    const emp = employeeMap.get(id)
    return emp && emp.isActive === false
  })
  if (inactiveIds.length > 0) {
    return jsonResponse(400, {
      success: false,
      error: `Cannot assign test to inactive employee${inactiveIds.length > 1 ? 's' : ''}.`,
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
      status: 'assigned',
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
