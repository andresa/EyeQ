import { Card, Select, Space, Table, Typography } from 'antd'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import EmployerLayout from '../../layouts/EmployerLayout'
import { listEmployersShared } from '../../services/shared'
import { listEmployees, listTestInstances, listTests } from '../../services/employer'
import type { Employee, Employer, TestInstance, TestTemplate } from '../../types'
import { useSession } from '../../hooks/useSession'
import { formatDateTime } from '../../utils/date'
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

const AssignedTestsPage = () => {
  const { userProfile } = useSession()
  const companyId = userProfile?.companyId
  const [employeeFilter, setEmployeeFilter] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [assignedFilter, setAssignedFilter] = useState<string>('all')

  const { data: tests } = useQuery({
    queryKey: ['employer', 'tests', companyId],
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
    queryKey: ['employer', 'employees', companyId],
    queryFn: async () => {
      if (!companyId) return [] as Employee[]
      const response = await listEmployees(companyId)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to load employees')
      }
      return response.data
    },
  })

  const { data: employers } = useQuery({
    queryKey: ['admin', 'employers', companyId],
    queryFn: async () => {
      if (!companyId) return [] as Employer[]
      const response = await listEmployersShared(companyId)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to load employers')
      }
      return response.data
    },
    enabled: Boolean(companyId),
  })

  const { data: instances, isLoading } = useQuery({
    queryKey: ['employer', 'testInstances', 'all', companyId],
    queryFn: async () => {
      if (!companyId) return [] as TestInstance[]
      const response = await listTestInstances({ companyId })
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to load assignments')
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

  const employerMap = useMemo(
    () =>
      (employers || []).reduce<Record<string, string>>((map, employer) => {
        map[employer.id] = `${employer.firstName} ${employer.lastName}`
        return map
      }, {}),
    [employers],
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

  return (
    <EmployerLayout>
      <Space direction="vertical" size="large" className="w-full">
        <Typography.Title level={3}>Assigned tests</Typography.Title>
        <Card>
          <Typography.Text type="secondary">
            View all assigned tests and their current status.
          </Typography.Text>
        </Card>
        <Card>
          <Space wrap>
            <Space orientation="vertical" size={4}>
              <Typography.Text type="secondary">Employee</Typography.Text>
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
            </Space>
            <Space orientation="vertical" size={4}>
              <Typography.Text type="secondary">Status</Typography.Text>
              <Select
                mode="multiple"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { label: 'Pending', value: 'pending' },
                  { label: 'Completed', value: 'completed' },
                  { label: 'Marked', value: 'marked' },
                  { label: 'Expired', value: 'expired' },
                ]}
                placeholder="All statuses"
                allowClear
                className="min-w-[220px]"
                aria-label="Filter by status"
              />
            </Space>
            <Space orientation="vertical" size={4}>
              <Typography.Text type="secondary">Assigned date</Typography.Text>
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
            </Space>
          </Space>
        </Card>
        <Table
          loading={isLoading}
          dataSource={filteredInstances}
          rowKey="id"
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
              title: 'Assigned by',
              dataIndex: 'assignedByEmployerId',
              render: (value: string) => employerMap[value] || value,
            },
            { title: 'Status', dataIndex: 'status' },
            {
              title: 'Assigned',
              dataIndex: 'assignedAt',
              render: (value: string) => formatDateTime(value),
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
          ]}
        />
      </Space>
    </EmployerLayout>
  )
}

export default AssignedTestsPage
