import type {
  ApiResponse,
  Employee,
  QuestionLibraryItem,
  TestInstance,
  TestInstanceResults,
  TestTemplate,
} from '../types'
import { apiRequest } from './api'

// ============================================================================
// Invitation Management
// ============================================================================

export const sendInvitation = (
  employeeId: string,
  payload: { companyId: string; invitedEmail: string },
): Promise<ApiResponse<{ invitationId: string; expiresAt: string }>> =>
  apiRequest(`/manager/employees/${employeeId}/invite`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

// ============================================================================
// Employee Management
// ============================================================================

interface CreateEmployeeInput {
  firstName: string
  lastName: string
  email: string
  phone?: string
  dob?: string
  sendInvitation?: boolean // Default true - whether to send invitation email
}

export const createEmployees = (payload: {
  companyId: string
  employees: CreateEmployeeInput[]
}): Promise<ApiResponse<Employee[]>> =>
  apiRequest('/manager/employees', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const updateEmployee = (
  employeeId: string,
  companyId: string,
  payload: Partial<Employee>,
): Promise<ApiResponse<Employee>> =>
  apiRequest(
    `/manager/employees/${employeeId}?companyId=${encodeURIComponent(companyId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  )

export const listEmployees = (companyId: string): Promise<ApiResponse<Employee[]>> =>
  apiRequest(`/manager/employees?companyId=${encodeURIComponent(companyId)}`)

export const deleteEmployee = (
  employeeId: string,
  companyId: string,
): Promise<ApiResponse<{ id: string }>> =>
  apiRequest(
    `/manager/employees/${employeeId}?companyId=${encodeURIComponent(companyId)}`,
    { method: 'DELETE' },
  )

export const createTestTemplate = (payload: {
  companyId: string
  managerId: string
  name: string
  sections: TestTemplate['sections']
}): Promise<ApiResponse<TestTemplate>> =>
  apiRequest('/manager/tests', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const updateTestTemplate = (
  testId: string,
  payload: Partial<TestTemplate>,
): Promise<ApiResponse<TestTemplate>> =>
  apiRequest(`/manager/tests/${testId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })

export const duplicateTestTemplate = (
  testId: string,
): Promise<ApiResponse<TestTemplate>> =>
  apiRequest(`/manager/tests/${testId}/duplicate`, {
    method: 'POST',
  })

export const deleteTestTemplate = (testId: string): Promise<ApiResponse<TestTemplate>> =>
  apiRequest(`/manager/tests/${testId}`, {
    method: 'DELETE',
  })

export const listTests = (companyId: string): Promise<ApiResponse<TestTemplate[]>> =>
  apiRequest(`/manager/tests?companyId=${encodeURIComponent(companyId)}`)

export const assignTest = (
  testId: string,
  payload: { employeeIds: string[]; expiresAt?: string },
): Promise<ApiResponse<TestInstance[]>> =>
  apiRequest(`/manager/tests/${testId}/assign`, {
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
  return apiRequest(`/manager/testInstances?${query.toString()}`)
}

export const fetchTestInstanceResults = (
  instanceId: string,
): Promise<ApiResponse<TestInstanceResults>> =>
  apiRequest(`/manager/testInstances/${instanceId}`)

export const markTestInstance = (
  instanceId: string,
  payload: {
    marks: {
      questionId: string
      isCorrect?: boolean | null
      note?: string | null
      correctAnswer?: string | string[] | null
    }[]
    markedByManagerId?: string
  },
): Promise<ApiResponse<TestInstance>> =>
  apiRequest(`/manager/testInstances/${instanceId}/mark`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

// ============================================================================
// Question Library
// ============================================================================

export const listQuestionLibrary = (
  companyId: string,
  filters?: { name?: string; type?: string },
): Promise<ApiResponse<QuestionLibraryItem[]>> => {
  const query = new URLSearchParams({ companyId })
  if (filters?.name) query.set('name', filters.name)
  if (filters?.type) query.set('type', filters.type)
  return apiRequest(`/manager/question-library?${query.toString()}`)
}

export const createQuestionLibraryItems = (payload: {
  companyId: string
  managerId: string
  items: {
    type: string
    title: string
    description?: string
    required?: boolean
    options?: { id: string; label: string }[]
    correctAnswer?: string | string[]
  }[]
}): Promise<ApiResponse<QuestionLibraryItem[]>> =>
  apiRequest('/manager/question-library', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const updateQuestionLibraryItem = (
  itemId: string,
  payload: Partial<QuestionLibraryItem>,
): Promise<ApiResponse<QuestionLibraryItem>> =>
  apiRequest(`/manager/question-library/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })

export const deleteQuestionLibraryItem = (
  itemId: string,
): Promise<ApiResponse<{ id: string }>> =>
  apiRequest(`/manager/question-library/${itemId}`, {
    method: 'DELETE',
  })
