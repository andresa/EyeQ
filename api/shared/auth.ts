import {
  app,
  type HttpRequest,
  type HttpResponseInit,
  type InvocationContext,
} from '@azure/functions'
import { getContainer } from './cosmos.js'
import { jsonResponse, parseJsonBody } from './http.js'
import { createId, nowIso } from './utils.js'
import { sendMagicLinkEmail } from './email.js'

type UserRole = 'employee' | 'manager' | 'admin'
type UserType = 'employee' | 'manager' | 'admin'

export interface AuthenticatedUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  companyId: string
  userType: UserType
}

export interface Session {
  id: string
  userId: string
  userType: UserType
  email: string
  token: string
  createdAt: string
  expiresAt: string
  lastUsedAt: string
}

interface MagicLink {
  id: string
  email: string
  token: string
  createdAt: string
  expiresAt: string
  usedAt?: string
}

const MAGIC_LINK_EXPIRY_MINUTES = 15
const SESSION_EXPIRY_DAYS = 30
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://eyeq.azurewebsites.net'

/**
 * Generate a secure random token.
 */
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

/**
 * Find a user by email across all user tables (admins, managers, employees).
 * Returns the user record and their type.
 */
async function findUserByEmail(
  email: string,
): Promise<{ user: Record<string, unknown>; userType: UserType } | null> {
  const normalizedEmail = email.toLowerCase()

  // Check admins
  const adminsContainer = await getContainer('admins', '/id')
  const { resources: admins } = await adminsContainer.items
    .query({
      query: 'SELECT * FROM c WHERE LOWER(c.email) = @email',
      parameters: [{ name: '@email', value: normalizedEmail }],
    })
    .fetchAll()

  if (admins.length > 0) {
    return { user: admins[0], userType: 'admin' }
  }

  // Check managers
  const managersContainer = await getContainer('managers', '/companyId')
  const { resources: managers } = await managersContainer.items
    .query({
      query: 'SELECT * FROM c WHERE LOWER(c.email) = @email',
      parameters: [{ name: '@email', value: normalizedEmail }],
    })
    .fetchAll()

  if (managers.length > 0) {
    return { user: managers[0], userType: 'manager' }
  }

  // Check employees
  const employeesContainer = await getContainer('employees', '/companyId')
  const { resources: employees } = await employeesContainer.items
    .query({
      query: 'SELECT * FROM c WHERE LOWER(c.email) = @email',
      parameters: [{ name: '@email', value: normalizedEmail }],
    })
    .fetchAll()

  if (employees.length > 0) {
    return { user: employees[0], userType: 'employee' }
  }

  return null
}

/**
 * Create a new session for a user.
 */
async function createSession(
  userId: string,
  userType: UserType,
  email: string,
): Promise<Session> {
  const container = await getContainer('sessions', '/id')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  const session: Session = {
    id: createId('sess'),
    userId,
    userType,
    email: email.toLowerCase(),
    token: generateToken(),
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    lastUsedAt: now.toISOString(),
  }

  await container.items.create(session)
  return session
}

/**
 * Get session by token.
 */
async function getSessionByToken(token: string): Promise<Session | null> {
  const container = await getContainer('sessions', '/id')
  const { resources } = await container.items
    .query({
      query: 'SELECT * FROM c WHERE c.token = @token',
      parameters: [{ name: '@token', value: token }],
    })
    .fetchAll()

  if (resources.length === 0) return null
  return resources[0] as Session
}

/**
 * Validate session and update lastUsedAt.
 */
async function validateSession(token: string): Promise<Session | null> {
  const session = await getSessionByToken(token)
  if (!session) return null

  // Check if expired
  if (new Date(session.expiresAt) < new Date()) {
    return null
  }

  // Update lastUsedAt
  const container = await getContainer('sessions', '/id')
  const updated = { ...session, lastUsedAt: nowIso() }
  await container.item(session.id, session.id).replace(updated)

  return updated
}

/**
 * Validate session with logging for debugging.
 */
async function validateSessionWithLogging(
  token: string,
  context: InvocationContext,
): Promise<Session | null> {
  context.log(
    '[validateSession] Looking up session by token:',
    token.substring(0, 10) + '...',
  )
  const session = await getSessionByToken(token)
  if (!session) {
    context.log('[validateSession] No session found for token')
    return null
  }
  context.log(
    '[validateSession] Session found:',
    session.id,
    'expires:',
    session.expiresAt,
  )

  // Check if expired
  const now = new Date()
  const expiresAt = new Date(session.expiresAt)
  if (expiresAt < now) {
    context.log(
      '[validateSession] Session expired. expiresAt:',
      expiresAt.toISOString(),
      'now:',
      now.toISOString(),
    )
    return null
  }

  // Update lastUsedAt
  const container = await getContainer('sessions', '/id')
  const updated = { ...session, lastUsedAt: nowIso() }
  await container.item(session.id, session.id).replace(updated)

  return updated
}

/**
 * Extract bearer token from Authorization header.
 */
function getBearerToken(request: HttpRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null
  }

  return parts[1]
}

/**
 * Gets the authenticated user from the session token.
 * Returns null if not authenticated or user not found.
 */
export async function getAuthenticatedUser(
  request: HttpRequest,
): Promise<AuthenticatedUser | null> {
  const token = getBearerToken(request)
  if (!token) return null

  const session = await validateSession(token)
  if (!session) return null

  const result = await findUserByEmail(session.email)
  if (!result) return null

  const { user, userType } = result

  return {
    id: user.id as string,
    email: user.email as string,
    firstName: user.firstName as string,
    lastName: user.lastName as string,
    role: (user.role as UserRole) || userType,
    companyId: (user.companyId as string) || '',
    userType,
  }
}

/**
 * Requires the user to have one of the specified roles.
 * Returns an error response if unauthorized, or null if authorized.
 */
export function requireRole(
  user: AuthenticatedUser | null,
  allowedRoles: UserRole[],
): HttpResponseInit | null {
  if (!user) {
    return jsonResponse(401, {
      success: false,
      error: 'Authentication required.',
    })
  }

  // Admin can access everything
  if (user.role === 'admin') {
    return null
  }

  if (!allowedRoles.includes(user.role)) {
    return jsonResponse(403, {
      success: false,
      error: 'You do not have permission to perform this action.',
    })
  }

  return null
}

/**
 * Requires the user to be an admin.
 */
export function requireAdmin(user: AuthenticatedUser | null): HttpResponseInit | null {
  return requireRole(user, ['admin'])
}

/**
 * Requires the user to be a manager (or admin).
 */
export function requireManager(user: AuthenticatedUser | null): HttpResponseInit | null {
  return requireRole(user, ['manager'])
}

/**
 * Requires the user to be an employee (or admin).
 */
export function requireEmployee(user: AuthenticatedUser | null): HttpResponseInit | null {
  return requireRole(user, ['employee'])
}

// ============================================================================
// Export createSession for use by invitations
// ============================================================================

export { createSession, findUserByEmail }

// ============================================================================
// HTTP Handlers
// ============================================================================

interface MagicLinkRequest {
  email: string
}

/**
 * POST /auth/magic-link
 * Request a magic link to be sent to the user's email.
 */
export const requestMagicLinkHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const body = await parseJsonBody<MagicLinkRequest>(request)

  if (!body?.email) {
    return jsonResponse(400, { success: false, error: 'Email is required.' })
  }

  const email = body.email.toLowerCase().trim()

  // Verify user exists in the system
  const result = await findUserByEmail(email)
  if (!result) {
    // For security, don't reveal if user exists or not
    // Just return success and don't send email
    console.log(`Magic link requested for unknown email: ${email}`)
    return jsonResponse(200, {
      success: true,
      data: {
        message: 'If an account exists with this email, a login link has been sent.',
      },
    })
  }

  // Create magic link
  const container = await getContainer('magic_links', '/email')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000)
  const token = generateToken()

  const magicLink: MagicLink = {
    id: createId('ml'),
    email,
    token,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  }

  await container.items.create(magicLink)

  // Send email
  const verifyUrl = `${APP_BASE_URL}/auth/verify?token=${token}`
  const userName = `${result.user.firstName} ${result.user.lastName}`

  try {
    await sendMagicLinkEmail({
      toEmail: email,
      userName,
      magicLinkUrl: verifyUrl,
      expiresInMinutes: MAGIC_LINK_EXPIRY_MINUTES,
    })
  } catch (error) {
    console.error('Failed to send magic link email:', error)
    return jsonResponse(500, {
      success: false,
      error: 'Failed to send email. Please try again.',
    })
  }

  return jsonResponse(200, {
    success: true,
    data: {
      message: 'If an account exists with this email, a login link has been sent.',
    },
  })
}

/**
 * POST /auth/verify
 * Verify a magic link token and create a session.
 */
export const verifyMagicLinkHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const body = await parseJsonBody<{ token: string }>(request)
  const token = body?.token || request.query.get('token')

  if (!token) {
    return jsonResponse(400, { success: false, error: 'Token is required.' })
  }

  // Find magic link
  const container = await getContainer('magic_links', '/email')
  const { resources } = await container.items
    .query({
      query: 'SELECT * FROM c WHERE c.token = @token',
      parameters: [{ name: '@token', value: token }],
    })
    .fetchAll()

  if (resources.length === 0) {
    return jsonResponse(400, { success: false, error: 'Invalid or expired link.' })
  }

  const magicLink = resources[0] as MagicLink

  // Check if already used
  if (magicLink.usedAt) {
    return jsonResponse(400, {
      success: false,
      error: 'This link has already been used.',
    })
  }

  // Check if expired
  if (new Date(magicLink.expiresAt) < new Date()) {
    return jsonResponse(400, {
      success: false,
      error: 'This link has expired. Please request a new one.',
    })
  }

  // Mark as used
  await container.item(magicLink.id, magicLink.email).replace({
    ...magicLink,
    usedAt: nowIso(),
  })

  // Find user
  const result = await findUserByEmail(magicLink.email)
  if (!result) {
    return jsonResponse(400, { success: false, error: 'User not found.' })
  }

  // Create session
  const session = await createSession(
    result.user.id as string,
    result.userType,
    magicLink.email,
  )

  return jsonResponse(200, {
    success: true,
    data: {
      token: session.token,
      expiresAt: session.expiresAt,
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role || result.userType,
        companyId: result.user.companyId || '',
        userType: result.userType,
      },
    },
  })
}

/**
 * POST /auth/logout
 * Invalidate the current session.
 */
export const logoutHandler = async (request: HttpRequest): Promise<HttpResponseInit> => {
  const token = getBearerToken(request)

  if (!token) {
    return jsonResponse(200, { success: true })
  }

  const session = await getSessionByToken(token)
  if (session) {
    // Mark session as expired
    const container = await getContainer('sessions', '/id')
    await container.item(session.id, session.id).replace({
      ...session,
      expiresAt: nowIso(), // Set to now to invalidate
    })
  }

  return jsonResponse(200, { success: true })
}

/**
 * GET /auth/session
 * Get the current session and user info.
 */
export const getSessionHandler = async (
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> => {
  const token = getBearerToken(request)

  // Debug logging for production issue - using context.log for Application Insights
  const authHeader = request.headers.get('authorization')
  context.log('[getSession] Auth header present:', !!authHeader)
  context.log(
    '[getSession] Auth header value:',
    authHeader ? `${authHeader.substring(0, 20)}...` : 'none',
  )
  context.log(
    '[getSession] Token extracted:',
    token ? `${token.substring(0, 10)}...` : 'none',
  )

  if (!token) {
    context.log('[getSession] No token - returning 401')
    return jsonResponse(401, { success: false, error: 'Not authenticated.' })
  }

  const session = await validateSessionWithLogging(token, context)
  context.log('[getSession] Session found:', !!session)
  if (!session) {
    context.log('[getSession] Session invalid or expired - returning 401')
    return jsonResponse(401, { success: false, error: 'Session expired or invalid.' })
  }

  const result = await findUserByEmail(session.email)
  if (!result) {
    return jsonResponse(401, { success: false, error: 'User not found.' })
  }

  // Get company name if applicable
  let companyName: string | undefined
  if (result.user.companyId) {
    const companiesContainer = await getContainer('companies', '/id')
    const { resource: company } = await companiesContainer
      .item(result.user.companyId as string, result.user.companyId as string)
      .read()
    companyName = company?.name
  }

  return jsonResponse(200, {
    success: true,
    data: {
      session: {
        expiresAt: session.expiresAt,
      },
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role || result.userType,
        companyId: result.user.companyId || '',
        companyName,
        userType: result.userType,
      },
    },
  })
}

// ============================================================================
// Route Registration
// ============================================================================

app.http('requestMagicLink', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/magic-link',
  handler: requestMagicLinkHandler,
})

app.http('verifyMagicLink', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/verify',
  handler: verifyMagicLinkHandler,
})

app.http('logout', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/logout',
  handler: logoutHandler,
})

app.http('getSession', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'auth/session',
  handler: getSessionHandler,
})
