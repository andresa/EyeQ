import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions'
import { getContainer } from './cosmos.js'
import { jsonResponse, parseJsonBody } from './http.js'
import { createId, nowIso, formatUserName } from './utils.js'
import { getAuthenticatedUser, requireManager, requireRole } from './auth.js'
import { USERS_CONTAINER, USERS_PARTITION_KEY, NOT_DELETED_FILTER } from './userTypes.js'

// ============================================================================
// Types
// ============================================================================

type LeaderboardType = 'top_average_score' | 'top_single_test_score'
type LeaderboardPeriod = 'week' | 'month'
type LeaderboardDisplayLimit = 'top5' | 'full'

interface LeaderboardBoardConfig {
  type: LeaderboardType
  period: LeaderboardPeriod
  displayLimit: LeaderboardDisplayLimit
}

interface LeaderboardSettingsDoc {
  id: string
  companyId: string
  boards: LeaderboardBoardConfig[]
  updatedAt: string
  updatedBy: string
}

const LEADERBOARD_SETTINGS_CONTAINER = 'leaderboardSettings'
const LEADERBOARD_SETTINGS_PARTITION_KEY = '/companyId'

const MAX_PERIOD_LOOKBACK = 3
const VALID_TYPES: LeaderboardType[] = ['top_average_score', 'top_single_test_score']
const VALID_PERIODS: LeaderboardPeriod[] = ['week', 'month']
const VALID_DISPLAY_LIMITS: LeaderboardDisplayLimit[] = ['top5', 'full']

// ============================================================================
// Period Calculation
// ============================================================================

export function getPeriodBounds(
  period: LeaderboardPeriod,
  offset: number = 0,
): { start: string; end: string; label: string } {
  const now = new Date()

  if (period === 'month') {
    const year = now.getFullYear()
    const month = now.getMonth() + offset
    const d = new Date(year, month, 1)
    const start = new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0))
    const end = new Date(Date.UTC(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999))
    const label = start.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    })
    return { start: start.toISOString(), end: end.toISOString(), label }
  }

  // Week: Monday 00:00 to Sunday 23:59
  const day = now.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday + offset * 7)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const start = new Date(
    Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate(), 0, 0, 0, 0),
  )
  const end = new Date(
    Date.UTC(sunday.getFullYear(), sunday.getMonth(), sunday.getDate(), 23, 59, 59, 999),
  )

  const startLabel = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
  const endLabel = end.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
  const label = `${startLabel} – ${endLabel}`

  return { start: start.toISOString(), end: end.toISOString(), label }
}

// ============================================================================
// Aggregation
// ============================================================================

interface AggregatedEntry {
  employeeId: string
  employeeName: string
  score: number
  testCount: number
}

function aggregateScores(
  instances: { employeeId: string; score: number }[],
  employeeMap: Map<string, string>,
  type: LeaderboardType,
): AggregatedEntry[] {
  const grouped = new Map<string, number[]>()

  for (const inst of instances) {
    if (inst.score == null) continue
    const scores = grouped.get(inst.employeeId)
    if (scores) {
      scores.push(inst.score)
    } else {
      grouped.set(inst.employeeId, [inst.score])
    }
  }

  const entries: AggregatedEntry[] = []
  for (const [employeeId, scores] of grouped) {
    const employeeName = employeeMap.get(employeeId) ?? 'Unknown Employee'
    const testCount = scores.length

    let score: number
    if (type === 'top_average_score') {
      const sum = scores.reduce((a, b) => a + b, 0)
      score = Math.round((sum / testCount) * 100) / 100
    } else {
      score = Math.max(...scores)
    }

    entries.push({ employeeId, employeeName, score, testCount })
  }

  entries.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (b.testCount !== a.testCount) return b.testCount - a.testCount
    return a.employeeName.localeCompare(b.employeeName)
  })

  return entries
}

// ============================================================================
// Settings Handlers
// ============================================================================

function validateBoardConfig(board: LeaderboardBoardConfig): string | null {
  if (!VALID_TYPES.includes(board.type)) {
    return `Invalid leaderboard type: ${board.type}`
  }
  if (!VALID_PERIODS.includes(board.period)) {
    return `Invalid period: ${board.period}`
  }
  if (!VALID_DISPLAY_LIMITS.includes(board.displayLimit)) {
    return `Invalid display limit: ${board.displayLimit}`
  }
  return null
}

export const getLeaderboardSettingsHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const companyId = request.query.get('companyId')
  if (!companyId) {
    return jsonResponse(400, { success: false, error: 'companyId is required.' })
  }

  const container = await getContainer(
    LEADERBOARD_SETTINGS_CONTAINER,
    LEADERBOARD_SETTINGS_PARTITION_KEY,
  )
  const { resources } = await container.items
    .query({
      query: 'SELECT * FROM c WHERE c.companyId = @companyId',
      parameters: [{ name: '@companyId', value: companyId }],
    })
    .fetchAll()

  const doc = resources[0] as LeaderboardSettingsDoc | undefined
  return jsonResponse(200, {
    success: true,
    data: { boards: doc?.boards ?? [] },
  })
}

interface UpdateSettingsBody {
  companyId: string
  boards: LeaderboardBoardConfig[]
}

export const updateLeaderboardSettingsHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const user = await getAuthenticatedUser(request)
  const authError = requireManager(user)
  if (authError) return authError

  const body = await parseJsonBody<UpdateSettingsBody>(request)
  if (!body?.companyId || !Array.isArray(body.boards)) {
    return jsonResponse(400, {
      success: false,
      error: 'companyId and boards array are required.',
    })
  }

  if (user!.role !== 'admin' && user!.companyId !== body.companyId) {
    return jsonResponse(403, {
      success: false,
      error: 'You can only update settings for your own company.',
    })
  }

  if (body.boards.length > 2) {
    return jsonResponse(400, {
      success: false,
      error: 'Maximum 2 leaderboard boards allowed.',
    })
  }

  for (const board of body.boards) {
    const err = validateBoardConfig(board)
    if (err) {
      return jsonResponse(400, { success: false, error: err })
    }
  }

  const container = await getContainer(
    LEADERBOARD_SETTINGS_CONTAINER,
    LEADERBOARD_SETTINGS_PARTITION_KEY,
  )

  const { resources } = await container.items
    .query({
      query: 'SELECT * FROM c WHERE c.companyId = @companyId',
      parameters: [{ name: '@companyId', value: body.companyId }],
    })
    .fetchAll()

  const existing = resources[0] as LeaderboardSettingsDoc | undefined

  if (existing) {
    const updated: LeaderboardSettingsDoc = {
      ...existing,
      boards: body.boards,
      updatedAt: nowIso(),
      updatedBy: user!.id,
    }
    await container.item(existing.id, body.companyId).replace(updated)
    return jsonResponse(200, { success: true, data: { boards: updated.boards } })
  }

  const doc: LeaderboardSettingsDoc = {
    id: createId('lbsettings'),
    companyId: body.companyId,
    boards: body.boards,
    updatedAt: nowIso(),
    updatedBy: user!.id,
  }
  await container.items.create(doc)
  return jsonResponse(200, { success: true, data: { boards: doc.boards } })
}

// ============================================================================
// Leaderboard Data Handler
// ============================================================================

export const getLeaderboardHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const companyId = request.query.get('companyId')
  const boardIndexStr = request.query.get('boardIndex')
  if (!companyId || boardIndexStr == null) {
    return jsonResponse(400, {
      success: false,
      error: 'companyId and boardIndex are required.',
    })
  }

  const boardIndex = parseInt(boardIndexStr, 10)
  if (isNaN(boardIndex) || boardIndex < 0 || boardIndex > 1) {
    return jsonResponse(400, {
      success: false,
      error: 'boardIndex must be 0 or 1.',
    })
  }

  const periodOffset = parseInt(request.query.get('periodOffset') ?? '0', 10)
  if (periodOffset < -MAX_PERIOD_LOOKBACK) {
    return jsonResponse(400, {
      success: false,
      error: `Cannot look back more than ${MAX_PERIOD_LOOKBACK} periods.`,
    })
  }

  // Load settings
  const settingsContainer = await getContainer(
    LEADERBOARD_SETTINGS_CONTAINER,
    LEADERBOARD_SETTINGS_PARTITION_KEY,
  )
  const { resources: settingsDocs } = await settingsContainer.items
    .query({
      query: 'SELECT * FROM c WHERE c.companyId = @companyId',
      parameters: [{ name: '@companyId', value: companyId }],
    })
    .fetchAll()

  const settings = settingsDocs[0] as LeaderboardSettingsDoc | undefined
  if (!settings || boardIndex >= settings.boards.length) {
    return jsonResponse(404, {
      success: false,
      error: 'Leaderboard board not found.',
    })
  }

  const board = settings.boards[boardIndex]
  const { start, end, label } = getPeriodBounds(board.period, periodOffset)

  // Get employees for the company
  const usersContainer = await getContainer(USERS_CONTAINER, USERS_PARTITION_KEY)
  const { resources: employees } = await usersContainer.items
    .query({
      query: `SELECT c.id, c.firstName, c.middleName, c.lastName FROM c WHERE c.companyId = @companyId AND c.role = 'employee' AND c.isActive = true AND ${NOT_DELETED_FILTER}`,
      parameters: [{ name: '@companyId', value: companyId }],
    })
    .fetchAll()

  const employeeMap = new Map<string, string>()
  for (const emp of employees) {
    employeeMap.set(emp.id, formatUserName(emp))
  }

  // Get test IDs for the company
  const testsContainer = await getContainer('tests', '/companyId')
  const { resources: tests } = await testsContainer.items
    .query({
      query: 'SELECT c.id FROM c WHERE c.companyId = @companyId',
      parameters: [{ name: '@companyId', value: companyId }],
    })
    .fetchAll()

  const testIds = tests.map((t) => t.id)
  if (testIds.length === 0) {
    return jsonResponse(200, {
      success: true,
      data: {
        board,
        periodLabel: label,
        periodStart: start,
        periodEnd: end,
        entries: [],
        total: 0,
        offset: 0,
        limit: 0,
      },
    })
  }

  // Query marked test instances in the period
  const instancesContainer = await getContainer('testInstances', '/employeeId')
  const { resources: instances } = await instancesContainer.items
    .query({
      query: `SELECT c.employeeId, c.score FROM c
        WHERE ARRAY_CONTAINS(@testIds, c.testId)
          AND c.status = 'marked'
          AND c.completedAt >= @start
          AND c.completedAt <= @end
          AND c.score != null`,
      parameters: [
        { name: '@testIds', value: testIds },
        { name: '@start', value: start },
        { name: '@end', value: end },
      ],
    })
    .fetchAll()

  // Aggregate and rank (only employees present in the active-employee map)
  const allEntries = aggregateScores(instances, employeeMap, board.type).filter((e) =>
    employeeMap.has(e.employeeId),
  )

  // Pagination
  let offset = parseInt(request.query.get('offset') ?? '0', 10)
  let limit = parseInt(request.query.get('limit') ?? '50', 10)

  if (board.displayLimit === 'top5') {
    offset = 0
    limit = 5
  }

  const total = allEntries.length
  const pageEntries = allEntries.slice(offset, offset + limit).map((entry, i) => ({
    rank: offset + i + 1,
    ...entry,
  }))

  return jsonResponse(200, {
    success: true,
    data: {
      board,
      periodLabel: label,
      periodStart: start,
      periodEnd: end,
      entries: pageEntries,
      total,
      offset,
      limit,
    },
  })
}

// ============================================================================
// Route Registration
// ============================================================================

app.http('getLeaderboardSettings', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'shared/leaderboard-settings',
  handler: async (request) => {
    const user = await getAuthenticatedUser(request)
    const authError = requireRole(user, ['employee', 'manager'])
    if (authError) return authError

    if (user!.role !== 'admin') {
      const companyId = request.query.get('companyId')
      if (companyId && user!.companyId !== companyId) {
        return jsonResponse(403, {
          success: false,
          error: 'You can only view settings for your own company.',
        })
      }
    }

    return getLeaderboardSettingsHandler(request)
  },
})

app.http('updateLeaderboardSettings', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'shared/leaderboard-settings',
  handler: updateLeaderboardSettingsHandler,
})

app.http('getLeaderboard', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'shared/leaderboard',
  handler: async (request) => {
    const user = await getAuthenticatedUser(request)
    const authError = requireRole(user, ['employee', 'manager'])
    if (authError) return authError

    if (user!.role !== 'admin') {
      const companyId = request.query.get('companyId')
      if (companyId && user!.companyId !== companyId) {
        return jsonResponse(403, {
          success: false,
          error: 'You can only view leaderboards for your own company.',
        })
      }
    }

    return getLeaderboardHandler(request)
  },
})
