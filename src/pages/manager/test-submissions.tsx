import { Button, Dropdown, Select, Table } from 'antd'
import type { MenuProps } from 'antd'
import { EllipsisOutlined } from '@ant-design/icons'
import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import ManagerLayout from '../../layouts/ManagerLayout'
import StandardPageHeading from '../../components/molecules/StandardPageHeading'
import { listEmployees, listTestInstances, listTests } from '../../services/manager'
import type { Employee, TestInstance, TestTemplate } from '../../types'
import { formatDateTime } from '../../utils/date'
import { useSession } from '../../hooks/useSession'
import StatusBadge from '../../components/atoms/StatusBadge'
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns'
import { ScrollText } from 'lucide-react'

const SubmissionsPage = () => {
  const { testId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { userProfile } = useSession()
  const companyId = userProfile?.companyId

  const [employeeFilter, setEmployeeFilter] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<string[]>(() =>
    searchParams.get('status') === 'completed' ? ['completed'] : [],
  )
  const [assignedFilter, setAssignedFilter] = useState<string>('all')

  const { data: tests } = useQuery({
    queryKey: ['manager', 'tests', companyId],
    queryFn: async () => {
      if (!companyId) return [] as TestTemplate[]
      const response = await listTests(companyId)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to load tests')
      }
      return response.data
    },
  })

  const { data: employees } = useQuery({
    queryKey: ['manager', 'employees', companyId],
    queryFn: async () => {
      if (!companyId) return [] as Employee[]
      const response = await listEmployees(companyId)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to load employees')
      }
      return response.data
    },
  })

  const { data: instances, isLoading } = useQuery({
    queryKey: ['manager', 'testInstances', testId, companyId],
    queryFn: async () => {
      if (!companyId) return [] as TestInstance[]
      const response = await listTestInstances({
        testId: testId || undefined,
        companyId: testId ? undefined : companyId,
      })
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to load submissions')
      }
      return response.data
    },
    enabled: Boolean(companyId),
  })

  const testMap = useMemo(
    () =>
      (tests || []).reduce<Record<string, string>>((map, test) => {
        map[test.id] = test.name
        return map
      }, {}),
    [tests],
  )

  const employeeMap = useMemo(
    () =>
      (employees || []).reduce<Record<string, string>>((map, employee) => {
        map[employee.id] = `${employee.firstName} ${employee.lastName}`
        return map
      }, {}),
    [employees],
  )

  const filteredInstances = useMemo(() => {
    const now = new Date()
    const resolveAssignedRange = () => {
      switch (assignedFilter) {
        case 'today':
          return { start: startOfDay(now), end: endOfDay(now) }
        case 'this_week':
          return {
            start: startOfWeek(now, { weekStartsOn: 1 }),
            end: endOfWeek(now, { weekStartsOn: 1 }),
          }
        case 'last_week': {
          const lastWeek = subWeeks(now, 1)
          return {
            start: startOfWeek(lastWeek, { weekStartsOn: 1 }),
            end: endOfWeek(lastWeek, { weekStartsOn: 1 }),
          }
        }
        case 'this_month':
          return { start: startOfMonth(now), end: endOfMonth(now) }
        case 'last_month': {
          const lastMonth = subMonths(now, 1)
          return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) }
        }
        default:
          return null
      }
    }

    const range = resolveAssignedRange()

    return (instances || [])
      .filter((instance) => {
        if (employeeFilter.length > 0 && !employeeFilter.includes(instance.employeeId)) {
          return false
        }
        if (statusFilter.length > 0 && !statusFilter.includes(instance.status)) {
          return false
        }
        if (range) {
          return isWithinInterval(parseISO(instance.assignedAt), range)
        }
        return true
      })
      .sort((a, b) => {
        const aDate = a.completedAt || a.assignedAt
        const bDate = b.completedAt || b.assignedAt
        return new Date(bDate).getTime() - new Date(aDate).getTime()
      })
  }, [assignedFilter, employeeFilter, instances, statusFilter])

  const getMenuItems = (instanceId: string): MenuProps['items'] => [
    {
      key: 'view',
      label: 'View answers',
      onClick: (event) => {
        event?.domEvent?.stopPropagation()
        navigate(`/manager/submission/${instanceId}?tab=view`)
      },
    },
    {
      key: 'mark',
      label: 'Mark answers',
      onClick: (event) => {
        event?.domEvent?.stopPropagation()
        navigate(`/manager/submission/${instanceId}?tab=mark`)
      },
    },
  ]

  return (
    <ManagerLayout
      pageHeading={<StandardPageHeading title="Submissions" icon={<ScrollText />} />}
    >
      <div className="flex flex-col gap-6 w-full">
        <div className="flex flex-wrap gap-4">
          <Select
            value={testId || 'all'}
            onChange={(value) =>
              value === 'all'
                ? navigate('/manager/test-submissions')
                : navigate(`/manager/test-submissions/${value}`)
            }
            options={[
              { label: 'All tests', value: 'all' },
              ...(tests || []).map((test) => ({
                label: test.name,
                value: test.id,
              })),
            ]}
            className="min-w-[220px]"
            aria-label="Filter by test"
          />
          <Select
            mode="multiple"
            value={employeeFilter}
            onChange={setEmployeeFilter}
            options={(employees || []).map((employee) => ({
              label: `${employee.firstName} ${employee.lastName}`,
              value: employee.id,
            }))}
            placeholder="All employees"
            allowClear
            className="min-w-[260px]"
            aria-label="Filter by employee"
          />
          <Select
            mode="multiple"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { label: 'Assigned', value: 'assigned' },
              { label: 'Opened', value: 'opened' },
              { label: 'In Progress', value: 'in-progress' },
              { label: 'Completed', value: 'completed' },
              { label: 'Marked', value: 'marked' },
              { label: 'Expired', value: 'expired' },
            ]}
            placeholder="All statuses"
            allowClear
            className="min-w-[220px]"
            aria-label="Filter by status"
          />
          <Select
            value={assignedFilter}
            onChange={setAssignedFilter}
            options={[
              { label: 'All dates', value: 'all' },
              { label: 'Today', value: 'today' },
              { label: 'This week', value: 'this_week' },
              { label: 'Last week', value: 'last_week' },
              { label: 'This month', value: 'this_month' },
              { label: 'Last month', value: 'last_month' },
            ]}
            className="min-w-[180px]"
            aria-label="Filter by assigned date"
          />
        </div>
        <Table
          loading={isLoading}
          dataSource={filteredInstances}
          rowKey="id"
          onRow={(record) => ({
            onClick: () => navigate(`/manager/submission/${record.id}?tab=view`),
            style: { cursor: 'pointer' },
          })}
          locale={{
            emptyText: testId
              ? 'No submissions found for this test.'
              : 'No submissions found yet.',
          }}
          columns={[
            {
              title: 'Test',
              dataIndex: 'testId',
              render: (value: string) => testMap[value] || value,
            },
            {
              title: 'Employee',
              dataIndex: 'employeeId',
              render: (value: string) => employeeMap[value] || value,
            },
            {
              title: 'Status',
              dataIndex: 'status',
              render: (value: string) => (
                <StatusBadge status={value as TestInstance['status']} />
              ),
            },
            {
              title: 'Completed',
              dataIndex: 'completedAt',
              render: (value: string) => (value ? formatDateTime(value) : '-'),
            },
            {
              title: 'Marked',
              dataIndex: 'markedAt',
              render: (value: string) => (value ? formatDateTime(value) : '-'),
            },
            {
              title: 'Actions',
              width: 100,
              render: (_, record) => (
                <div className="flex items-center justify-center">
                  <Dropdown menu={{ items: getMenuItems(record.id) }} trigger={['click']}>
                    <Button
                      type="text"
                      icon={<EllipsisOutlined />}
                      onClick={(event) => event.stopPropagation()}
                      aria-label="Submission actions"
                    />
                  </Dropdown>
                </div>
              ),
            },
          ]}
        />
      </div>
    </ManagerLayout>
  )
}

export default SubmissionsPage
