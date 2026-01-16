import type { ApiResponse, Company, Employer } from '../types'
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
}): Promise<ApiResponse<Employer>> =>
  apiRequest('/management/employers', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const listEmployers = (
  companyId: string,
): Promise<ApiResponse<Employer[]>> =>
  apiRequest(`/management/employers?companyId=${encodeURIComponent(companyId)}`)
