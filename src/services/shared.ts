import type {
  ApiResponse,
  Company,
  Employee,
  Employer,
  InvitationValidation,
  UserProfile,
  SessionResponse,
  VerifyResponse,
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
): Promise<ApiResponse<{ message: string; token: string; expiresAt: string }>> =>
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
 * Returns employee/employer record matched by email.
 */
export const getCurrentUser = (): Promise<ApiResponse<UserProfile>> =>
  apiRequest('/shared/me')

/**
 * List companies - accessible by all authenticated users
 */
export const listCompaniesShared = (): Promise<ApiResponse<Company[]>> =>
  apiRequest('/shared/companies')

/**
 * List employers for a company - accessible by all authenticated users
 */
export const listEmployersShared = (
  companyId: string,
): Promise<ApiResponse<Employer[]>> =>
  apiRequest(`/shared/employers?companyId=${encodeURIComponent(companyId)}`)

/**
 * List employees for a company - accessible by all authenticated users
 */
export const listEmployeesShared = (
  companyId: string,
): Promise<ApiResponse<Employee[]>> =>
  apiRequest(`/shared/employees?companyId=${encodeURIComponent(companyId)}`)
