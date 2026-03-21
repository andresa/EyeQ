import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockContainer, mockRequest } from '../../helpers/api-helpers'

const settingsContainer = createMockContainer().container
const usersContainer = createMockContainer().container
const testsContainer = createMockContainer().container
const instancesContainer = createMockContainer().container

vi.mock('../../../api/shared/cosmos', () => ({
  getContainer: vi.fn().mockImplementation((name: string) => {
    if (name === 'leaderboardSettings') return Promise.resolve(settingsContainer)
    if (name === 'users') return Promise.resolve(usersContainer)
    if (name === 'tests') return Promise.resolve(testsContainer)
    if (name === 'testInstances') return Promise.resolve(instancesContainer)
    return Promise.resolve(createMockContainer().container)
  }),
}))

vi.mock('../../../api/shared/auth', () => ({
  getAuthenticatedUser: vi.fn(),
  requireManager: vi.fn(),
  requireRole: vi.fn(),
}))

import {
  getLeaderboardSettingsHandler,
  updateLeaderboardSettingsHandler,
  getLeaderboardHandler,
  getPeriodBounds,
} from '../../../api/shared/leaderboard'
import { getAuthenticatedUser, requireManager } from '../../../api/shared/auth'

const managerUser = {
  id: 'mgr_1',
  email: 'm@t.com',
  firstName: 'M',
  lastName: 'G',
  role: 'manager' as const,
  companyId: 'c1',
  userType: 'manager' as const,
}

const employeeUser = {
  id: 'emp_1',
  email: 'e@t.com',
  firstName: 'E',
  lastName: 'P',
  role: 'employee' as const,
  companyId: 'c1',
  userType: 'employee' as const,
}

function resetContainers() {
  for (const c of [
    settingsContainer,
    usersContainer,
    testsContainer,
    instancesContainer,
  ]) {
    c.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
    })
    c.items.create.mockResolvedValue({ resource: {} })
    c.item.mockReturnValue({
      read: vi.fn().mockResolvedValue({ resource: null }),
      replace: vi.fn().mockResolvedValue({}),
      delete: vi.fn(),
    })
  }
}

function setupManager() {
  vi.mocked(getAuthenticatedUser).mockResolvedValue(managerUser)
  vi.mocked(requireManager).mockReturnValue(null)
  resetContainers()
}

// ============================================================================
// getPeriodBounds
// ============================================================================

describe('getPeriodBounds', () => {
  it('returns month bounds for current month (offset 0)', () => {
    const { start, end, label } = getPeriodBounds('month', 0)
    const s = new Date(start)
    const e = new Date(end)

    expect(s.getUTCDate()).toBe(1)
    expect(s.getUTCHours()).toBe(0)
    expect(e.getUTCHours()).toBe(23)
    expect(e.getUTCMinutes()).toBe(59)
    expect(label).toBeTruthy()
  })

  it('returns previous month bounds with offset -1', () => {
    const { start } = getPeriodBounds('month', -1)
    const s = new Date(start)
    const now = new Date()
    const expectedMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1
    expect(s.getUTCMonth()).toBe(expectedMonth)
  })

  it('returns week bounds starting on Monday', () => {
    const { start, end } = getPeriodBounds('week', 0)
    const s = new Date(start)
    const e = new Date(end)

    // Monday = 1
    expect(s.getUTCDay()).toBe(1)
    // Sunday = 0
    expect(e.getUTCDay()).toBe(0)
  })

  it('returns previous week bounds with offset -1', () => {
    const current = getPeriodBounds('week', 0)
    const prev = getPeriodBounds('week', -1)
    expect(new Date(prev.start).getTime()).toBeLessThan(new Date(current.start).getTime())
  })

  it('week label contains date range', () => {
    const { label } = getPeriodBounds('week', 0)
    expect(label).toContain('–')
  })
})

// ============================================================================
// getLeaderboardSettingsHandler
// ============================================================================

describe('getLeaderboardSettingsHandler', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 400 when companyId missing', async () => {
    resetContainers()
    const request = mockRequest({})
    const response = await getLeaderboardSettingsHandler(request)
    expect(response.status).toBe(400)
  })

  it('returns empty boards when no settings exist', async () => {
    resetContainers()
    const request = mockRequest({ query: { companyId: 'c1' } })
    const response = await getLeaderboardSettingsHandler(request)

    expect(response.status).toBe(200)
    expect(response.jsonBody?.data).toEqual({ boards: [] })
  })

  it('returns boards from existing settings', async () => {
    resetContainers()
    const boards = [{ type: 'top_average_score', period: 'month', displayLimit: 'top5' }]
    settingsContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({
        resources: [{ id: 's1', companyId: 'c1', boards }],
      }),
    })

    const request = mockRequest({ query: { companyId: 'c1' } })
    const response = await getLeaderboardSettingsHandler(request)

    expect(response.status).toBe(200)
    expect(response.jsonBody?.data?.boards).toEqual(boards)
  })
})

// ============================================================================
// updateLeaderboardSettingsHandler
// ============================================================================

describe('updateLeaderboardSettingsHandler', () => {
  beforeEach(() => vi.clearAllMocks())

  it('requires manager role (returns 403 for employee)', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(employeeUser)
    vi.mocked(requireManager).mockReturnValue({
      status: 403,
      jsonBody: { success: false, error: 'Forbidden.' },
    })
    resetContainers()

    const request = mockRequest({
      method: 'PUT',
      body: { companyId: 'c1', boards: [] },
    })
    const response = await updateLeaderboardSettingsHandler(request)
    expect(response.status).toBe(403)
  })

  it('returns 400 when body missing', async () => {
    setupManager()
    const request = mockRequest({ method: 'PUT', body: null })
    const response = await updateLeaderboardSettingsHandler(request)
    expect(response.status).toBe(400)
  })

  it('returns 400 when more than 2 boards', async () => {
    setupManager()
    const boards = [
      { type: 'top_average_score', period: 'month', displayLimit: 'top5' },
      { type: 'top_single_test_score', period: 'week', displayLimit: 'full' },
      { type: 'top_average_score', period: 'week', displayLimit: 'top5' },
    ]
    const request = mockRequest({
      method: 'PUT',
      body: { companyId: 'c1', boards },
    })
    const response = await updateLeaderboardSettingsHandler(request)
    expect(response.status).toBe(400)
    expect(response.jsonBody?.error).toContain('Maximum 2')
  })

  it('returns 400 for invalid type', async () => {
    setupManager()
    const request = mockRequest({
      method: 'PUT',
      body: {
        companyId: 'c1',
        boards: [{ type: 'invalid', period: 'month', displayLimit: 'top5' }],
      },
    })
    const response = await updateLeaderboardSettingsHandler(request)
    expect(response.status).toBe(400)
    expect(response.jsonBody?.error).toContain('Invalid leaderboard type')
  })

  it('returns 400 for invalid period', async () => {
    setupManager()
    const request = mockRequest({
      method: 'PUT',
      body: {
        companyId: 'c1',
        boards: [{ type: 'top_average_score', period: 'year', displayLimit: 'top5' }],
      },
    })
    const response = await updateLeaderboardSettingsHandler(request)
    expect(response.status).toBe(400)
    expect(response.jsonBody?.error).toContain('Invalid period')
  })

  it('returns 400 for invalid displayLimit', async () => {
    setupManager()
    const request = mockRequest({
      method: 'PUT',
      body: {
        companyId: 'c1',
        boards: [{ type: 'top_average_score', period: 'month', displayLimit: 'top100' }],
      },
    })
    const response = await updateLeaderboardSettingsHandler(request)
    expect(response.status).toBe(400)
    expect(response.jsonBody?.error).toContain('Invalid display limit')
  })

  it('creates new settings when none exist', async () => {
    setupManager()
    const boards = [{ type: 'top_average_score', period: 'month', displayLimit: 'top5' }]
    const request = mockRequest({
      method: 'PUT',
      body: { companyId: 'c1', boards },
    })

    const response = await updateLeaderboardSettingsHandler(request)
    expect(response.status).toBe(200)
    expect(response.jsonBody?.data?.boards).toEqual(boards)
    expect(settingsContainer.items.create).toHaveBeenCalledOnce()
  })

  it('updates existing settings', async () => {
    setupManager()
    const existing = {
      id: 's1',
      companyId: 'c1',
      boards: [],
      updatedAt: '',
      updatedBy: '',
    }
    settingsContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({ resources: [existing] }),
    })

    const boards = [
      { type: 'top_single_test_score', period: 'week', displayLimit: 'full' },
    ]
    const request = mockRequest({
      method: 'PUT',
      body: { companyId: 'c1', boards },
    })

    const response = await updateLeaderboardSettingsHandler(request)
    expect(response.status).toBe(200)
    expect(response.jsonBody?.data?.boards).toEqual(boards)

    const replaceCall = settingsContainer.item.mock.results[0]?.value
    expect(replaceCall?.replace).toHaveBeenCalled()
  })

  it('returns 403 for manager from different company', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      ...managerUser,
      companyId: 'other_company',
    })
    vi.mocked(requireManager).mockReturnValue(null)
    resetContainers()

    const request = mockRequest({
      method: 'PUT',
      body: { companyId: 'c1', boards: [] },
    })
    const response = await updateLeaderboardSettingsHandler(request)
    expect(response.status).toBe(403)
  })

  it('allows saving empty boards array', async () => {
    setupManager()
    const request = mockRequest({
      method: 'PUT',
      body: { companyId: 'c1', boards: [] },
    })
    const response = await updateLeaderboardSettingsHandler(request)
    expect(response.status).toBe(200)
    expect(response.jsonBody?.data?.boards).toEqual([])
  })
})

// ============================================================================
// getLeaderboardHandler
// ============================================================================

describe('getLeaderboardHandler', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 400 when companyId missing', async () => {
    resetContainers()
    const request = mockRequest({ query: { boardIndex: '0' } })
    const response = await getLeaderboardHandler(request)
    expect(response.status).toBe(400)
  })

  it('returns 400 when boardIndex missing', async () => {
    resetContainers()
    const request = mockRequest({ query: { companyId: 'c1' } })
    const response = await getLeaderboardHandler(request)
    expect(response.status).toBe(400)
  })

  it('returns 400 for invalid boardIndex', async () => {
    resetContainers()
    const request = mockRequest({ query: { companyId: 'c1', boardIndex: '5' } })
    const response = await getLeaderboardHandler(request)
    expect(response.status).toBe(400)
  })

  it('returns 404 when board not configured', async () => {
    resetContainers()
    settingsContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({
        resources: [{ id: 's1', companyId: 'c1', boards: [] }],
      }),
    })

    const request = mockRequest({ query: { companyId: 'c1', boardIndex: '0' } })
    const response = await getLeaderboardHandler(request)
    expect(response.status).toBe(404)
  })

  it('returns empty entries when no tests exist for company', async () => {
    resetContainers()
    const board = { type: 'top_average_score', period: 'month', displayLimit: 'top5' }
    settingsContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({
        resources: [{ id: 's1', companyId: 'c1', boards: [board] }],
      }),
    })
    usersContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
    })
    testsContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
    })

    const request = mockRequest({ query: { companyId: 'c1', boardIndex: '0' } })
    const response = await getLeaderboardHandler(request)

    expect(response.status).toBe(200)
    expect(response.jsonBody?.data?.entries).toEqual([])
    expect(response.jsonBody?.data?.total).toBe(0)
  })

  it('computes correct average scores', async () => {
    resetContainers()
    const board = { type: 'top_average_score', period: 'month', displayLimit: 'full' }
    settingsContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({
        resources: [{ id: 's1', companyId: 'c1', boards: [board] }],
      }),
    })
    usersContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({
        resources: [
          { id: 'e1', firstName: 'Alice', lastName: 'Adams' },
          { id: 'e2', firstName: 'Bob', lastName: 'Brown' },
        ],
      }),
    })
    testsContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({ resources: [{ id: 't1' }] }),
    })

    instancesContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({
        resources: [
          { employeeId: 'e1', score: 80 },
          { employeeId: 'e1', score: 90 },
          { employeeId: 'e2', score: 100 },
        ],
      }),
    })

    const request = mockRequest({
      query: { companyId: 'c1', boardIndex: '0' },
    })
    const response = await getLeaderboardHandler(request)

    expect(response.status).toBe(200)
    const entries = response.jsonBody?.data?.entries
    expect(entries).toHaveLength(2)
    // Bob: 100 avg, 1 test; Alice: 85 avg, 2 tests
    expect(entries[0].employeeName).toBe('Bob Brown')
    expect(entries[0].score).toBe(100)
    expect(entries[0].testCount).toBe(1)
    expect(entries[0].rank).toBe(1)

    expect(entries[1].employeeName).toBe('Alice Adams')
    expect(entries[1].score).toBe(85)
    expect(entries[1].testCount).toBe(2)
    expect(entries[1].rank).toBe(2)
  })

  it('computes correct top single-test scores', async () => {
    resetContainers()
    const board = { type: 'top_single_test_score', period: 'month', displayLimit: 'full' }
    settingsContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({
        resources: [{ id: 's1', companyId: 'c1', boards: [board] }],
      }),
    })
    usersContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({
        resources: [
          { id: 'e1', firstName: 'Alice', lastName: 'Adams' },
          { id: 'e2', firstName: 'Bob', lastName: 'Brown' },
        ],
      }),
    })
    testsContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({ resources: [{ id: 't1' }] }),
    })
    instancesContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({
        resources: [
          { employeeId: 'e1', score: 60 },
          { employeeId: 'e1', score: 95 },
          { employeeId: 'e2', score: 90 },
        ],
      }),
    })

    const request = mockRequest({
      query: { companyId: 'c1', boardIndex: '0' },
    })
    const response = await getLeaderboardHandler(request)

    expect(response.status).toBe(200)
    const entries = response.jsonBody?.data?.entries
    // Alice top = 95 (2 tests); Bob top = 90 (1 test)
    expect(entries[0].employeeName).toBe('Alice Adams')
    expect(entries[0].score).toBe(95)
    expect(entries[1].employeeName).toBe('Bob Brown')
    expect(entries[1].score).toBe(90)
  })

  it('breaks ties by test count (descending)', async () => {
    resetContainers()
    const board = { type: 'top_average_score', period: 'month', displayLimit: 'full' }
    settingsContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({
        resources: [{ id: 's1', companyId: 'c1', boards: [board] }],
      }),
    })
    usersContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({
        resources: [
          { id: 'e1', firstName: 'Alice', lastName: 'Adams' },
          { id: 'e2', firstName: 'Bob', lastName: 'Brown' },
        ],
      }),
    })
    testsContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({ resources: [{ id: 't1' }] }),
    })
    instancesContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({
        resources: [
          { employeeId: 'e1', score: 80 },
          { employeeId: 'e2', score: 80 },
          { employeeId: 'e2', score: 80 },
        ],
      }),
    })

    const request = mockRequest({
      query: { companyId: 'c1', boardIndex: '0' },
    })
    const response = await getLeaderboardHandler(request)

    const entries = response.jsonBody?.data?.entries
    // Both avg 80, but Bob has 2 tests, Alice has 1
    expect(entries[0].employeeName).toBe('Bob Brown')
    expect(entries[1].employeeName).toBe('Alice Adams')
  })

  it('breaks ties by name (ascending) when score and count equal', async () => {
    resetContainers()
    const board = { type: 'top_average_score', period: 'month', displayLimit: 'full' }
    settingsContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({
        resources: [{ id: 's1', companyId: 'c1', boards: [board] }],
      }),
    })
    usersContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({
        resources: [
          { id: 'e1', firstName: 'Charlie', lastName: 'Chaplin' },
          { id: 'e2', firstName: 'Alice', lastName: 'Adams' },
        ],
      }),
    })
    testsContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({ resources: [{ id: 't1' }] }),
    })
    instancesContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({
        resources: [
          { employeeId: 'e1', score: 90 },
          { employeeId: 'e2', score: 90 },
        ],
      }),
    })

    const request = mockRequest({
      query: { companyId: 'c1', boardIndex: '0' },
    })
    const response = await getLeaderboardHandler(request)

    const entries = response.jsonBody?.data?.entries
    // Same score, same count → alphabetical: Alice before Charlie
    expect(entries[0].employeeName).toBe('Alice Adams')
    expect(entries[1].employeeName).toBe('Charlie Chaplin')
  })

  it('excludes employees with null scores', async () => {
    resetContainers()
    const board = { type: 'top_average_score', period: 'month', displayLimit: 'full' }
    settingsContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({
        resources: [{ id: 's1', companyId: 'c1', boards: [board] }],
      }),
    })
    usersContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({
        resources: [{ id: 'e1', firstName: 'Alice', lastName: 'Adams' }],
      }),
    })
    testsContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({ resources: [{ id: 't1' }] }),
    })
    instancesContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({
        resources: [{ employeeId: 'e1', score: null }],
      }),
    })

    const request = mockRequest({
      query: { companyId: 'c1', boardIndex: '0' },
    })
    const response = await getLeaderboardHandler(request)

    expect(response.jsonBody?.data?.entries).toHaveLength(0)
  })

  it('shows Unknown Employee for deleted employees', async () => {
    resetContainers()
    const board = { type: 'top_average_score', period: 'month', displayLimit: 'full' }
    settingsContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({
        resources: [{ id: 's1', companyId: 'c1', boards: [board] }],
      }),
    })
    usersContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
    })
    testsContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({ resources: [{ id: 't1' }] }),
    })
    instancesContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({
        resources: [{ employeeId: 'deleted_emp', score: 90 }],
      }),
    })

    const request = mockRequest({
      query: { companyId: 'c1', boardIndex: '0' },
    })
    const response = await getLeaderboardHandler(request)

    expect(response.jsonBody?.data?.entries[0].employeeName).toBe('Unknown Employee')
  })

  it('limits to top 5 when displayLimit is top5', async () => {
    resetContainers()
    const board = { type: 'top_average_score', period: 'month', displayLimit: 'top5' }
    settingsContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({
        resources: [{ id: 's1', companyId: 'c1', boards: [board] }],
      }),
    })

    const employees = Array.from({ length: 10 }, (_, i) => ({
      id: `e${i}`,
      firstName: `Emp`,
      lastName: `${i}`,
    }))
    usersContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({ resources: employees }),
    })
    testsContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({ resources: [{ id: 't1' }] }),
    })

    const instances = employees.map((e, i) => ({
      employeeId: e.id,
      score: 100 - i,
    }))
    instancesContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({ resources: instances }),
    })

    const request = mockRequest({
      query: { companyId: 'c1', boardIndex: '0' },
    })
    const response = await getLeaderboardHandler(request)

    expect(response.jsonBody?.data?.entries).toHaveLength(5)
    expect(response.jsonBody?.data?.total).toBe(10)
    expect(response.jsonBody?.data?.entries[0].rank).toBe(1)
    expect(response.jsonBody?.data?.entries[4].rank).toBe(5)
  })

  it('paginates with offset and limit', async () => {
    resetContainers()
    const board = { type: 'top_average_score', period: 'month', displayLimit: 'full' }
    settingsContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({
        resources: [{ id: 's1', companyId: 'c1', boards: [board] }],
      }),
    })

    const employees = Array.from({ length: 5 }, (_, i) => ({
      id: `e${i}`,
      firstName: `Emp`,
      lastName: `${i}`,
    }))
    usersContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({ resources: employees }),
    })
    testsContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({ resources: [{ id: 't1' }] }),
    })
    instancesContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({
        resources: employees.map((e, i) => ({
          employeeId: e.id,
          score: 100 - i * 5,
        })),
      }),
    })

    const request = mockRequest({
      query: { companyId: 'c1', boardIndex: '0', offset: '2', limit: '2' },
    })
    const response = await getLeaderboardHandler(request)

    expect(response.jsonBody?.data?.entries).toHaveLength(2)
    expect(response.jsonBody?.data?.total).toBe(5)
    expect(response.jsonBody?.data?.offset).toBe(2)
    expect(response.jsonBody?.data?.entries[0].rank).toBe(3)
  })

  it('returns period metadata in response', async () => {
    resetContainers()
    const board = { type: 'top_average_score', period: 'month', displayLimit: 'top5' }
    settingsContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({
        resources: [{ id: 's1', companyId: 'c1', boards: [board] }],
      }),
    })
    usersContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
    })
    testsContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({ resources: [{ id: 't1' }] }),
    })
    instancesContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
    })

    const request = mockRequest({
      query: { companyId: 'c1', boardIndex: '0' },
    })
    const response = await getLeaderboardHandler(request)

    expect(response.jsonBody?.data?.periodLabel).toBeTruthy()
    expect(response.jsonBody?.data?.periodStart).toBeTruthy()
    expect(response.jsonBody?.data?.periodEnd).toBeTruthy()
    expect(response.jsonBody?.data?.board).toEqual(board)
  })

  it('handles boardIndex 1 for second board', async () => {
    resetContainers()
    const boards = [
      { type: 'top_average_score', period: 'month', displayLimit: 'top5' },
      { type: 'top_single_test_score', period: 'week', displayLimit: 'full' },
    ]
    settingsContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({
        resources: [{ id: 's1', companyId: 'c1', boards }],
      }),
    })
    usersContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
    })
    testsContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({ resources: [{ id: 't1' }] }),
    })
    instancesContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
    })

    const request = mockRequest({
      query: { companyId: 'c1', boardIndex: '1' },
    })
    const response = await getLeaderboardHandler(request)

    expect(response.status).toBe(200)
    expect(response.jsonBody?.data?.board).toEqual(boards[1])
  })

  it('rounds average scores to 2 decimal places', async () => {
    resetContainers()
    const board = { type: 'top_average_score', period: 'month', displayLimit: 'full' }
    settingsContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({
        resources: [{ id: 's1', companyId: 'c1', boards: [board] }],
      }),
    })
    usersContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({
        resources: [{ id: 'e1', firstName: 'Alice', lastName: 'A' }],
      }),
    })
    testsContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({ resources: [{ id: 't1' }] }),
    })
    instancesContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({
        resources: [
          { employeeId: 'e1', score: 85 },
          { employeeId: 'e1', score: 90 },
          { employeeId: 'e1', score: 92 },
        ],
      }),
    })

    const request = mockRequest({
      query: { companyId: 'c1', boardIndex: '0' },
    })
    const response = await getLeaderboardHandler(request)

    // (85 + 90 + 92) / 3 = 89.0 (exact)
    const score = response.jsonBody?.data?.entries[0].score
    expect(score).toBe(89)
  })

  it('handles period offset for previous month', async () => {
    resetContainers()
    const board = { type: 'top_average_score', period: 'month', displayLimit: 'top5' }
    settingsContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({
        resources: [{ id: 's1', companyId: 'c1', boards: [board] }],
      }),
    })
    usersContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
    })
    testsContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({ resources: [{ id: 't1' }] }),
    })
    instancesContainer.items.query.mockReturnValue({
      fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
    })

    const request = mockRequest({
      query: { companyId: 'c1', boardIndex: '0', periodOffset: '-1' },
    })
    const response = await getLeaderboardHandler(request)

    expect(response.status).toBe(200)
    const periodStart = new Date(response.jsonBody?.data?.periodStart)
    const now = new Date()
    expect(periodStart.getUTCMonth()).not.toBe(now.getUTCMonth())
  })
})
