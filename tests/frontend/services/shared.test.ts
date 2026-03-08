import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../src/services/api', () => ({
  apiRequest: vi.fn(),
}))

import { apiRequest } from '../../../src/services/api'
import {
  validateInvitation,
  acceptInvitation,
  requestMagicLink,
  verifyMagicLink,
  getSession,
  logout,
  getCurrentUser,
  listCompaniesShared,
  listManagersShared,
  listEmployeesShared,
  getDevUsers,
  devLogin,
} from '../../../src/services/shared'

const mockApiRequest = vi.mocked(apiRequest)

describe('services/shared', () => {
  beforeEach(() => vi.clearAllMocks())

  it('validateInvitation calls GET /invitation/:token', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await validateInvitation('tok')
    expect(mockApiRequest).toHaveBeenCalledWith(
      expect.stringContaining('/invitation/tok'),
    )
  })

  it('acceptInvitation calls POST /invitation/:token/accept', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await acceptInvitation('tok')
    expect(mockApiRequest).toHaveBeenCalledWith(
      expect.stringContaining('/invitation/tok/accept'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('requestMagicLink calls POST /auth/magic-link', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await requestMagicLink('a@t.com')
    expect(mockApiRequest).toHaveBeenCalledWith(
      '/auth/magic-link',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('verifyMagicLink calls POST /auth/verify', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await verifyMagicLink('tok')
    expect(mockApiRequest).toHaveBeenCalledWith(
      '/auth/verify',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('getSession calls GET /auth/session', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await getSession()
    expect(mockApiRequest).toHaveBeenCalledWith('/auth/session')
  })

  it('logout calls POST /auth/logout', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await logout()
    expect(mockApiRequest).toHaveBeenCalledWith(
      '/auth/logout',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('getCurrentUser calls GET /shared/me', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await getCurrentUser()
    expect(mockApiRequest).toHaveBeenCalledWith('/shared/me')
  })

  it('listCompaniesShared calls GET /shared/companies', async () => {
    mockApiRequest.mockResolvedValue({ success: true, data: [] })
    await listCompaniesShared()
    expect(mockApiRequest).toHaveBeenCalledWith('/shared/companies')
  })

  it('listManagersShared calls GET with companyId', async () => {
    mockApiRequest.mockResolvedValue({ success: true, data: [] })
    await listManagersShared('c1')
    expect(mockApiRequest).toHaveBeenCalledWith(
      expect.stringContaining('/shared/managers?companyId=c1'),
    )
  })

  it('listEmployeesShared calls GET with companyId', async () => {
    mockApiRequest.mockResolvedValue({ success: true, data: [] })
    await listEmployeesShared('c1')
    expect(mockApiRequest).toHaveBeenCalledWith(
      expect.stringContaining('/shared/employees?companyId=c1'),
    )
  })

  it('getDevUsers calls GET /dev/users', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await getDevUsers()
    expect(mockApiRequest).toHaveBeenCalledWith('/dev/users')
  })

  it('devLogin calls POST /dev/login', async () => {
    mockApiRequest.mockResolvedValue({ success: true })
    await devLogin('u1', 'admin')
    expect(mockApiRequest).toHaveBeenCalledWith(
      '/dev/login',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
