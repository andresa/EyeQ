import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions'
import { getContainer } from './cosmos.js'
import { jsonResponse, parseJsonBody } from './http.js'
import { createId, nowIso } from './utils.js'
import {
  getAuthenticatedUser,
  requireManager,
  requireAdmin,
  createSession,
} from './auth.js'
import { sendInvitationEmail } from './email.js'

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked'
export type InvitationUserType = 'employee' | 'manager'

export interface Invitation {
  id: string
  token: string
  userId: string // The user being invited (employee or manager)
  userType: InvitationUserType // 'employee' or 'manager'
  companyId: string
  companyName: string
  userName: string // The name of the user being invited
  invitedEmail: string // Where to send the invitation
  status: InvitationStatus
  createdAt: string
  expiresAt: string
  acceptedAt?: string
  acceptedEmail?: string // The email the user used to accept
  sentByUserId: string // The admin/manager who sent the invitation
}

const INVITATION_EXPIRY_DAYS = 7
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://eyeq.azurewebsites.net'

/**
 * Generate a secure random token for invitations.
 */
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

/**
 * Create an invitation for an employee or manager and send the email.
 */
export async function createInvitationRecord(params: {
  userId: string // The user being invited
  userType: InvitationUserType // 'employee' or 'manager'
  companyId: string
  companyName: string
  userName: string // The name of the user being invited
  invitedEmail: string
  sentByUserId: string
}): Promise<Invitation> {
  const container = await getContainer('invitations', '/companyId')

  // Check for existing pending invitation for this user
  const { resources: existing } = await container.items
    .query({
      query: 'SELECT * FROM c WHERE c.userId = @userId AND c.status = @status',
      parameters: [
        { name: '@userId', value: params.userId },
        { name: '@status', value: 'pending' },
      ],
    })
    .fetchAll()

  // Revoke any existing pending invitations
  for (const inv of existing) {
    await container.item(inv.id, inv.companyId).replace({
      ...inv,
      status: 'revoked' as InvitationStatus,
    })
  }

  const now = new Date()
  const expiresAt = new Date(now.getTime() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
  const token = generateToken()

  const invitation: Invitation = {
    id: createId('inv'),
    token,
    userId: params.userId,
    userType: params.userType,
    companyId: params.companyId,
    companyName: params.companyName,
    userName: params.userName,
    invitedEmail: params.invitedEmail,
    status: 'pending',
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    sentByUserId: params.sentByUserId,
  }

  await container.items.create(invitation)

  // Send the invitation email
  const invitationUrl = `${APP_BASE_URL}/accept-invitation?token=${token}`
  await sendInvitationEmail({
    toEmail: params.invitedEmail,
    userName: params.userName,
    companyName: params.companyName,
    invitationUrl,
    expiresInDays: INVITATION_EXPIRY_DAYS,
  })

  return invitation
}

/**
 * Get invitation by token (for validation).
 */
export async function getInvitationByToken(token: string): Promise<Invitation | null> {
  const container = await getContainer('invitations', '/companyId')
  const { resources } = await container.items
    .query({
      query: 'SELECT * FROM c WHERE c.token = @token',
      parameters: [{ name: '@token', value: token }],
    })
    .fetchAll()

  if (resources.length === 0) return null
  return resources[0] as Invitation
}

/**
 * Accept an invitation - sets the user email and creates a session.
 * Returns the session token for the client.
 * Supports both employees and managers.
 */
export async function acceptInvitationAndCreateSession(token: string): Promise<{
  success: boolean
  error?: string
  sessionToken?: string
  expiresAt?: string
}> {
  const invitation = await getInvitationByToken(token)

  if (!invitation) {
    return { success: false, error: 'Invalid invitation token.' }
  }

  if (invitation.status !== 'pending') {
    return { success: false, error: `Invitation has already been ${invitation.status}.` }
  }

  if (new Date(invitation.expiresAt) < new Date()) {
    // Mark as expired
    const container = await getContainer('invitations', '/companyId')
    await container.item(invitation.id, invitation.companyId).replace({
      ...invitation,
      status: 'expired' as InvitationStatus,
    })
    return {
      success: false,
      error: 'Invitation has expired. Please ask for a new invitation.',
    }
  }

  const acceptedEmail = invitation.invitedEmail.toLowerCase()
  const { userType, userId } = invitation

  // Determine which container to use based on user type
  const containerName = userType === 'manager' ? 'managers' : 'employees'
  const userContainer = await getContainer(containerName, '/companyId')

  // Check if email is already used by another user in the same container
  const { resources: existingUsers } = await userContainer.items
    .query({
      query: 'SELECT * FROM c WHERE LOWER(c.email) = @email',
      parameters: [{ name: '@email', value: acceptedEmail }],
    })
    .fetchAll()

  if (existingUsers.length > 0 && existingUsers[0].id !== userId) {
    return {
      success: false,
      error: 'This email is already associated with another account.',
    }
  }

  // Update user with the accepted email
  const { resource: user } = await userContainer.item(userId, invitation.companyId).read()

  if (!user) {
    return {
      success: false,
      error: `${userType === 'manager' ? 'Manager' : 'Employee'} record not found.`,
    }
  }

  await userContainer.item(userId, invitation.companyId).replace({
    ...user,
    email: acceptedEmail,
    invitationStatus: 'accepted',
    updatedAt: nowIso(),
  })

  // Mark invitation as accepted
  const invContainer = await getContainer('invitations', '/companyId')
  await invContainer.item(invitation.id, invitation.companyId).replace({
    ...invitation,
    status: 'accepted' as InvitationStatus,
    acceptedAt: nowIso(),
    acceptedEmail,
  })

  // Create a session for the user
  // For managers, use 'manager' role; for employees, use their role (default 'employee')
  const sessionRole = userType === 'manager' ? 'manager' : user.role || 'employee'
  const session = await createSession(userId, sessionRole, acceptedEmail)

  return {
    success: true,
    sessionToken: session.token,
    expiresAt: session.expiresAt,
  }
}

// ============================================================================
// HTTP Handlers
// ============================================================================

interface SendInvitationBody {
  companyId: string
  invitedEmail: string
}

/**
 * POST /manager/employees/{employeeId}/invite
 * Send an invitation email to an employee.
 */
export const sendInvitationHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const user = await getAuthenticatedUser(request)
  const authError = requireManager(user)
  if (authError) return authError

  const body = await parseJsonBody<SendInvitationBody>(request)
  const employeeId = request.params.employeeId

  if (!employeeId) {
    return jsonResponse(400, { success: false, error: 'employeeId is required.' })
  }

  if (!body?.invitedEmail) {
    return jsonResponse(400, { success: false, error: 'invitedEmail is required.' })
  }

  if (!body.companyId) {
    return jsonResponse(400, { success: false, error: 'companyId is required.' })
  }

  // Verify manager can only invite employees in their own company
  if (user!.role !== 'admin' && user!.companyId !== body.companyId) {
    return jsonResponse(403, {
      success: false,
      error: 'You can only invite employees in your own company.',
    })
  }

  // Get employee details
  const employeesContainer = await getContainer('employees', '/companyId')
  const { resource: employee } = await employeesContainer
    .item(employeeId, body.companyId)
    .read()

  if (!employee) {
    return jsonResponse(404, { success: false, error: 'Employee not found.' })
  }

  // Get company details
  const companiesContainer = await getContainer('companies', '/id')
  const { resource: company } = await companiesContainer
    .item(body.companyId, body.companyId)
    .read()

  if (!company) {
    return jsonResponse(404, { success: false, error: 'Company not found.' })
  }

  try {
    const invitation = await createInvitationRecord({
      userId: employeeId,
      userType: 'employee',
      companyId: body.companyId,
      companyName: company.name,
      userName: `${employee.firstName} ${employee.lastName}`,
      invitedEmail: body.invitedEmail,
      sentByUserId: user!.id,
    })

    // Update employee invitation status
    await employeesContainer.item(employeeId, body.companyId).replace({
      ...employee,
      invitationStatus: 'pending',
      invitedEmail: body.invitedEmail,
      updatedAt: nowIso(),
    })

    return jsonResponse(200, {
      success: true,
      data: {
        invitationId: invitation.id,
        expiresAt: invitation.expiresAt,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Failed to send invitation:', errorMessage, error)
    return jsonResponse(500, {
      success: false,
      error: `Failed to send invitation: ${errorMessage}`,
    })
  }
}

/**
 * GET /invitation/{token}
 * Validate an invitation token and return invitation details.
 */
export const validateInvitationHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const token = request.params.token

  if (!token) {
    return jsonResponse(400, { success: false, error: 'Token is required.' })
  }

  const invitation = await getInvitationByToken(token)

  if (!invitation) {
    return jsonResponse(404, { success: false, error: 'Invalid invitation token.' })
  }

  if (invitation.status !== 'pending') {
    return jsonResponse(400, {
      success: false,
      error: `Invitation has already been ${invitation.status}.`,
    })
  }

  if (new Date(invitation.expiresAt) < new Date()) {
    return jsonResponse(400, {
      success: false,
      error: 'Invitation has expired. Please ask for a new invitation.',
    })
  }

  // Return only safe details (not the full invitation)
  return jsonResponse(200, {
    success: true,
    data: {
      userName: invitation.userName,
      companyName: invitation.companyName,
      expiresAt: invitation.expiresAt,
    },
  })
}

/**
 * POST /invitation/{token}/accept
 * Accept an invitation - creates a session and returns the token.
 * No prior authentication required - the invitation token IS the authentication.
 */
export const acceptInvitationHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const token = request.params.token

  if (!token) {
    return jsonResponse(400, { success: false, error: 'Token is required.' })
  }

  const result = await acceptInvitationAndCreateSession(token)

  if (!result.success) {
    return jsonResponse(400, { success: false, error: result.error })
  }

  return jsonResponse(200, {
    success: true,
    data: {
      message: 'Invitation accepted successfully. You are now logged in.',
      token: result.sessionToken,
      expiresAt: result.expiresAt,
    },
  })
}

// ============================================================================
// Route Registration
// ============================================================================

app.http('sendInvitation', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'manager/employees/{employeeId}/invite',
  handler: sendInvitationHandler,
})

app.http('validateInvitation', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'invitation/{token}',
  handler: validateInvitationHandler,
})

app.http('acceptInvitation', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'invitation/{token}/accept',
  handler: acceptInvitationHandler,
})

// ============================================================================
// Manager Invitation (Admin only)
// ============================================================================

interface SendManagerInvitationBody {
  companyId: string
  invitedEmail: string
}

/**
 * POST /management/managers/{managerId}/invite
 * Send an invitation email to a manager (Admin only).
 */
export const sendManagerInvitationHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const user = await getAuthenticatedUser(request)
  const authError = requireAdmin(user)
  if (authError) return authError

  const body = await parseJsonBody<SendManagerInvitationBody>(request)
  const managerId = request.params.managerId

  if (!managerId) {
    return jsonResponse(400, { success: false, error: 'managerId is required.' })
  }

  if (!body?.invitedEmail) {
    return jsonResponse(400, { success: false, error: 'invitedEmail is required.' })
  }

  if (!body.companyId) {
    return jsonResponse(400, { success: false, error: 'companyId is required.' })
  }

  // Get manager details
  const managersContainer = await getContainer('managers', '/companyId')
  const { resource: manager } = await managersContainer
    .item(managerId, body.companyId)
    .read()

  if (!manager) {
    return jsonResponse(404, { success: false, error: 'Manager not found.' })
  }

  // Get company details
  const companiesContainer = await getContainer('companies', '/id')
  const { resource: company } = await companiesContainer
    .item(body.companyId, body.companyId)
    .read()

  if (!company) {
    return jsonResponse(404, { success: false, error: 'Company not found.' })
  }

  try {
    const invitation = await createInvitationRecord({
      userId: managerId,
      userType: 'manager',
      companyId: body.companyId,
      companyName: company.name,
      userName: `${manager.firstName} ${manager.lastName}`,
      invitedEmail: body.invitedEmail,
      sentByUserId: user!.id,
    })

    // Update manager invitation status
    await managersContainer.item(managerId, body.companyId).replace({
      ...manager,
      invitationStatus: 'pending',
      invitedEmail: body.invitedEmail,
      updatedAt: nowIso(),
    })

    return jsonResponse(200, {
      success: true,
      data: {
        invitationId: invitation.id,
        expiresAt: invitation.expiresAt,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Failed to send manager invitation:', errorMessage, error)
    return jsonResponse(500, {
      success: false,
      error: `Failed to send invitation: ${errorMessage}`,
    })
  }
}

app.http('sendManagerInvitation', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'management/managers/{managerId}/invite',
  handler: sendManagerInvitationHandler,
})
