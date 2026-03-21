import type { ApiResponse, Company, Employee, Manager, PaginatedResponse } from '../types'
import { apiRequest } from './api'

export const createCompany = (payload: {
  name: string
  address?: string
}): Promise<ApiResponse<Company>> =>
  apiRequest('/management/companies', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const updateCompany = (
  companyId: string,
  payload: Partial<Company>,
): Promise<ApiResponse<Company>> =>
  apiRequest(`/management/companies/${companyId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })

export const listCompanies = (params?: {
  limit?: number
  cursor?: string | null
}): Promise<PaginatedResponse<Company>> => {
  const query = new URLSearchParams()
  if (params?.limit != null) query.set('limit', String(params.limit))
  if (params?.cursor) query.set('cursor', params.cursor)
  const queryString = query.toString()

  return apiRequest(
    queryString ? `/management/companies?${queryString}` : '/management/companies',
  )
}

export const deleteCompany = (companyId: string): Promise<ApiResponse<{ id: string }>> =>
  apiRequest(`/management/companies/${companyId}`, { method: 'DELETE' })

export const createManager = (payload: {
  companyId: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  role?: 'employee' | 'manager' | 'admin'
}): Promise<ApiResponse<Manager>> =>
  apiRequest('/management/managers', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const updateManager = (
  managerId: string,
  companyId: string,
  payload: Partial<Manager>,
): Promise<ApiResponse<Manager>> =>
  apiRequest(
    `/management/managers/${managerId}?companyId=${encodeURIComponent(companyId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  )

export const listManagers = (
  companyIdOrParams:
    | string
    | {
        companyId: string
        limit?: number
        cursor?: string | null
      },
): Promise<PaginatedResponse<Manager>> => {
  const params =
    typeof companyIdOrParams === 'string'
      ? { companyId: companyIdOrParams }
      : companyIdOrParams

  const query = new URLSearchParams({ companyId: params.companyId })
  if (params.limit != null) query.set('limit', String(params.limit))
  if (params.cursor) query.set('cursor', params.cursor)

  return apiRequest(`/management/managers?${query.toString()}`)
}

export const deleteManager = (
  managerId: string,
  companyId: string,
): Promise<ApiResponse<{ id: string }>> =>
  apiRequest(
    `/management/managers/${managerId}?companyId=${encodeURIComponent(companyId)}`,
    { method: 'DELETE' },
  )

export const sendManagerInvitation = (
  managerId: string,
  payload: { companyId: string; invitedEmail: string },
): Promise<ApiResponse<{ invitationId: string; expiresAt: string }>> =>
  apiRequest(`/management/managers/${managerId}/invite`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

// Employee management (Admin)
export const createEmployee = (payload: {
  companyId: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  dob?: string
  role?: 'employee' | 'manager' | 'admin'
}): Promise<ApiResponse<Employee>> =>
  apiRequest('/management/employees', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const updateEmployee = (
  employeeId: string,
  companyId: string,
  payload: Partial<Employee>,
): Promise<ApiResponse<Employee>> =>
  apiRequest(
    `/management/employees/${employeeId}?companyId=${encodeURIComponent(companyId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  )

export const listEmployees = (
  companyIdOrParams?:
    | string
    | {
        companyId?: string
        limit?: number
        cursor?: string | null
      },
): Promise<PaginatedResponse<Employee>> => {
  const params =
    typeof companyIdOrParams === 'string' || companyIdOrParams == null
      ? { companyId: companyIdOrParams }
      : companyIdOrParams

  const query = new URLSearchParams()
  if (params.companyId) query.set('companyId', params.companyId)
  if (params.limit != null) query.set('limit', String(params.limit))
  if (params.cursor) query.set('cursor', params.cursor)
  const queryString = query.toString()

  return apiRequest(
    queryString ? `/management/employees?${queryString}` : '/management/employees',
  )
}
