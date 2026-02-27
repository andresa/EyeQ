import { Alert, Card, Spin, Statistic, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import ManagerLayout from '../../layouts/ManagerLayout'
import StandardPageHeading from '../../components/molecules/StandardPageHeading'
import { listEmployees, listTests, listTestInstances } from '../../services/manager'
import type { TestInstance } from '../../types'
import { useSession } from '../../hooks/useSession'
import { Gauge } from 'lucide-react'

const ManagerDashboard = () => {
  const navigate = useNavigate()
  const { userProfile, profileError } = useSession()
  const companyId = userProfile?.companyId

  const { data: employees, isLoading: employeesLoading } = useQuery({
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

  const { data: tests, isLoading: testsLoading } = useQuery({
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

  const { data: instances, isLoading: instancesLoading } = useQuery({
    queryKey: ['manager', 'testInstances', companyId],
    queryFn: async () => {
      if (!companyId) return [] as TestInstance[]
      const response = await listTestInstances({ companyId })
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to load submissions')
      }
      return response.data
    },
    enabled: !!companyId,
  })

  const submissionsTotal = instances?.length ?? 0
  const toMarkCount = instances?.filter((i) => i.status === 'completed').length ?? 0

  const heading = <StandardPageHeading title="Dashboard" icon={<Gauge />} />

  if (profileError) {
    return (
      <ManagerLayout pageHeading={heading}>
        <Alert
          type="error"
          title="Account not found"
          description={profileError}
          showIcon
        />
      </ManagerLayout>
    )
  }

  return (
    <ManagerLayout pageHeading={heading}>
      <div className="flex flex-col gap-6 w-full">
        <div>
          <Typography.Title level={3}>
            Welcome, {userProfile?.firstName || 'Manager'}
          </Typography.Title>
          {userProfile?.companyName && (
            <Typography.Text type="secondary">{userProfile.companyName}</Typography.Text>
          )}
        </div>
        <div className="flex flex-col w-full gap-4 max-w-[800px]">
          <div className="flex w-full gap-4">
            <Card
              onClick={() => navigate('/manager/test-submissions')}
              style={{ cursor: 'pointer' }}
              className="flex-1"
            >
              {instancesLoading ? (
                <div className="flex justify-center py-4">
                  <Spin />
                </div>
              ) : (
                <Statistic title="Submissions" value={submissionsTotal} />
              )}
            </Card>
            <Card
              onClick={() => navigate('/manager/test-submissions?status=completed')}
              style={{ cursor: 'pointer' }}
              className="flex-1"
            >
              {instancesLoading ? (
                <div className="flex justify-center py-4">
                  <Spin />
                </div>
              ) : (
                <Statistic title="To Mark" value={toMarkCount} />
              )}
            </Card>
          </div>
          <div className="flex w-full gap-4">
            <Card
              onClick={() => navigate('/manager/employees')}
              style={{ cursor: 'pointer' }}
              className="flex-1"
            >
              {employeesLoading ? (
                <div className="flex justify-center py-4">
                  <Spin />
                </div>
              ) : (
                <Statistic title="Employees" value={employees?.length || 0} />
              )}
            </Card>
            <Card
              onClick={() => navigate('/manager/tests')}
              style={{ cursor: 'pointer' }}
              className="flex-1"
            >
              {testsLoading ? (
                <div className="flex justify-center py-4">
                  <Spin />
                </div>
              ) : (
                <Statistic title="Tests" value={tests?.length || 0} />
              )}
            </Card>
          </div>
        </div>
      </div>
    </ManagerLayout>
  )
}

export default ManagerDashboard
