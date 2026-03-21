import type {
  ApiResponse,
  PaginatedResponse,
  ResponsePayload,
  TestInstance,
  TestInstanceDetails,
  TestInstanceResults,
} from '../types'
import { apiRequest } from './api'

export const listEmployeeTestInstances = (
  employeeIdOrParams:
    | string
    | {
        employeeId: string
        status?: string
        name?: string
        limit?: number
        cursor?: string | null
      },
): Promise<PaginatedResponse<TestInstance>> => {
  const params =
    typeof employeeIdOrParams === 'string'
      ? { employeeId: employeeIdOrParams }
      : employeeIdOrParams

  const query = new URLSearchParams({ employeeId: params.employeeId })
  if (params.status) query.set('status', params.status)
  if (params.name) query.set('name', params.name)
  if (params.limit != null) query.set('limit', String(params.limit))
  if (params.cursor) query.set('cursor', params.cursor)

  return apiRequest(`/employee/testInstances?${query.toString()}`)
}

export const fetchTestInstanceDetails = (
  instanceId: string,
): Promise<ApiResponse<TestInstanceDetails>> =>
  apiRequest(`/employee/testInstances/${instanceId}`)

export const openTestInstance = (
  instanceId: string,
): Promise<ApiResponse<TestInstance>> =>
  apiRequest(`/employee/testInstances/${instanceId}/open`, { method: 'POST' })

export const saveTestResponses = (
  instanceId: string,
  payload: { responses: ResponsePayload[] },
): Promise<ApiResponse<TestInstance>> =>
  apiRequest(`/employee/testInstances/${instanceId}/save`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const submitTestInstance = (
  instanceId: string,
  payload: { responses: ResponsePayload[]; completedAt: string },
): Promise<ApiResponse<TestInstance>> =>
  apiRequest(`/employee/testInstances/${instanceId}/submit`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const fetchEmployeeTestInstanceResults = (
  instanceId: string,
): Promise<ApiResponse<TestInstanceResults>> =>
  apiRequest(`/employee/testInstances/${instanceId}/results`)

export const timeoutTestInstance = (
  instanceId: string,
): Promise<ApiResponse<TestInstance>> =>
  apiRequest(`/employee/testInstances/${instanceId}/timeout`, { method: 'POST' })
