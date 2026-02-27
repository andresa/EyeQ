import { Alert, Card, Grid, Input, Select, Spin, Table, Tag, Typography } from 'antd'
import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import EmployeeLayout from '../../layouts/EmployeeLayout'
import StandardPageHeading from '../../components/molecules/StandardPageHeading'
import { listEmployeeTestInstances } from '../../services/employee'
import type { TestInstance, TestInstanceStatus } from '../../types'
import { formatDateTime } from '../../utils/date'
import { useSession } from '../../hooks/useSession'
import StatusBadge from '../../components/atoms/StatusBadge'
import { ClipboardList } from 'lucide-react'

function getScoreTag(record: TestInstance): ReactNode {
  const score = record.score
  if (record.status === 'marked' && score != null) {
    let color: string
    if (score >= 70) color = 'green'
    else if (score >= 50) color = 'orange'
    else color = 'red'
    return (
      <Tag className="w-[40px] text-center" color={color}>
        {score}
      </Tag>
    )
  }
  return (
    <Tag className="w-[40px] text-center" color="blue">
      -
    </Tag>
  )
}

const statusOptions: { label: string; value: TestInstanceStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Assigned', value: 'assigned' },
  { label: 'Opened', value: 'opened' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Marked', value: 'marked' },
  { label: 'Expired', value: 'expired' },
]

const EmployeeTestsPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { userProfile, profileError } = useSession()
  const [loading, setLoading] = useState(false)
  const employeeId = userProfile?.userType === 'employee' ? userProfile.id : undefined

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<TestInstanceStatus | 'all'>(() => {
    const s = searchParams.get('status')
    if (s && statusOptions.some((o) => o.value !== 'all' && o.value === s)) {
      return s as TestInstanceStatus
    }
    return 'all'
  })

  const { data: instances } = useQuery({
    queryKey: ['employee', 'testInstances', employeeId],
    queryFn: async () => {
      setLoading(true)
      if (!employeeId) return [] as TestInstance[]
      const response = await listEmployeeTestInstances(employeeId)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to load tests')
      }
      setLoading(false)
      return response.data
    },
    enabled: !!employeeId,
  })

  const filteredInstances = useMemo(() => {
    const items = instances || []
    return items
      .filter((instance) => {
        if (status !== 'all' && instance.status !== status) return false
        if (!query) return true
        const searchValue =
          instance.testName?.toLowerCase() || instance.testId.toLowerCase()
        return searchValue.includes(query.toLowerCase())
      })
      .sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime())
  }, [instances, query, status])

  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md

  const heading = <StandardPageHeading title="My tests" icon={<ClipboardList />} />

  const handleRowClick = (record: TestInstance) =>
    navigate(
      record.status === 'completed' || record.status === 'marked'
        ? `/employee/test-results/${record.id}`
        : `/employee/test/${record.id}`,
    )

  const emptyMessage =
    instances?.length === 0
      ? 'No tests assigned to you yet.'
      : 'No tests match your filters.'

  if (profileError) {
    return (
      <EmployeeLayout>
        <Alert
          type="error"
          title="Account not found"
          description={profileError}
          showIcon
        />
      </EmployeeLayout>
    )
  }

  return (
    <EmployeeLayout pageHeading={heading}>
      <div className="flex flex-col gap-6 w-full">
        <div className="flex gap-4 w-full">
          <Input
            placeholder="Search by test name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search by test name"
            className="flex-1 max-w-[320px]"
          />
          <Select<TestInstanceStatus | 'all'>
            value={status}
            onChange={setStatus}
            options={statusOptions}
            className="w-[120px]"
            aria-label="Filter by status"
          />
        </div>
        {isMobile ? (
          loading ? (
            <div className="flex justify-center py-8">
              <Spin />
            </div>
          ) : filteredInstances.length === 0 ? (
            <Typography.Text type="secondary">{emptyMessage}</Typography.Text>
          ) : (
            <div className="flex flex-col gap-3 w-full">
              {filteredInstances.map((record) => (
                <Card
                  key={record.id}
                  hoverable
                  onClick={() => handleRowClick(record)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleRowClick(record)
                    }
                  }}
                  aria-label={`Open ${record.testName || record.testId}`}
                  className="w-full"
                >
                  <div className="flex flex-col gap-2">
                    <Typography.Text strong>
                      {record.testName || record.testId}
                    </Typography.Text>
                    <div className="flex items-center justify-between gap-2">
                      <StatusBadge status={record.status} />
                      {getScoreTag(record)}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0 text-sm">
                      <Typography.Text type="secondary">
                        Due {record.expiresAt ? formatDateTime(record.expiresAt) : '-'}
                      </Typography.Text>
                      <Typography.Text type="secondary">
                        Assigned {formatDateTime(record.assignedAt)}
                      </Typography.Text>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )
        ) : (
          <Table<TestInstance>
            loading={loading}
            dataSource={filteredInstances}
            rowKey="id"
            onRow={(record) => ({
              onClick: () => handleRowClick(record),
              style: { cursor: 'pointer' },
            })}
            locale={{ emptyText: emptyMessage }}
            columns={[
              {
                title: 'Test name',
                dataIndex: 'testName',
                key: 'testName',
                render: (_: unknown, record: TestInstance) =>
                  record.testName || record.testId,
              },
              {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                render: (value: TestInstance['status']) => <StatusBadge status={value} />,
              },
              {
                title: 'Score',
                dataIndex: 'score',
                align: 'center',
                key: 'score',
                render: (_: unknown, record: TestInstance) => getScoreTag(record),
              },
              {
                title: 'Due',
                dataIndex: 'expiresAt',
                key: 'expiresAt',
                render: (value: string) =>
                  value ? (
                    formatDateTime(value)
                  ) : (
                    <Typography.Text type="secondary">-</Typography.Text>
                  ),
              },
              {
                title: 'Assigned',
                dataIndex: 'assignedAt',
                key: 'assignedAt',
                render: (value: string) => formatDateTime(value),
              },
            ]}
          />
        )}
      </div>
    </EmployeeLayout>
  )
}

export default EmployeeTestsPage
