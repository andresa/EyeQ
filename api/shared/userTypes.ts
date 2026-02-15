/**
 * Shared user types for the unified users container.
 * This container holds both managers and employees, distinguished by the `role` field.
 * Admins remain in a separate container with partition key `/id`.
 */

export type UserRole = 'employee' | 'manager'
export type UserType = 'employee' | 'manager' | 'admin'
export type InvitationStatus = 'none' | 'pending' | 'accepted'

/**
 * A company user (employee or manager) stored in the `users` container.
 * Partition key: `/companyId`
 */
export interface CompanyUser {
  id: string
  companyId: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  dob?: string
  role: UserRole // 'employee' or 'manager'
  createdAt: string
  updatedAt?: string
  lastLogin?: string
  isActive: boolean
  invitationStatus?: InvitationStatus
  invitedEmail?: string
}

/**
 * Container name for the unified users container.
 */
export const USERS_CONTAINER = 'users'
export const USERS_PARTITION_KEY = '/companyId'

/**
 * Container name for admins (unchanged).
 */
export const ADMINS_CONTAINER = 'admins'
export const ADMINS_PARTITION_KEY = '/id'
