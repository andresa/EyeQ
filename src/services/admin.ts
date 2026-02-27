import type { ApiResponse, Company, Employee, Manager } from '../types'
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

export const listCompanies = (): Promise<ApiResponse<Company[]>> =>
  apiRequest('/management/companies')

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

export const listManagers = (companyId: string): Promise<ApiResponse<Manager[]>> =>
  apiRequest(`/management/managers?companyId=${encodeURIComponent(companyId)}`)

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

export const listEmployees = (companyId?: string): Promise<ApiResponse<Employee[]>> =>
  companyId
    ? apiRequest(`/management/employees?companyId=${encodeURIComponent(companyId)}`)
    : apiRequest('/management/employees')
