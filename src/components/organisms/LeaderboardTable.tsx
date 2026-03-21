import { Button, Empty, Pagination, Spin, Table, Typography } from 'antd'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { fetchLeaderboard } from '../../services/shared'
import type { LeaderboardBoardConfig, LeaderboardEntry } from '../../types'

interface LeaderboardTableProps {
  companyId: string
  boardIndex: number
  board: LeaderboardBoardConfig
}

const BOARD_TYPE_LABELS: Record<string, string> = {
  top_average_score: 'Top Average Score',
  top_single_test_score: 'Top Single-Test Score',
}

const MIN_PERIOD_OFFSET = -3

const LeaderboardTable = ({ companyId, boardIndex, board }: LeaderboardTableProps) => {
  const [periodOffset, setPeriodOffset] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 50

  const offset = board.displayLimit === 'full' ? (page - 1) * pageSize : 0

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', companyId, boardIndex, periodOffset, offset],
    queryFn: async () => {
      const response = await fetchLeaderboard({
        companyId,
        boardIndex,
        periodOffset,
        offset,
        limit: board.displayLimit === 'full' ? pageSize : 5,
      })
      if (!response.success || !response.data) throw new Error(response.error)
      return response.data
    },
    staleTime: 5 * 60 * 1000,
    refetchOnMount: 'always',
  })

  const handlePrevPeriod = () => {
    setPeriodOffset((prev) => prev - 1)
    setPage(1)
  }

  const handleNextPeriod = () => {
    setPeriodOffset((prev) => prev + 1)
    setPage(1)
  }

  const columns = [
    {
      title: '#',
      dataIndex: 'rank',
      key: 'rank',
      width: 30,
      render: (rank: number) => <Typography.Text strong>{rank}</Typography.Text>,
    },
    {
      title: 'Name',
      dataIndex: 'employeeName',
      key: 'employeeName',
      ellipsis: true,
    },
    {
      title: 'Score',
      dataIndex: 'score',
      key: 'score',
      width: 80,
      render: (score: number) => (
        <Typography.Text strong>
          {board.type === 'top_average_score' ? score.toFixed(2) : score}
        </Typography.Text>
      ),
    },
    {
      title: 'Tests',
      dataIndex: 'testCount',
      key: 'testCount',
      width: 60,
    },
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Typography.Title level={5} className="!mb-0">
          {BOARD_TYPE_LABELS[board.type] ?? board.type}
        </Typography.Title>
      </div>

      <div className="flex items-center justify-center gap-3">
        <Button
          type="text"
          size="small"
          icon={<ChevronLeft size={16} />}
          onClick={handlePrevPeriod}
          disabled={periodOffset <= MIN_PERIOD_OFFSET}
          aria-label="Previous period"
        />
        <Typography.Text strong>{data?.periodLabel ?? '...'}</Typography.Text>
        <Button
          type="text"
          size="small"
          icon={<ChevronRight size={16} />}
          onClick={handleNextPeriod}
          disabled={periodOffset >= 0}
          aria-label="Next period"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spin />
        </div>
      ) : !data || data.entries.length === 0 ? (
        <Empty description="No results for this period" />
      ) : (
        <>
          <Table<LeaderboardEntry>
            dataSource={data.entries}
            columns={columns}
            rowKey="employeeId"
            pagination={false}
            size="small"
          />
          {board.displayLimit === 'full' && data.total > pageSize && (
            <div className="flex justify-center mt-2">
              <Pagination
                current={page}
                pageSize={pageSize}
                total={data.total}
                onChange={(newPage) => setPage(newPage)}
                showSizeChanger={false}
                size="small"
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default LeaderboardTable
