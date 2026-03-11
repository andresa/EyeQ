import { App, Button, Card, Flex, Select, Spin, Switch, Typography } from 'antd'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  fetchLeaderboardSettings,
  updateLeaderboardSettings,
} from '../../services/shared'
import type { LeaderboardBoardConfig } from '../../types'

interface LeaderboardSettingsSectionProps {
  companyId: string
}

const DEFAULT_BOARD: LeaderboardBoardConfig = {
  type: 'top_average_score',
  period: 'month',
  displayLimit: 'top5',
}

interface LeaderboardSettingsFormProps {
  initialBoards: (LeaderboardBoardConfig | null)[]
  onSave: (boards: LeaderboardBoardConfig[]) => void
  isSaving: boolean
}

const LeaderboardSettingsForm = ({
  initialBoards,
  onSave,
  isSaving,
}: LeaderboardSettingsFormProps) => {
  const [boards, setBoards] = useState<(LeaderboardBoardConfig | null)[]>(initialBoards)

  const handleToggle = (index: number, enabled: boolean) => {
    setBoards((prev) => {
      const next = [...prev]
      next[index] = enabled ? { ...DEFAULT_BOARD } : null
      return next
    })
  }

  const handleChange = (
    index: number,
    field: keyof LeaderboardBoardConfig,
    value: string,
  ) => {
    setBoards((prev) => {
      const next = [...prev]
      if (next[index]) {
        next[index] = { ...next[index]!, [field]: value }
      }
      return next
    })
  }

  const handleSave = () => {
    const activeBoardConfigs = boards.filter(
      (b): b is LeaderboardBoardConfig => b !== null,
    )
    onSave(activeBoardConfigs)
  }

  return (
    <>
      {[0, 1].map((index) => {
        const board = boards[index]
        const enabled = board !== null
        return (
          <Card key={index} size="small">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Typography.Text strong>Board {index + 1}</Typography.Text>
                <Switch
                  checked={enabled}
                  onChange={(checked) => handleToggle(index, checked)}
                  aria-label={`Enable board ${index + 1}`}
                />
              </div>
              {enabled && (
                <Flex vertical className="w-full" gap={8}>
                  <div>
                    <Typography.Text type="secondary" className="text-xs">
                      Leaderboard Type
                    </Typography.Text>
                    <Select
                      className="w-full"
                      value={board.type}
                      onChange={(val) => handleChange(index, 'type', val)}
                      options={[
                        { value: 'top_average_score', label: 'Top Average Score' },
                        {
                          value: 'top_single_test_score',
                          label: 'Top Single-Test Score',
                        },
                      ]}
                    />
                  </div>
                  <div>
                    <Typography.Text type="secondary" className="text-xs">
                      Time Period
                    </Typography.Text>
                    <Select
                      className="w-full"
                      value={board.period}
                      onChange={(val) => handleChange(index, 'period', val)}
                      options={[
                        { value: 'month', label: 'Month' },
                        { value: 'week', label: 'Week' },
                      ]}
                    />
                  </div>
                  <div>
                    <Typography.Text type="secondary" className="text-xs">
                      Display Limit
                    </Typography.Text>
                    <Select
                      className="w-full"
                      value={board.displayLimit}
                      onChange={(val) => handleChange(index, 'displayLimit', val)}
                      options={[
                        { value: 'top5', label: 'Top 5 employees' },
                        { value: 'full', label: 'Full leaderboard' },
                      ]}
                    />
                  </div>
                </Flex>
              )}
            </div>
          </Card>
        )
      })}

      <div>
        <Button type="primary" onClick={handleSave} loading={isSaving}>
          Save
        </Button>
      </div>
    </>
  )
}

const LeaderboardSettingsSection = ({ companyId }: LeaderboardSettingsSectionProps) => {
  const { message } = App.useApp()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard-settings', companyId],
    queryFn: async () => {
      const response = await fetchLeaderboardSettings(companyId)
      if (!response.success || !response.data) throw new Error(response.error)
      return response.data
    },
  })

  const mutation = useMutation({
    mutationFn: async (newBoards: LeaderboardBoardConfig[]) => {
      const response = await updateLeaderboardSettings({
        companyId,
        boards: newBoards,
      })
      if (!response.success) throw new Error(response.error)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaderboard-settings', companyId] })
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
      message.success('Leaderboard settings saved.')
    },
    onError: (err: Error) => {
      message.error(err.message || 'Failed to save settings.')
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spin />
      </div>
    )
  }

  const initialBoards = data
    ? [data.boards[0] ?? null, data.boards[1] ?? null]
    : [null, null]

  return (
    <div className="flex flex-col gap-4">
      <Typography.Text type="secondary">
        Configure up to two leaderboards visible to all employees in your organization.
      </Typography.Text>

      <LeaderboardSettingsForm
        key={JSON.stringify(data?.boards ?? [])}
        initialBoards={initialBoards}
        onSave={(boards) => mutation.mutate(boards)}
        isSaving={mutation.isPending}
      />
    </div>
  )
}

export default LeaderboardSettingsSection
