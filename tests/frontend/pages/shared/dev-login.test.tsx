import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { App, ConfigProvider } from 'antd'
import type { PropsWithChildren } from 'react'

const mockUseSession = vi.fn()
const mockNavigate = vi.fn()

vi.mock('../../../../src/hooks/useSession', () => ({
  useSession: (...args: unknown[]) => mockUseSession(...args),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />,
  }
})

const mockIsDevMode = vi.fn().mockReturnValue(true)

vi.mock('../../../../src/utils/auth', () => ({
  getDashboardRoute: vi.fn().mockReturnValue('/employee'),
  isDevMode: (...args: unknown[]) => mockIsDevMode(...args),
}))

vi.mock('../../../../src/services/shared', () => ({
  requestMagicLink: vi.fn(),
  getDevUsers: vi.fn().mockResolvedValue({ success: false }),
  devLogin: vi.fn(),
}))

import { getDevUsers, devLogin } from '../../../../src/services/shared'
import DevLoginPage from '../../../../src/pages/shared/dev-login'

const sampleDevUsers = {
  admins: [{ id: 'a1', email: 'admin@test.com', firstName: 'Alice', lastName: 'Admin' }],
  managers: [
    { id: 'm1', email: 'manager@test.com', firstName: 'Bob', lastName: 'Manager' },
  ],
  employees: [
    { id: 'e1', email: 'emp@test.com', firstName: 'Charlie', lastName: 'Employee' },
  ],
}

function Wrapper({ children }: PropsWithChildren) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider>
        <App>
          <MemoryRouter>{children}</MemoryRouter>
        </App>
      </ConfigProvider>
    </QueryClientProvider>
  )
}

const baseSession = {
  userProfile: null as null,
  isLoading: false,
  isAuthenticated: false,
  profileError: null as string | null,
  login: vi.fn(),
  logout: vi.fn(),
  refetchProfile: vi.fn(),
}

describe('DevLoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSession.mockReturnValue({ ...baseSession })
    mockIsDevMode.mockReturnValue(true)
    vi.mocked(getDevUsers).mockResolvedValue({
      success: true,
      data: sampleDevUsers,
    })
  })

  function setup(sessionOverrides: Partial<typeof baseSession> = {}) {
    if (Object.keys(sessionOverrides).length > 0) {
      mockUseSession.mockReturnValue({ ...baseSession, ...sessionOverrides })
    }
    return render(<DevLoginPage />, { wrapper: Wrapper })
  }

  it('redirects to /login when dev mode is disabled', () => {
    mockIsDevMode.mockReturnValue(false)
    setup()

    const nav = screen.getByTestId('navigate')
    expect(nav).toHaveAttribute('data-to', '/login')
  })

  it('renders dev login panel with user dropdowns when dev mode is enabled', async () => {
    setup()

    await waitFor(() => {
      expect(screen.getByText('Dev Login (EyeQDBDev)')).toBeInTheDocument()
    })
  })

  it('calls devLogin and navigates to dashboard when a dev user is selected', async () => {
    vi.mocked(devLogin).mockResolvedValue({
      success: true,
      data: {
        token: 'test-token',
        expiresAt: '2099-01-01T00:00:00Z',
        user: {
          id: 'a1',
          role: 'admin',
          firstName: 'Alice',
          lastName: 'Admin',
          email: 'admin@test.com',
          companyId: 'company-1',
          userType: 'admin',
        },
      },
    })

    setup()

    await waitFor(() => {
      expect(screen.getByText('Dev Login (EyeQDBDev)')).toBeInTheDocument()
    })

    const adminSelect = screen.getByText('Select Admin')
    await userEvent.click(adminSelect)

    const option = await screen.findByText('Alice Admin (admin@test.com)')
    await userEvent.click(option)

    await waitFor(() => {
      expect(devLogin).toHaveBeenCalledWith('a1', 'admin')
      expect(baseSession.login).toHaveBeenCalledWith(
        'test-token',
        expect.objectContaining({ id: 'a1', role: 'admin' }),
      )
    })
  })

  it('shows the magic link form alongside dev login panel', async () => {
    setup()

    await waitFor(() => {
      expect(screen.getByText('Dev Login (EyeQDBDev)')).toBeInTheDocument()
    })

    expect(screen.getByText('or use magic link')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send Login Link' })).toBeInTheDocument()
  })

  it('shows deactivation warning when profileError is set', async () => {
    setup({ profileError: 'Your account has been deactivated.' })

    await waitFor(() => {
      expect(screen.getByText('Dev Login (EyeQDBDev)')).toBeInTheDocument()
    })

    expect(screen.getByText('Your account has been deactivated.')).toBeInTheDocument()
  })

  it('shows loading spinner while fetching dev users', () => {
    vi.mocked(getDevUsers).mockReturnValue(new Promise(() => {}))
    setup()

    expect(screen.getByText('Dev Login')).toBeInTheDocument()
  })
})
