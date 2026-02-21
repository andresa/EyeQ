import type {
  ApiResponse,
  ResponsePayload,
  TestInstance,
  TestInstanceDetails,
  TestInstanceResults,
} from '../types'
import { apiRequest } from './api'

export const listEmployeeTestInstances = (
  employeeId: string,
): Promise<ApiResponse<TestInstance[]>> =>
  apiRequest(`/employee/testInstances?employeeId=${encodeURIComponent(employeeId)}`)

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
