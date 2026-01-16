import type { ApiResponse, User } from '../types'
import { apiRequest } from './api'

export const loginWithEmail = (payload: {
  email: string
  role?: string
}): Promise<ApiResponse<User>> =>
  apiRequest('/shared/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
