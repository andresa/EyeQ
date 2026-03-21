import {
  Alert,
  Button,
  Card,
  Grid,
  Input,
  Modal,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd'
import Selection from '../../components/atoms/Selection'
import { useCallback, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import EmployeeLayout from '../../layouts/EmployeeLayout'
import StandardPageHeading from '../../components/molecules/StandardPageHeading'
import { listEmployeeTestInstances } from '../../services/employee'
import type { TestInstance, TestInstanceStatus } from '../../types'
import { formatDateTime } from '../../utils/date'
import { useSession } from '../../hooks/useSession'
import { useInfiniteList } from '../../hooks/useInfiniteList'
import { usePaginatedQuery } from '../../hooks/usePaginatedQuery'
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
  { label: 'Timed Out', value: 'timed-out' },
]

const EmployeeTestsPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { userProfile, profileError } = useSession()
  const employeeId = userProfile?.userType === 'employee' ? userProfile.id : undefined

  const [startTestModalRecord, setStartTestModalRecord] = useState<TestInstance | null>(
    null,
  )
  const [expiredTestModalRecord, setExpiredTestModalRecord] =
    useState<TestInstance | null>(null)
  const [timedOutModalRecord, setTimedOutModalRecord] = useState<TestInstance | null>(
    null,
  )
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<TestInstanceStatus | 'all'>(() => {
    const s = searchParams.get('status')
    if (s && statusOptions.some((o) => o.value !== 'all' && o.value === s)) {
      return s as TestInstanceStatus
    }
    return 'all'
  })
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md

  const listFilters = {
    status: status !== 'all' ? status : undefined,
    name: query.trim() || undefined,
  }

  const fetchInstancesPage = useCallback(
    async ({ limit, cursor }: { limit: number; cursor?: string | null }) => {
      if (!employeeId) {
        return { success: true, data: [], nextCursor: null, total: 0 }
      }

      const response = await listEmployeeTestInstances({
        employeeId,
        status: listFilters.status,
        name: listFilters.name,
        limit,
        cursor,
      })
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to load tests')
      }
      return response
    },
    [employeeId, listFilters.name, listFilters.status],
  )

  const {
    data: desktopInstances,
    response: desktopResponse,
    isLoading: isDesktopLoading,
    pagination,
  } = usePaginatedQuery({
    queryKey: ['employee', 'testInstances', employeeId, 'desktop'],
    enabled: !!employeeId && !isMobile,
    filters: listFilters,
    fetchPage: fetchInstancesPage,
  })

  const {
    items: mobileInstances,
    total: mobileTotal,
    isLoading: isMobileLoading,
    isFetchingNextPage,
    hasNextPage,
    sentinelRef,
  } = useInfiniteList({
    queryKey: ['employee', 'testInstances', employeeId, 'mobile'],
    enabled: !!employeeId && isMobile,
    filters: listFilters,
    fetchPage: fetchInstancesPage,
  })

  const attachSentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (typeof sentinelRef === 'function') {
        sentinelRef(node)
      }
    },
    [sentinelRef],
  )

  const heading = <StandardPageHeading title="My tests" icon={<ClipboardList />} />

  const handleRowClick = (record: TestInstance) => {
    if (record.status === 'completed' || record.status === 'marked') {
      navigate(`/employee/test-results/${record.id}`)
      return
    }
    if (record.status === 'in-progress' || record.status === 'opened') {
      navigate(`/employee/test/${record.id}`)
      return
    }
    if (record.status === 'expired') {
      setExpiredTestModalRecord(record)
      return
    }
    if (record.status === 'timed-out') {
      setTimedOutModalRecord(record)
      return
    }

    setStartTestModalRecord(record)
  }

  const handleStartTestConfirm = () => {
    if (startTestModalRecord) {
      navigate(`/employee/test/${startTestModalRecord.id}`)
      setStartTestModalRecord(null)
    }
  }

  const handleStartTestCancel = () => setStartTestModalRecord(null)

  const formatDuration = (minutes: number): string => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h > 0 && m > 0)
      return `${h} hour${h !== 1 ? 's' : ''} and ${m} minute${m !== 1 ? 's' : ''}`
    if (h > 0) return `${h} hour${h !== 1 ? 's' : ''}`
    return `${m} minute${m !== 1 ? 's' : ''}`
  }

  const hasFilters = status !== 'all' || Boolean(query.trim())
  const totalCount = isMobile
    ? (mobileTotal ?? mobileInstances.length)
    : (desktopResponse?.total ?? desktopInstances.length)
  const emptyMessage =
    !hasFilters && totalCount === 0
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
          <Selection<TestInstanceStatus | 'all'>
            value={status}
            onChange={setStatus}
            options={statusOptions}
            className="w-[120px]"
            aria-label="Filter by status"
          />
        </div>
        {isMobile ? (
          isMobileLoading ? (
            <div className="flex justify-center py-8">
              <Spin />
            </div>
          ) : mobileInstances.length === 0 ? (
            <Typography.Text type="secondary">{emptyMessage}</Typography.Text>
          ) : (
            <div className="flex flex-col gap-3 w-full">
              {mobileInstances.map((record) => (
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
                    <div className="flex flex-wrap flex-col gap-x-3 gap-y-0 text-sm">
                      <Typography.Text type="secondary">
                        Due: {record.expiresAt ? formatDateTime(record.expiresAt) : '-'}
                      </Typography.Text>
                      <Typography.Text type="secondary">
                        Assigned: {formatDateTime(record.assignedAt)}
                      </Typography.Text>
                    </div>
                  </div>
                </Card>
              ))}
              {isFetchingNextPage && (
                <div className="flex justify-center py-4">
                  <Spin />
                </div>
              )}
              {hasNextPage && <div ref={attachSentinelRef} className="h-1 w-full" />}
            </div>
          )
        ) : (
          <Table<TestInstance>
            loading={isDesktopLoading}
            dataSource={desktopInstances}
            rowKey="id"
            pagination={pagination}
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
      <Modal
        title="Start test"
        open={!!startTestModalRecord}
        onOk={handleStartTestConfirm}
        onCancel={handleStartTestCancel}
        okText="Start test"
        cancelText="Cancel"
        destroyOnHidden
      >
        {startTestModalRecord && (
          <>
            <Typography.Paragraph className="mb-0">
              You&apos;re about to start{' '}
              <strong>
                {startTestModalRecord.testName || startTestModalRecord.testId}
              </strong>
              .
            </Typography.Paragraph>
            {startTestModalRecord.timeLimitMinutes ? (
              <Typography.Paragraph className="mb-0">
                You will have{' '}
                <strong>{formatDuration(startTestModalRecord.timeLimitMinutes)}</strong>{' '}
                to complete this test from the moment you start. Are you sure you want to
                start now?
              </Typography.Paragraph>
            ) : (
              <Typography.Paragraph className="mb-0">
                There is no time restriction for this test.
              </Typography.Paragraph>
            )}
          </>
        )}
      </Modal>
      <Modal
        title="Test expired"
        open={!!expiredTestModalRecord}
        onCancel={() => setExpiredTestModalRecord(null)}
        footer={
          <Button type="primary" onClick={() => setExpiredTestModalRecord(null)}>
            Ok
          </Button>
        }
        destroyOnHidden
      >
        <Typography.Paragraph className="mb-0">
          This test has expired and can no longer be completed.
        </Typography.Paragraph>
      </Modal>
      <Modal
        title="Time limit reached"
        open={!!timedOutModalRecord}
        onCancel={() => setTimedOutModalRecord(null)}
        footer={
          <Button type="primary" onClick={() => setTimedOutModalRecord(null)}>
            Ok
          </Button>
        }
        destroyOnHidden
      >
        <Typography.Paragraph className="mb-0">
          The time limit for this test has elapsed and it can no longer be completed.
        </Typography.Paragraph>
      </Modal>
    </EmployeeLayout>
  )
}

export default EmployeeTestsPage
