import { Alert, Card, Space, Statistic, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import EmployerLayout from '../../layouts/EmployerLayout'
import { listEmployees, listTests } from '../../services/employer'
import { useSession } from '../../hooks/useSession'

const EmployerDashboard = () => {
  const { userProfile, profileError } = useSession()
  const companyId = userProfile?.companyId

  const { data: employees } = useQuery({
    queryKey: ['employer', 'employees', companyId],
    queryFn: async () => {
      if (!companyId) return []
      const response = await listEmployees(companyId)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to load employees')
      }
      return response.data
    },
    enabled: !!companyId,
  })

  const { data: tests } = useQuery({
    queryKey: ['employer', 'tests', companyId],
    queryFn: async () => {
      if (!companyId) return []
      const response = await listTests(companyId)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to load tests')
      }
      return response.data
    },
    enabled: !!companyId,
  })

  // Show error if user profile failed to load
  if (profileError) {
    return (
      <EmployerLayout>
        <Alert
          type="error"
          message="Account not found"
          description={profileError}
          showIcon
        />
      </EmployerLayout>
    )
  }

  return (
    <EmployerLayout>
      <Space direction="vertical" size="large" className="w-full">
        <div>
          <Typography.Title level={3}>
            Welcome, {userProfile?.firstName || 'Employer'}
          </Typography.Title>
          {userProfile?.companyName && (
            <Typography.Text type="secondary">{userProfile.companyName}</Typography.Text>
          )}
        </div>

        <div className="card-grid">
          <Card>
            <Statistic title="Employees" value={employees?.length || 0} />
          </Card>
          <Card>
            <Statistic title="Tests" value={tests?.length || 0} />
          </Card>
        </div>
      </Space>
    </EmployerLayout>
  )
}

export default EmployerDashboard
