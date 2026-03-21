import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { App, ConfigProvider } from 'antd'
import type { PropsWithChildren } from 'react'

vi.mock('../../../src/services/shared', () => ({
  fetchLeaderboardSettings: vi.fn(),
  updateLeaderboardSettings: vi.fn(),
}))

import {
  fetchLeaderboardSettings,
  updateLeaderboardSettings,
} from '../../../src/services/shared'
import LeaderboardSettingsSection from '../../../src/components/organisms/LeaderboardSettingsSection'

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

describe('LeaderboardSettingsSection', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders two board configuration slots', async () => {
    vi.mocked(fetchLeaderboardSettings).mockResolvedValue({
      success: true,
      data: { boards: [] },
    })

    render(<LeaderboardSettingsSection companyId="c1" />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText('Board 1')).toBeInTheDocument()
    })
    expect(screen.getByText('Board 2')).toBeInTheDocument()
  })

  it('loads and displays existing settings with board enabled', async () => {
    vi.mocked(fetchLeaderboardSettings).mockResolvedValue({
      success: true,
      data: {
        boards: [{ type: 'top_average_score', period: 'month', displayLimit: 'top5' }],
      },
    })

    render(<LeaderboardSettingsSection companyId="c1" />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText('Leaderboard Type')).toBeInTheDocument()
    })
  })

  it('renders save button', async () => {
    vi.mocked(fetchLeaderboardSettings).mockResolvedValue({
      success: true,
      data: { boards: [] },
    })

    render(<LeaderboardSettingsSection companyId="c1" />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText('Save')).toBeInTheDocument()
    })
  })

  it('calls updateLeaderboardSettings when save is clicked', async () => {
    vi.mocked(fetchLeaderboardSettings).mockResolvedValue({
      success: true,
      data: { boards: [] },
    })
    vi.mocked(updateLeaderboardSettings).mockResolvedValue({
      success: true,
      data: { boards: [] },
    })

    render(<LeaderboardSettingsSection companyId="c1" />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText('Save')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(updateLeaderboardSettings).toHaveBeenCalledWith({
        companyId: 'c1',
        boards: [],
      })
    })
  })

  it('shows description text', async () => {
    vi.mocked(fetchLeaderboardSettings).mockResolvedValue({
      success: true,
      data: { boards: [] },
    })

    render(<LeaderboardSettingsSection companyId="c1" />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText(/Configure up to two leaderboards/)).toBeInTheDocument()
    })
  })
})
