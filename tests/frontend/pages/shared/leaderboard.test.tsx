import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { App, ConfigProvider } from 'antd'
import type { PropsWithChildren } from 'react'

vi.mock('../../../../src/hooks/useSession', () => ({
  useSession: vi.fn().mockReturnValue({
    userProfile: {
      id: 'm1',
      email: 'm@t.com',
      firstName: 'Manager',
      lastName: 'User',
      role: 'manager',
      companyId: 'c1',
      companyName: 'Acme',
      userType: 'manager',
    },
    isLoading: false,
    isAuthenticated: true,
    profileError: null,
    login: vi.fn(),
    logout: vi.fn(),
    refetchProfile: vi.fn(),
  }),
}))

vi.mock('../../../../src/services/shared', () => ({
  fetchLeaderboardSettings: vi.fn(),
  fetchLeaderboard: vi.fn(),
}))

import {
  fetchLeaderboardSettings,
  fetchLeaderboard,
} from '../../../../src/services/shared'
import LeaderboardPage from '../../../../src/pages/shared/leaderboard'

function Wrapper({ children }: PropsWithChildren) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
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

describe('LeaderboardPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows "No leaderboards configured." when no boards', async () => {
    vi.mocked(fetchLeaderboardSettings).mockResolvedValue({
      success: true,
      data: { boards: [] },
    })

    render(<LeaderboardPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText('No leaderboards configured.')).toBeInTheDocument()
    })
  })

  it('renders one leaderboard table when one board configured', async () => {
    vi.mocked(fetchLeaderboardSettings).mockResolvedValue({
      success: true,
      data: {
        boards: [{ type: 'top_average_score', period: 'month', displayLimit: 'top5' }],
      },
    })
    vi.mocked(fetchLeaderboard).mockResolvedValue({
      success: true,
      data: {
        board: { type: 'top_average_score', period: 'month', displayLimit: 'top5' },
        periodLabel: 'March 2026',
        periodStart: '2026-03-01T00:00:00.000Z',
        periodEnd: '2026-03-31T23:59:59.999Z',
        entries: [
          {
            rank: 1,
            employeeId: 'e1',
            employeeName: 'Alice Adams',
            score: 95.5,
            testCount: 5,
          },
        ],
        total: 1,
        offset: 0,
        limit: 5,
      },
    })

    render(<LeaderboardPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText('Alice Adams')).toBeInTheDocument()
    })
    expect(screen.getByText('Top Average Score')).toBeInTheDocument()
    expect(screen.getByText('95.50')).toBeInTheDocument()
  })

  it('renders two leaderboard tables when two boards configured', async () => {
    vi.mocked(fetchLeaderboardSettings).mockResolvedValue({
      success: true,
      data: {
        boards: [
          { type: 'top_average_score', period: 'month', displayLimit: 'top5' },
          { type: 'top_single_test_score', period: 'week', displayLimit: 'top5' },
        ],
      },
    })
    vi.mocked(fetchLeaderboard).mockResolvedValue({
      success: true,
      data: {
        board: { type: 'top_average_score', period: 'month', displayLimit: 'top5' },
        periodLabel: 'March 2026',
        periodStart: '2026-03-01T00:00:00.000Z',
        periodEnd: '2026-03-31T23:59:59.999Z',
        entries: [],
        total: 0,
        offset: 0,
        limit: 5,
      },
    })

    render(<LeaderboardPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText('Top Average Score')).toBeInTheDocument()
    })
    expect(screen.getByText('Top Single-Test Score')).toBeInTheDocument()
  })

  it('renders loading state initially', () => {
    vi.mocked(fetchLeaderboardSettings).mockReturnValue(new Promise(() => {}))

    render(<LeaderboardPage />, { wrapper: Wrapper })

    expect(screen.getByText('Leaderboard')).toBeInTheDocument()
  })

  it('shows empty state when period has no data', async () => {
    vi.mocked(fetchLeaderboardSettings).mockResolvedValue({
      success: true,
      data: {
        boards: [{ type: 'top_average_score', period: 'month', displayLimit: 'top5' }],
      },
    })
    vi.mocked(fetchLeaderboard).mockResolvedValue({
      success: true,
      data: {
        board: { type: 'top_average_score', period: 'month', displayLimit: 'top5' },
        periodLabel: 'March 2026',
        periodStart: '2026-03-01T00:00:00.000Z',
        periodEnd: '2026-03-31T23:59:59.999Z',
        entries: [],
        total: 0,
        offset: 0,
        limit: 5,
      },
    })

    render(<LeaderboardPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText('No results for this period')).toBeInTheDocument()
    })
  })
})
