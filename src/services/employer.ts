import type {
  ApiResponse,
  Employee,
  TestInstance,
  TestInstanceResults,
  TestTemplate,
} from '../types'
import { apiRequest } from './api'

export const createEmployees = (payload: {
  companyId: string
  employees: Omit<Employee, 'id' | 'companyId' | 'createdAt' | 'isActive' | 'role'>[]
}): Promise<ApiResponse<Employee[]>> =>
  apiRequest('/employer/employees', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const updateEmployee = (
  employeeId: string,
  companyId: string,
  payload: Partial<Employee>,
): Promise<ApiResponse<Employee>> =>
  apiRequest(
    `/employer/employees/${employeeId}?companyId=${encodeURIComponent(companyId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  )

export const listEmployees = (companyId: string): Promise<ApiResponse<Employee[]>> =>
  apiRequest(`/employer/employees?companyId=${encodeURIComponent(companyId)}`)

export const createTestTemplate = (payload: {
  companyId: string
  employerId: string
  name: string
  sections: TestTemplate['sections']
}): Promise<ApiResponse<TestTemplate>> =>
  apiRequest('/employer/tests', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const updateTestTemplate = (
  testId: string,
  payload: Partial<TestTemplate>,
): Promise<ApiResponse<TestTemplate>> =>
  apiRequest(`/employer/tests/${testId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })

export const duplicateTestTemplate = (
  testId: string,
): Promise<ApiResponse<TestTemplate>> =>
  apiRequest(`/employer/tests/${testId}/duplicate`, {
    method: 'POST',
  })

export const deleteTestTemplate = (testId: string): Promise<ApiResponse<TestTemplate>> =>
  apiRequest(`/employer/tests/${testId}`, {
    method: 'DELETE',
  })

export const listTests = (companyId: string): Promise<ApiResponse<TestTemplate[]>> =>
  apiRequest(`/employer/tests?companyId=${encodeURIComponent(companyId)}`)

export const assignTest = (
  testId: string,
  payload: { employeeIds: string[]; expiresAt?: string },
): Promise<ApiResponse<TestInstance[]>> =>
  apiRequest(`/employer/tests/${testId}/assign`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const listTestInstances = (params: {
  testId?: string
  companyId?: string
}): Promise<ApiResponse<TestInstance[]>> => {
  const query = new URLSearchParams()
  if (params.testId) query.set('testId', params.testId)
  if (params.companyId) query.set('companyId', params.companyId)
  return apiRequest(`/employer/testInstances?${query.toString()}`)
}

export const fetchTestInstanceResults = (
  instanceId: string,
): Promise<ApiResponse<TestInstanceResults>> =>
  apiRequest(`/employer/testInstances/${instanceId}`)

export const markTestInstance = (
  instanceId: string,
  payload: {
    marks: {
      questionId: string
      isCorrect?: boolean | null
      note?: string | null
      correctAnswer?: string | string[] | null
    }[]
    markedByEmployerId?: string
  },
): Promise<ApiResponse<TestInstance>> =>
  apiRequest(`/employer/testInstances/${instanceId}/mark`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
