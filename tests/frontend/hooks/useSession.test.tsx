import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'

vi.mock('../../../src/services/shared', () => ({
  getSession: vi.fn(),
  logout: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('../../../src/services/api', () => ({
  getSessionToken: vi.fn(),
  setSessionToken: vi.fn(),
  clearSessionToken: vi.fn(),
}))

import { SessionProvider, useSession } from '../../../src/hooks/useSession'
import { getSession } from '../../../src/services/shared'
import {
  getSessionToken,
  setSessionToken,
  clearSessionToken,
} from '../../../src/services/api'

const mockGetSession = vi.mocked(getSession)
const mockGetSessionToken = vi.mocked(getSessionToken)
const mockSetSessionToken = vi.mocked(setSessionToken)
const mockClearSessionToken = vi.mocked(clearSessionToken)

function wrapper({ children }: PropsWithChildren) {
  return <SessionProvider>{children}</SessionProvider>
}

describe('useSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSessionToken.mockReturnValue(null)
  })

  it('throws when used outside SessionProvider', () => {
    expect(() => {
      renderHook(() => useSession())
    }).toThrow('useSession must be used within SessionProvider')
  })

  it('starts loading and resolves with no profile when no token', async () => {
    const { result } = renderHook(() => useSession(), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.userProfile).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('fetches session when token exists', async () => {
    mockGetSessionToken.mockReturnValue('valid-token')
    const profile = {
      id: 'u1',
      email: 'a@t.com',
      firstName: 'A',
      lastName: 'B',
      role: 'admin' as const,
      companyId: '',
      userType: 'admin' as const,
    }
    mockGetSession.mockResolvedValue({
      success: true,
      data: { session: { expiresAt: '2099-01-01' }, user: profile },
    })

    const { result } = renderHook(() => useSession(), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.userProfile).toEqual(profile)
  })

  it('clears token when session is invalid', async () => {
    mockGetSessionToken.mockReturnValue('bad-token')
    mockGetSession.mockResolvedValue({ success: false, error: 'Session expired' })

    const { result } = renderHook(() => useSession(), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(mockClearSessionToken).toHaveBeenCalled()
    expect(result.current.userProfile).toBeNull()
  })

  it('login stores token and sets user directly', async () => {
    const { result } = renderHook(() => useSession(), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const user = {
      id: 'u1',
      email: 'a@t.com',
      firstName: 'A',
      lastName: 'B',
      role: 'admin' as const,
      companyId: '',
      userType: 'admin' as const,
    }
    act(() => {
      result.current.login('new-token', user)
    })

    expect(mockSetSessionToken).toHaveBeenCalledWith('new-token')
    expect(result.current.userProfile).toEqual(user)
  })

  it('logout clears state', async () => {
    mockGetSessionToken.mockReturnValue('token')
    const profile = {
      id: 'u1',
      email: 'a@t.com',
      firstName: 'A',
      lastName: 'B',
      role: 'admin' as const,
      companyId: '',
      userType: 'admin' as const,
    }
    mockGetSession.mockResolvedValue({
      success: true,
      data: { session: { expiresAt: '2099-01-01' }, user: profile },
    })

    const { result } = renderHook(() => useSession(), { wrapper })
    await waitFor(() => expect(result.current.userProfile).toEqual(profile))

    await act(async () => {
      await result.current.logout()
    })

    expect(mockClearSessionToken).toHaveBeenCalled()
    expect(result.current.userProfile).toBeNull()
  })

  it('clears session when session-expired event fires', async () => {
    mockGetSessionToken.mockReturnValue('token')
    const profile = {
      id: 'u1',
      email: 'a@t.com',
      firstName: 'A',
      lastName: 'B',
      role: 'employee' as const,
      companyId: 'c1',
      userType: 'employee' as const,
    }
    mockGetSession.mockResolvedValue({
      success: true,
      data: { session: { expiresAt: '2099-01-01' }, user: profile },
    })

    const { result } = renderHook(() => useSession(), { wrapper })
    await waitFor(() => expect(result.current.userProfile).toEqual(profile))

    act(() => {
      window.dispatchEvent(
        new CustomEvent('session-expired', {
          detail: { reason: 'Your account has been deactivated.' },
        }),
      )
    })

    expect(mockClearSessionToken).toHaveBeenCalled()
    expect(result.current.userProfile).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('sets profileError when session-expired event fires', async () => {
    mockGetSessionToken.mockReturnValue('token')
    const profile = {
      id: 'u1',
      email: 'a@t.com',
      firstName: 'A',
      lastName: 'B',
      role: 'manager' as const,
      companyId: 'c1',
      userType: 'manager' as const,
    }
    mockGetSession.mockResolvedValue({
      success: true,
      data: { session: { expiresAt: '2099-01-01' }, user: profile },
    })

    const { result } = renderHook(() => useSession(), { wrapper })
    await waitFor(() => expect(result.current.userProfile).toEqual(profile))

    act(() => {
      window.dispatchEvent(
        new CustomEvent('session-expired', {
          detail: { reason: 'Your account has been deactivated.' },
        }),
      )
    })

    expect(result.current.profileError).toBe('Your account has been deactivated.')
  })
})
