import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockContainer, mockRequest } from '../../helpers/api-helpers'

const invitationsContainer = createMockContainer().container
const usersContainer = createMockContainer().container
const companiesContainer = createMockContainer().container

vi.mock('../../../api/shared/cosmos', () => ({
  getContainer: vi.fn().mockImplementation((name: string) => {
    if (name === 'invitations') return Promise.resolve(invitationsContainer)
    if (name === 'users') return Promise.resolve(usersContainer)
    if (name === 'companies') return Promise.resolve(companiesContainer)
    return Promise.resolve(invitationsContainer)
  }),
}))

vi.mock('../../../api/shared/auth', () => ({
  getAuthenticatedUser: vi.fn().mockResolvedValue({
    id: 'mgr_1',
    email: 'm@t.com',
    firstName: 'M',
    lastName: 'G',
    role: 'manager',
    companyId: 'c1',
    userType: 'manager',
  }),
  requireManager: vi.fn().mockReturnValue(null),
  requireAdmin: vi.fn().mockReturnValue(null),
  createSession: vi.fn().mockResolvedValue({
    id: 's1',
    token: 'session_tok',
    expiresAt: '2099-01-01T00:00:00Z',
  }),
}))

vi.mock('../../../api/shared/email', () => ({
  sendInvitationEmail: vi.fn().mockResolvedValue(undefined),
}))

import {
  validateInvitationHandler,
  acceptInvitationHandler,
} from '../../../api/shared/invitations'

function setup() {
  invitationsContainer.items.query.mockReturnValue({
    fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
  })
  invitationsContainer.items.create.mockResolvedValue({ resource: {} })
  invitationsContainer.item.mockReturnValue({
    read: vi.fn().mockResolvedValue({ resource: null }),
    replace: vi.fn().mockResolvedValue({}),
    delete: vi.fn(),
  })
  usersContainer.items.query.mockReturnValue({
    fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
  })
  usersContainer.item.mockReturnValue({
    read: vi.fn().mockResolvedValue({
      resource: {
        id: 'u1',
        companyId: 'c1',
        firstName: 'J',
        lastName: 'D',
        email: 'j@t.com',
        role: 'employee',
      },
    }),
    replace: vi.fn().mockResolvedValue({}),
    delete: vi.fn(),
  })
  companiesContainer.item.mockReturnValue({
    read: vi.fn().mockResolvedValue({ resource: { id: 'c1', name: 'Acme' } }),
    replace: vi.fn(),
    delete: vi.fn(),
  })
}

describe('shared/invitations', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('validateInvitationHandler', () => {
    it('returns 400 when token missing', async () => {
      setup()
      const request = mockRequest({ params: {} })
      const response = await validateInvitationHandler(request)

      expect(response.status).toBe(400)
    })

    it('returns 404 when invitation not found', async () => {
      setup()
      const request = mockRequest({ params: { token: 'bad' } })
      const response = await validateInvitationHandler(request)

      expect(response.status).toBe(404)
    })

    it('returns 200 with invitation details', async () => {
      setup()
      const invitation = {
        id: 'inv_1',
        token: 'valid_tok',
        userName: 'John',
        companyName: 'Acme',
        status: 'pending',
        expiresAt: '2099-01-01T00:00:00Z',
      }
      invitationsContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [invitation] }),
      })

      const request = mockRequest({ params: { token: 'valid_tok' } })
      const response = await validateInvitationHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toMatchObject({
        userName: 'John',
        companyName: 'Acme',
      })
    })

    it('returns 400 when invitation already accepted', async () => {
      setup()
      const invitation = {
        id: 'inv_1',
        token: 'tok',
        status: 'accepted',
        expiresAt: '2099-01-01T00:00:00Z',
      }
      invitationsContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [invitation] }),
      })

      const request = mockRequest({ params: { token: 'tok' } })
      const response = await validateInvitationHandler(request)

      expect(response.status).toBe(400)
    })

    it('returns 400 when invitation expired', async () => {
      setup()
      const invitation = {
        id: 'inv_1',
        token: 'tok',
        status: 'pending',
        expiresAt: '2020-01-01T00:00:00Z',
      }
      invitationsContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [invitation] }),
      })

      const request = mockRequest({ params: { token: 'tok' } })
      const response = await validateInvitationHandler(request)

      expect(response.status).toBe(400)
    })
  })

  describe('acceptInvitationHandler', () => {
    it('returns 400 when token missing', async () => {
      setup()
      const request = mockRequest({ method: 'POST', params: {} })
      const response = await acceptInvitationHandler(request)

      expect(response.status).toBe(400)
    })

    it('returns 400 when invitation not found', async () => {
      setup()
      const request = mockRequest({ method: 'POST', params: { token: 'bad' } })
      const response = await acceptInvitationHandler(request)

      expect(response.status).toBe(400)
    })

    it('returns 200 on successful accept', async () => {
      setup()
      const invitation = {
        id: 'inv_1',
        token: 'valid_tok',
        userId: 'u1',
        userType: 'employee',
        companyId: 'c1',
        companyName: 'Acme',
        userName: 'John',
        invitedEmail: 'j@t.com',
        status: 'pending',
        expiresAt: '2099-01-01T00:00:00Z',
        sentByUserId: 'mgr_1',
      }
      invitationsContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [invitation] }),
      })

      const request = mockRequest({ method: 'POST', params: { token: 'valid_tok' } })
      const response = await acceptInvitationHandler(request)

      expect(response.status).toBe(200)
      expect(response.jsonBody?.data).toMatchObject({
        message: expect.stringContaining('accepted'),
      })
    })
  })
})
