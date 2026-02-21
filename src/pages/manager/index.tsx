import { Alert, Card, Statistic, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import ManagerLayout from '../../layouts/ManagerLayout'
import { listEmployees, listTests } from '../../services/manager'
import { useSession } from '../../hooks/useSession'

const ManagerDashboard = () => {
  const { userProfile, profileError } = useSession()
  const companyId = userProfile?.companyId

  const { data: employees } = useQuery({
    queryKey: ['manager', 'employees', companyId],
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
    queryKey: ['manager', 'tests', companyId],
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
      <ManagerLayout>
        <Alert
          type="error"
          message="Account not found"
          description={profileError}
          showIcon
        />
      </ManagerLayout>
    )
  }

  return (
    <ManagerLayout>
      <div className="flex flex-col gap-6 w-full">
        <div>
          <Typography.Title level={3}>
            Welcome, {userProfile?.firstName || 'Manager'}
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
      </div>
    </ManagerLayout>
  )
}

export default ManagerDashboard
