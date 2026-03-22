import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { mockManager } from '../helpers/fixtures'

vi.mock('../../src/pages/shared/login', () => ({
  default: () => <div>Login Page</div>,
}))

vi.mock('../../src/pages/shared/verify', () => ({
  default: () => <div>Verify Page</div>,
}))

vi.mock('../../src/pages/shared/accept-invitation', () => ({
  default: () => <div>Accept Invitation Page</div>,
}))

vi.mock('../../src/pages/employee', () => ({
  default: () => <div>Employee Dashboard</div>,
}))

vi.mock('../../src/pages/employee/tests', () => ({
  default: () => <div>Employee Tests Page</div>,
}))

vi.mock('../../src/pages/employee/test', () => ({
  default: () => <div>Employee Test Page</div>,
}))

vi.mock('../../src/pages/employee/test-results', () => ({
  default: () => <div>Employee Test Results Page</div>,
}))

vi.mock('../../src/pages/employee/learning-resources', () => ({
  default: () => <div>Employee Learning Resources Page</div>,
}))

vi.mock('../../src/pages/manager', () => ({
  default: () => <div>Manager Dashboard</div>,
}))

vi.mock('../../src/pages/manager/employees', () => ({
  default: () => <div>Manager Employees Page</div>,
}))

vi.mock('../../src/pages/manager/tests', () => ({
  default: () => <div>Manager Tests Page</div>,
}))

vi.mock('../../src/pages/manager/test-builder', () => ({
  default: () => <div>Manager Test Builder Page</div>,
}))

vi.mock('../../src/pages/manager/test-submissions', () => ({
  default: () => <div>Manager Test Submissions Page</div>,
}))

vi.mock('../../src/pages/manager/submission-detail', () => ({
  default: () => <div>Manager Submission Detail Page</div>,
}))

vi.mock('../../src/pages/manager/question-library', () => ({
  default: () => <div>Manager Question Library Page</div>,
}))

vi.mock('../../src/pages/manager/settings', () => ({
  default: () => <div>Manager Settings Page</div>,
}))

vi.mock('../../src/pages/manager/learning-resources', () => ({
  default: () => <div>Manager Learning Resources Page</div>,
}))

vi.mock('../../src/pages/shared/leaderboard', () => ({
  default: () => <div>Leaderboard Page</div>,
}))

vi.mock('../../src/pages/admin', () => ({
  default: () => <div>Admin Dashboard</div>,
}))

vi.mock('../../src/pages/admin/companies', () => ({
  default: () => <div>Admin Companies Page</div>,
}))

vi.mock('../../src/pages/admin/managers', () => ({
  default: () => <div>Admin Managers Page</div>,
}))

vi.mock('../../src/pages/admin/employees', () => ({
  default: () => <div>Admin Employees Page</div>,
}))

vi.mock('../../src/hooks/useSession')

import App from '../../src/App'
import { useSession } from '../../src/hooks/useSession'

const mockedUseSession = vi.mocked(useSession)

function setSession(overrides: Partial<ReturnType<typeof useSession>> = {}) {
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

describe('App routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the landing page to signed-out visitors and can navigate to login', async () => {
    setSession()
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    expect(
      screen.getByText(
        /train your team with learning resources, structured tests, and visible results/i,
      ),
    ).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: /log in/i })[0])

    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })

  it('redirects signed-in managers from root to their dashboard', () => {
    setSession({
      isAuthenticated: true,
      userProfile: mockManager(),
    })

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByText('Manager Dashboard')).toBeInTheDocument()
  })

  it('falls back to the landing page for unknown signed-out routes', () => {
    setSession()

    render(
      <MemoryRouter initialEntries={['/missing-route']}>
        <App />
      </MemoryRouter>,
    )

    expect(
      screen.getByText(/everything needed to train employees and measure results/i),
    ).toBeInTheDocument()
  })
})
