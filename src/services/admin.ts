import type { ApiResponse, Company, Employee, Employer } from '../types'
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

export const createEmployer = (payload: {
  companyId: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  role?: 'employee' | 'employer' | 'admin'
}): Promise<ApiResponse<Employer>> =>
  apiRequest('/management/employers', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const updateEmployer = (
  employerId: string,
  companyId: string,
  payload: Partial<Employer>,
): Promise<ApiResponse<Employer>> =>
  apiRequest(
    `/management/employers/${employerId}?companyId=${encodeURIComponent(companyId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  )

export const listEmployers = (companyId: string): Promise<ApiResponse<Employer[]>> =>
  apiRequest(`/management/employers?companyId=${encodeURIComponent(companyId)}`)

// Employee management (Admin)
export const createEmployee = (payload: {
  companyId: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  dob?: string
  role?: 'employee' | 'employer' | 'admin'
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
