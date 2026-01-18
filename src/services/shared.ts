import type {
  ApiResponse,
  Company,
  Employee,
  Employer,
  User,
  UserProfile,
} from '../types'
import { apiRequest } from './api'

export const loginWithEmail = (payload: {
  email: string
  role?: string
}): Promise<ApiResponse<User>> =>
  apiRequest('/shared/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

/**
 * Get the current user's profile based on SWA authentication.
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
