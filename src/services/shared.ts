import type {
  ApiResponse,
  Company,
  Employee,
  Manager,
  InvitationValidation,
  UserProfile,
  SessionResponse,
  VerifyResponse,
  LeaderboardBoardConfig,
  LeaderboardData,
  LeaderboardSettings,
} from '../types'
import { apiRequest } from './api'

// ============================================================================
// Invitation Management
// ============================================================================

/**
 * Validate an invitation token and get invitation details.
 */
export const validateInvitation = (
  token: string,
): Promise<ApiResponse<InvitationValidation>> =>
  apiRequest(`/invitation/${encodeURIComponent(token)}`)

/**
 * Accept an invitation - creates a session and returns the token.
 */
export const acceptInvitation = (
  token: string,
): Promise<
  ApiResponse<{ message: string; token: string; expiresAt: string; user: UserProfile }>
> =>
  apiRequest(`/invitation/${encodeURIComponent(token)}/accept`, {
    method: 'POST',
  })

// ============================================================================
// Authentication
// ============================================================================

/**
 * Request a magic link to be sent to the user's email.
 */
export const requestMagicLink = (
  email: string,
): Promise<ApiResponse<{ message: string }>> =>
  apiRequest('/auth/magic-link', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })

/**
 * Verify a magic link token and create a session.
 */
export const verifyMagicLink = (token: string): Promise<ApiResponse<VerifyResponse>> =>
  apiRequest('/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })

/**
 * Get the current session and user info.
 */
export const getSession = (): Promise<ApiResponse<SessionResponse>> =>
  apiRequest('/auth/session')

/**
 * Logout - invalidate the current session.
 */
export const logout = (): Promise<ApiResponse<null>> =>
  apiRequest('/auth/logout', {
    method: 'POST',
  })

/**
 * Get the current user's profile based on session token.
 * Returns employee/manager record matched by email.
 */
export const getCurrentUser = (): Promise<ApiResponse<UserProfile>> =>
  apiRequest('/shared/me')

/**
 * List companies - accessible by all authenticated users
 */
export const listCompaniesShared = (): Promise<ApiResponse<Company[]>> =>
  apiRequest('/shared/companies')

/**
 * List managers for a company - accessible by all authenticated users
 */
export const listManagersShared = (companyId: string): Promise<ApiResponse<Manager[]>> =>
  apiRequest(`/shared/managers?companyId=${encodeURIComponent(companyId)}`)

/**
 * List employees for a company - accessible by all authenticated users
 */
export const listEmployeesShared = (
  companyId: string,
): Promise<ApiResponse<Employee[]>> =>
  apiRequest(`/shared/employees?companyId=${encodeURIComponent(companyId)}`)

// ============================================================================
// Leaderboard
// ============================================================================

export const fetchLeaderboardSettings = (
  companyId: string,
): Promise<ApiResponse<LeaderboardSettings>> =>
  apiRequest(`/shared/leaderboard-settings?companyId=${encodeURIComponent(companyId)}`)

export const updateLeaderboardSettings = (payload: {
  companyId: string
  boards: LeaderboardBoardConfig[]
}): Promise<ApiResponse<LeaderboardSettings>> =>
  apiRequest('/shared/leaderboard-settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })

export const fetchLeaderboard = (params: {
  companyId: string
  boardIndex: number
  periodOffset?: number
  offset?: number
  limit?: number
}): Promise<ApiResponse<LeaderboardData>> => {
  const query = new URLSearchParams({
    companyId: params.companyId,
    boardIndex: String(params.boardIndex),
  })
  if (params.periodOffset != null) query.set('periodOffset', String(params.periodOffset))
  if (params.offset != null) query.set('offset', String(params.offset))
  if (params.limit != null) query.set('limit', String(params.limit))
  return apiRequest(`/shared/leaderboard?${query.toString()}`)
}

// ============================================================================
// Dev Login (only works in development)
// ============================================================================

export interface DevUser {
  id: string
  email: string
  firstName: string
  lastName: string
  companyId?: string
}

export interface DevUsersResponse {
  admins: DevUser[]
  managers: DevUser[]
  employees: DevUser[]
}

/**
 * Get all users for dev login dropdowns.
 * Only works when DEV_MODE is enabled on the backend.
 */
export const getDevUsers = (): Promise<ApiResponse<DevUsersResponse>> =>
  apiRequest('/dev/users')

/**
 * Log in as a specific user (dev only).
 * Creates a real session for the selected user.
 */
export const devLogin = (
  userId: string,
  userType: 'admin' | 'manager' | 'employee',
): Promise<ApiResponse<VerifyResponse>> =>
  apiRequest('/dev/login', {
    method: 'POST',
    body: JSON.stringify({ userId, userType }),
  })
