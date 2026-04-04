import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
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
  }
})

vi.mock('../../../../src/services/shared', () => ({
  requestMagicLink: vi.fn(),
}))

const mockIsDevMode = vi.fn().mockReturnValue(false)

vi.mock('../../../../src/utils/auth', () => ({
  getDashboardRoute: vi.fn().mockReturnValue('/employee'),
  isDevMode: (...args: unknown[]) => mockIsDevMode(...args),
}))

import { requestMagicLink } from '../../../../src/services/shared'
import LoginPage from '../../../../src/pages/shared/login'

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

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSession.mockReturnValue({ ...baseSession })
    mockIsDevMode.mockReturnValue(false)
  })

  function setup(sessionOverrides: Partial<typeof baseSession> = {}) {
    if (Object.keys(sessionOverrides).length > 0) {
      mockUseSession.mockReturnValue({ ...baseSession, ...sessionOverrides })
    }
    return render(<LoginPage />, { wrapper: Wrapper })
  }

  it('shows deactivation warning when profileError is set', () => {
    setup({ profileError: 'Your account has been deactivated.' })

    expect(screen.getByText('Your account has been deactivated.')).toBeInTheDocument()
  })

  it('does not show warning when profileError is null', () => {
    setup()

    expect(
      screen.queryByText('Your account has been deactivated.'),
    ).not.toBeInTheDocument()
  })

  it('hides deactivation warning after magic link success', async () => {
    vi.mocked(requestMagicLink).mockResolvedValue({
      success: true,
      data: {
        message: 'If an account exists with this email, a login link has been sent.',
      },
    })

    setup({ profileError: 'Your account has been deactivated.' })

    expect(screen.getByText('Your account has been deactivated.')).toBeInTheDocument()

    const emailInput = screen.getByPlaceholderText('you@example.com')
    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Send Login Link' }))

    await waitFor(() => {
      expect(
        screen.queryByText('Your account has been deactivated.'),
      ).not.toBeInTheDocument()
    })
  })

  describe('secret dev-login gate', () => {
    it('navigates to /dev-login on Shift+Click logo when dev mode is enabled', async () => {
      mockIsDevMode.mockReturnValue(true)
      setup()

      const logo = screen.getByAltText('EyeQ')
      fireEvent.click(logo, { shiftKey: true })

      expect(mockNavigate).toHaveBeenCalledWith('/dev-login')
    })

    it('does not navigate on Shift+Click logo when dev mode is disabled', async () => {
      mockIsDevMode.mockReturnValue(false)
      setup()

      const logo = screen.getByAltText('EyeQ')
      fireEvent.click(logo, { shiftKey: true })

      expect(mockNavigate).not.toHaveBeenCalledWith('/dev-login')
    })

    it('does not navigate on regular click even in dev mode', async () => {
      mockIsDevMode.mockReturnValue(true)
      setup()

      const logo = screen.getByAltText('EyeQ')
      fireEvent.click(logo)

      expect(mockNavigate).not.toHaveBeenCalledWith('/dev-login')
    })
  })
})
