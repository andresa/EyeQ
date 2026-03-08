import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockContainer, mockRequest } from '../../helpers/api-helpers'

const mockContainer = createMockContainer().container
const usersContainer = createMockContainer().container
const adminsContainer = createMockContainer().container
const sessionsContainer = createMockContainer().container
const magicLinksContainer = createMockContainer().container

vi.mock('../../../api/shared/cosmos', () => ({
  getContainer: vi.fn().mockImplementation((name: string) => {
    if (name === 'users') return Promise.resolve(usersContainer)
    if (name === 'admins') return Promise.resolve(adminsContainer)
    if (name === 'sessions') return Promise.resolve(sessionsContainer)
    if (name === 'magic_links') return Promise.resolve(magicLinksContainer)
    if (name === 'companies') return Promise.resolve(mockContainer)
    return Promise.resolve(mockContainer)
  }),
}))

vi.mock('../../../api/shared/email', () => ({
  sendMagicLinkEmail: vi.fn().mockResolvedValue(undefined),
}))

import {
  requireRole,
  requireAdmin,
  requireManager,
  requireEmployee,
  requestMagicLinkHandler,
  verifyMagicLinkHandler,
  logoutHandler,
  getSessionHandler,
} from '../../../api/shared/auth'
import type { AuthenticatedUser } from '../../../api/shared/auth'

function setup() {
  adminsContainer.items.query.mockReturnValue({
    fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
  })
  usersContainer.items.query.mockReturnValue({
    fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
  })
  sessionsContainer.items.query.mockReturnValue({
    fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
  })
  sessionsContainer.items.create.mockResolvedValue({})
  sessionsContainer.item.mockReturnValue({
    read: vi.fn().mockResolvedValue({ resource: null }),
    replace: vi.fn().mockResolvedValue({}),
    delete: vi.fn(),
  })
  magicLinksContainer.items.query.mockReturnValue({
    fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
  })
  magicLinksContainer.items.create.mockResolvedValue({})
  magicLinksContainer.item.mockReturnValue({
    read: vi.fn(),
    replace: vi.fn().mockResolvedValue({}),
    delete: vi.fn(),
  })
  mockContainer.item.mockReturnValue({
    read: vi.fn().mockResolvedValue({ resource: { name: 'Acme' } }),
    replace: vi.fn(),
    delete: vi.fn(),
  })
}

describe('shared/auth', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('requireRole', () => {
    const admin: AuthenticatedUser = {
      id: 'a1',
      email: 'a@t.com',
      firstName: 'A',
      lastName: 'B',
      role: 'admin',
      companyId: '',
      userType: 'admin',
    }
    const manager: AuthenticatedUser = {
      id: 'm1',
      email: 'm@t.com',
      firstName: 'M',
      lastName: 'N',
      role: 'manager',
      companyId: 'c1',
      userType: 'manager',
    }
    const employee: AuthenticatedUser = {
      id: 'e1',
      email: 'e@t.com',
      firstName: 'E',
      lastName: 'F',
      role: 'employee',
      companyId: 'c1',
      userType: 'employee',
    }

    it('returns null for admin regardless of allowed roles', () => {
      expect(requireRole(admin, ['employee'])).toBeNull()
      expect(requireRole(admin, ['manager'])).toBeNull()
      expect(requireRole(admin, ['admin'])).toBeNull()
    })

    it('returns null when role is in allowed roles', () => {
      expect(requireRole(manager, ['manager'])).toBeNull()
      expect(requireRole(employee, ['employee'])).toBeNull()
    })

    it('returns 403 when role is not allowed', () => {
      const result = requireRole(employee, ['manager'])
      expect(result?.status).toBe(403)
    })

    it('returns 401 when user is null', () => {
      const result = requireRole(null, ['admin'])
      expect(result?.status).toBe(401)
    })
  })

  describe('requireAdmin', () => {
    it('returns null for admin', () => {
      const admin: AuthenticatedUser = {
        id: 'a1',
        email: 'a@t.com',
        firstName: 'A',
        lastName: 'B',
        role: 'admin',
        companyId: '',
        userType: 'admin',
      }
      expect(requireAdmin(admin)).toBeNull()
    })

    it('returns error for non-admin', () => {
      const mgr: AuthenticatedUser = {
        id: 'm1',
        email: 'm@t.com',
        firstName: 'M',
        lastName: 'N',
        role: 'manager',
        companyId: 'c1',
        userType: 'manager',
      }
      expect(requireAdmin(mgr)?.status).toBe(403)
    })
  })

  describe('requireManager', () => {
    it('returns null for manager', () => {
      const mgr: AuthenticatedUser = {
        id: 'm1',
        email: 'm@t.com',
        firstName: 'M',
        lastName: 'N',
        role: 'manager',
        companyId: 'c1',
        userType: 'manager',
      }
      expect(requireManager(mgr)).toBeNull()
    })

    it('returns null for admin', () => {
      const admin: AuthenticatedUser = {
        id: 'a1',
        email: 'a@t.com',
        firstName: 'A',
        lastName: 'B',
        role: 'admin',
        companyId: '',
        userType: 'admin',
      }
      expect(requireManager(admin)).toBeNull()
    })
  })

  describe('requireEmployee', () => {
    it('returns null for employee', () => {
      const emp: AuthenticatedUser = {
        id: 'e1',
        email: 'e@t.com',
        firstName: 'E',
        lastName: 'F',
        role: 'employee',
        companyId: 'c1',
        userType: 'employee',
      }
      expect(requireEmployee(emp)).toBeNull()
    })
  })

  describe('requestMagicLinkHandler', () => {
    it('returns 400 when email missing', async () => {
      setup()
      const request = mockRequest({ method: 'POST', body: {} })
      const response = await requestMagicLinkHandler(request)

      expect(response.status).toBe(400)
    })

    it('returns 200 even for unknown email (security)', async () => {
      setup()
      const request = mockRequest({ method: 'POST', body: { email: 'unknown@test.com' } })
      const response = await requestMagicLinkHandler(request)

      expect(response.status).toBe(200)
    })

    it('returns 200 and creates magic link for known user', async () => {
      setup()
      adminsContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            { id: 'a1', email: 'admin@test.com', firstName: 'A', lastName: 'B' },
          ],
        }),
      })

      const request = mockRequest({ method: 'POST', body: { email: 'admin@test.com' } })
      const response = await requestMagicLinkHandler(request)

      expect(response.status).toBe(200)
      expect(magicLinksContainer.items.create).toHaveBeenCalledOnce()
    })
  })

  describe('verifyMagicLinkHandler', () => {
    it('returns 400 when token missing', async () => {
      setup()
      const request = mockRequest({ method: 'POST', body: {} })
      const response = await verifyMagicLinkHandler(request)

      expect(response.status).toBe(400)
    })

    it('returns 400 for invalid token', async () => {
      setup()
      const request = mockRequest({ method: 'POST', body: { token: 'bad-token' } })
      const response = await verifyMagicLinkHandler(request)

      expect(response.status).toBe(400)
    })

    it('returns 400 for already used token', async () => {
      setup()
      magicLinksContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              id: 'ml1',
              email: 'a@t.com',
              token: 'tok',
              usedAt: '2025-01-01',
              expiresAt: '2099-01-01T00:00:00Z',
            },
          ],
        }),
      })

      const request = mockRequest({ method: 'POST', body: { token: 'tok' } })
      const response = await verifyMagicLinkHandler(request)

      expect(response.status).toBe(400)
      expect(response.jsonBody?.error).toContain('already been used')
    })

    it('returns 400 for expired token', async () => {
      setup()
      magicLinksContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({
          resources: [
            {
              id: 'ml1',
              email: 'a@t.com',
              token: 'tok',
              expiresAt: '2020-01-01T00:00:00Z',
            },
          ],
        }),
      })

      const request = mockRequest({ method: 'POST', body: { token: 'tok' } })
      const response = await verifyMagicLinkHandler(request)

      expect(response.status).toBe(400)
      expect(response.jsonBody?.error).toContain('expired')
    })
  })

  describe('logoutHandler', () => {
    it('returns 200 with no token', async () => {
      setup()
      const request = mockRequest({ method: 'POST' })
      const response = await logoutHandler(request)

      expect(response.status).toBe(200)
    })

    it('returns 200 and expires session', async () => {
      setup()
      const session = { id: 's1', token: 'tok', expiresAt: '2099-01-01T00:00:00Z' }
      sessionsContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [session] }),
      })
      sessionsContainer.item.mockReturnValue({
        read: vi.fn(),
        replace: vi.fn().mockResolvedValue({}),
        delete: vi.fn(),
      })

      const request = mockRequest({
        method: 'POST',
        headers: { 'x-session-token': 'tok' },
      })
      const response = await logoutHandler(request)

      expect(response.status).toBe(200)
      expect(sessionsContainer.item).toHaveBeenCalled()
    })
  })

  describe('getSessionHandler', () => {
    it('returns 401 when no token', async () => {
      setup()
      const request = mockRequest({})
      const response = await getSessionHandler(request)

      expect(response.status).toBe(401)
    })

    it('returns 401 when session invalid', async () => {
      setup()
      const request = mockRequest({ headers: { 'x-session-token': 'bad-token' } })
      const response = await getSessionHandler(request)

      expect(response.status).toBe(401)
    })
  })
})
