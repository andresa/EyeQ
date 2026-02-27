import { Alert, Input, Select, Table, Tag, Typography } from 'antd'
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

  const heading = <StandardPageHeading title="My tests" icon={<ClipboardList />} />

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
        <div className="flex gap-4 w-full flex-wrap">
          <Input
            placeholder="Search by test name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search by test name"
            className="min-w-[200px] flex-1 max-w-[320px]"
          />
          <Select<TestInstanceStatus | 'all'>
            value={status}
            onChange={setStatus}
            options={statusOptions}
            className="w-[10rem]"
            aria-label="Filter by status"
          />
        </div>
        <Table<TestInstance>
          loading={loading}
          dataSource={filteredInstances}
          rowKey="id"
          onRow={(record) => ({
            onClick: () =>
              navigate(
                record.status === 'completed' || record.status === 'marked'
                  ? `/employee/test-results/${record.id}`
                  : `/employee/test/${record.id}`,
              ),
            style: { cursor: 'pointer' },
          })}
          locale={{
            emptyText:
              instances?.length === 0
                ? 'No tests assigned to you yet.'
                : 'No tests match your filters.',
          }}
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
              render: (
                value: number | null | undefined,
                record: TestInstance,
              ): ReactNode => {
                const getScoreTag = (score: number | null | undefined) => {
                  if (record.status === 'marked' && score != null) {
                    let color: string
                    if (score >= 70) {
                      color = 'green'
                    } else if (score >= 50) {
                      color = 'orange'
                    } else {
                      color = 'red'
                    }
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
                return getScoreTag(value)
              },
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
      </div>
    </EmployeeLayout>
  )
}

export default EmployeeTestsPage
