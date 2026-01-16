import { Input, Select, Space, Typography } from 'antd'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import EmployeeLayout from '../../layouts/EmployeeLayout'
import CompanyEmployeeSelector from '../../components/molecules/CompanyEmployeeSelector'
import TestCard from '../../components/molecules/TestCard'
import { listEmployeeTestInstances } from '../../services/employee'
import type { TestInstance, TestInstanceStatus } from '../../types'
import { useSession } from '../../hooks/useSession'

const EmployeeDashboard = () => {
  const navigate = useNavigate()
  const { session } = useSession()
  const employeeId = session?.employeeId
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<TestInstanceStatus | 'all'>('all')

  const { data: instances } = useQuery({
    queryKey: ['employee', 'testInstances', employeeId],
    queryFn: async () => {
      if (!employeeId) return [] as TestInstance[]
      const response = await listEmployeeTestInstances(employeeId)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to load tests')
      }
      return response.data
    },
  })

  const filtered = useMemo(() => {
    const items = instances || []
      return items
      .filter((instance) => {
      if (status !== 'all' && instance.status !== status) {
        return false
      }
      if (!query) return true
        const searchValue =
          instance.testName?.toLowerCase() || instance.testId.toLowerCase()
        return searchValue.includes(query.toLowerCase())
      })
      .sort(
        (a, b) =>
          new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime(),
      )
  }, [instances, query, status])

  return (
    <EmployeeLayout>
      <Space orientation="vertical" size="large" className="w-full">
        <Typography.Title level={3}>Assigned tests</Typography.Title>
        <CompanyEmployeeSelector />
        <Space wrap className="w-full">
          <Input
            placeholder="Search by test ID"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search tests"
          />
          <Select
            value={status}
            onChange={(value) => setStatus(value)}
            options={[
              { label: 'All', value: 'all' },
              { label: 'Pending', value: 'pending' },
              { label: 'Completed', value: 'completed' },
              { label: 'Marked', value: 'marked' },
              { label: 'Expired', value: 'expired' },
            ]}
          />
        </Space>
        {filtered.map((instance) => (
          <TestCard
            key={instance.id}
            instance={instance}
            onOpen={() =>
              navigate(
                instance.status === 'completed' || instance.status === 'marked'
                  ? `/employee/test-results/${instance.id}`
                  : `/employee/test/${instance.id}`,
              )
            }
          />
        ))}
      </Space>
    </EmployeeLayout>
  )
}

export default EmployeeDashboard
