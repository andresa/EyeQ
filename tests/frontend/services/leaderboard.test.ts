import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../src/services/api', () => ({
  apiRequest: vi.fn(),
}))

import { apiRequest } from '../../../src/services/api'
import {
  fetchLeaderboardSettings,
  updateLeaderboardSettings,
  fetchLeaderboard,
} from '../../../src/services/shared'

const mockApiRequest = vi.mocked(apiRequest)

describe('leaderboard services', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetchLeaderboardSettings calls GET /shared/leaderboard-settings with companyId', async () => {
    mockApiRequest.mockResolvedValue({ success: true, data: { boards: [] } })
    await fetchLeaderboardSettings('c1')
    expect(mockApiRequest).toHaveBeenCalledWith(
      expect.stringContaining('/shared/leaderboard-settings?companyId=c1'),
    )
  })

  it('updateLeaderboardSettings calls PUT /shared/leaderboard-settings', async () => {
    mockApiRequest.mockResolvedValue({ success: true, data: { boards: [] } })
    const boards = [
      {
        type: 'top_average_score' as const,
        period: 'month' as const,
        displayLimit: 'top5' as const,
      },
    ]
    await updateLeaderboardSettings({ companyId: 'c1', boards })
    expect(mockApiRequest).toHaveBeenCalledWith(
      '/shared/leaderboard-settings',
      expect.objectContaining({ method: 'PUT' }),
    )
  })

  it('fetchLeaderboard calls GET /shared/leaderboard with params', async () => {
    mockApiRequest.mockResolvedValue({ success: true, data: { entries: [] } })
    await fetchLeaderboard({
      companyId: 'c1',
      boardIndex: 0,
      periodOffset: -1,
      offset: 50,
      limit: 50,
    })
    const callArg = mockApiRequest.mock.calls[0][0] as string
    expect(callArg).toContain('/shared/leaderboard?')
    expect(callArg).toContain('companyId=c1')
    expect(callArg).toContain('boardIndex=0')
    expect(callArg).toContain('periodOffset=-1')
    expect(callArg).toContain('offset=50')
    expect(callArg).toContain('limit=50')
  })

  it('fetchLeaderboard omits optional params when not provided', async () => {
    mockApiRequest.mockResolvedValue({ success: true, data: { entries: [] } })
    await fetchLeaderboard({ companyId: 'c1', boardIndex: 1 })
    const callArg = mockApiRequest.mock.calls[0][0] as string
    expect(callArg).toContain('companyId=c1')
    expect(callArg).toContain('boardIndex=1')
    expect(callArg).not.toContain('periodOffset')
    expect(callArg).not.toContain('offset')
    expect(callArg).not.toContain('limit')
  })
})
