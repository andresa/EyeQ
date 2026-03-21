import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import RouteGuard from '../../../src/components/RouteGuard'
import { mockAdmin, mockManager, mockEmployee } from '../../helpers/fixtures'

vi.mock('../../../src/hooks/useSession')
import { useSession } from '../../../src/hooks/useSession'

const mockedUseSession = vi.mocked(useSession)

function setup(overrides: Partial<ReturnType<typeof useSession>>) {
  mockedUseSession.mockReturnValue({
    userProfile: null,
    isLoading: false,
    isAuthenticated: false,
    profileError: null,
    login: vi.fn(),
    logout: vi.fn(),
    refetchProfile: vi.fn(),
    ...overrides,
  })
}

function renderGuard(allowedRoles: ('admin' | 'manager' | 'employee')[]) {
  return render(
    <MemoryRouter>
      <RouteGuard allowedRoles={allowedRoles}>
        <div>Protected Content</div>
      </RouteGuard>
    </MemoryRouter>,
  )
}

describe('RouteGuard', () => {
  it('shows loading spinner while session is loading', () => {
    setup({ isLoading: true })
    renderGuard(['admin'])

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('redirects to /login when not authenticated', () => {
    setup({ isAuthenticated: false, userProfile: null })
    renderGuard(['admin'])

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('renders children when admin accesses admin route', () => {
    const admin = mockAdmin()
    setup({ isAuthenticated: true, userProfile: admin })
    renderGuard(['admin'])

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('admin can access any route regardless of allowedRoles', () => {
    const admin = mockAdmin()
    setup({ isAuthenticated: true, userProfile: admin })
    renderGuard(['employee'])

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('renders children when manager accesses manager route', () => {
    const manager = mockManager()
    setup({ isAuthenticated: true, userProfile: manager })
    renderGuard(['manager'])

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('redirects manager from admin route', () => {
    const manager = mockManager()
    setup({ isAuthenticated: true, userProfile: manager })
    renderGuard(['admin'])

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('renders children when employee accesses employee route', () => {
    const employee = mockEmployee()
    setup({ isAuthenticated: true, userProfile: employee })
    renderGuard(['employee'])

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('redirects employee from manager route', () => {
    const employee = mockEmployee()
    setup({ isAuthenticated: true, userProfile: employee })
    renderGuard(['manager'])

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })
})
