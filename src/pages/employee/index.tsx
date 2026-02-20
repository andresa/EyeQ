import { Alert, Input, Select, Space, Spin, Typography } from 'antd'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import EmployeeLayout from '../../layouts/EmployeeLayout'
import TestCard from '../../components/molecules/TestCard'
import { listEmployeeTestInstances } from '../../services/employee'
import type { TestInstance, TestInstanceStatus } from '../../types'
import { useSession } from '../../hooks/useSession'

const EmployeeDashboard = () => {
  const navigate = useNavigate()
  const { userProfile, profileError } = useSession()
  const employeeId = userProfile?.userType === 'employee' ? userProfile.id : undefined
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<TestInstanceStatus | 'all'>('all')
  const [loading, setLoading] = useState(false)

  const { data: instances } = useQuery({
    queryKey: ['employee', 'testInstances', employeeId],
    queryFn: async () => {
      setLoading(true)
      if (!employeeId) return [] as TestInstance[]
      const response = await listEmployeeTestInstances(employeeId)
      if (!response.success || !response.data) {
        setLoading(false)
        throw new Error(response.error || 'Unable to load tests')
      }
      setLoading(false)
      return response.data
    },
    enabled: !!employeeId,
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
      .sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime())
  }, [instances, query, status])

  // Show error if user profile failed to load
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
    <EmployeeLayout>
      <Space orientation="vertical" size="large" className="w-full">
        <div>
          <Typography.Title level={3}>
            Welcome, {userProfile?.firstName || 'Employee'}
          </Typography.Title>
          {userProfile?.companyName && (
            <Typography.Text type="secondary">{userProfile.companyName}</Typography.Text>
          )}
        </div>

        <Typography.Title level={4}>Your assigned tests</Typography.Title>

        <div className="flex gap-4 w-full">
          <Input
            placeholder="Search tests"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search tests"
            className="flex-1"
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
            className="w-[7rem]"
          />
        </div>
        {loading && (
          <div className="flex justify-center items-center h-full">
            <Spin />
          </div>
        )}
        {!loading && filtered.length === 0 && query && (
          <Typography.Text type="secondary">
            No tests found matching &quot;{query}&quot;.
          </Typography.Text>
        )}
        {!loading && filtered.length === 0 && !query && (
          <Typography.Text type="secondary">
            No tests assigned to you yet.
          </Typography.Text>
        )}

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
