import { Alert, Card, Spin, Statistic, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import EmployeeLayout from '../../layouts/EmployeeLayout'
import StandardPageHeading from '../../components/molecules/StandardPageHeading'
import { listEmployeeTestInstances } from '../../services/employee'
import type { TestInstance } from '../../types'
import { useSession } from '../../hooks/useSession'
import { Gauge } from 'lucide-react'

const EmployeeDashboard = () => {
  const navigate = useNavigate()
  const { userProfile, profileError } = useSession()
  const employeeId = userProfile?.userType === 'employee' ? userProfile.id : undefined

  const { data: instances, isLoading: instancesLoading } = useQuery({
    queryKey: ['employee', 'testInstances', employeeId],
    queryFn: async () => {
      if (!employeeId) return [] as TestInstance[]
      const response = await listEmployeeTestInstances(employeeId)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to load tests')
      }
      return response.data
    },
    enabled: !!employeeId,
  })

  const notStartedCount =
    instances?.filter((i) => i.status === 'assigned' || i.status === 'opened').length ?? 0
  const inProgressCount = instances?.filter((i) => i.status === 'in-progress').length ?? 0
  const markedCount = instances?.filter((i) => i.status === 'marked').length ?? 0
  const markedWithScores =
    instances?.filter((i) => i.status === 'marked' && i.score != null) ?? []
  const averageScore =
    markedWithScores.length > 0
      ? markedWithScores.reduce((sum, i) => sum + (i.score ?? 0), 0) /
        markedWithScores.length
      : null

  const heading = <StandardPageHeading title="Dashboard" icon={<Gauge />} />

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
        <div>
          <Typography.Title level={3}>
            Welcome, {userProfile?.firstName || 'Employee'}
          </Typography.Title>
          {userProfile?.companyName && (
            <Typography.Text type="secondary">{userProfile.companyName}</Typography.Text>
          )}
        </div>
        <div className="flex flex-col w-full gap-4 max-w-[800px]">
          <div className="flex w-full gap-4">
            <Card
              onClick={() => navigate('/employee/tests?status=assigned')}
              style={{ cursor: 'pointer' }}
              className="flex-1"
            >
              {instancesLoading ? (
                <div className="flex justify-center py-4">
                  <Spin />
                </div>
              ) : (
                <Statistic title="Tests not started" value={notStartedCount} />
              )}
            </Card>
            <Card
              onClick={() => navigate('/employee/tests?status=in-progress')}
              style={{ cursor: 'pointer' }}
              className="flex-1"
            >
              {instancesLoading ? (
                <div className="flex justify-center py-4">
                  <Spin />
                </div>
              ) : (
                <Statistic title="In progress" value={inProgressCount} />
              )}
            </Card>
          </div>
          <div className="flex w-full gap-4">
            <Card
              onClick={() => navigate('/employee/tests?status=marked')}
              style={{ cursor: 'pointer' }}
              className="flex-1"
            >
              {instancesLoading ? (
                <div className="flex justify-center py-4">
                  <Spin />
                </div>
              ) : (
                <Statistic title="Marked" value={markedCount} />
              )}
            </Card>
            <Card
              onClick={() => navigate('/employee/tests')}
              style={{ cursor: 'pointer' }}
              className="flex-1"
            >
              {instancesLoading ? (
                <div className="flex justify-center py-4">
                  <Spin />
                </div>
              ) : (
                <Statistic
                  title="Average score"
                  value={averageScore?.toFixed(1) ?? '-'}
                />
              )}
            </Card>
          </div>
        </div>
      </div>
    </EmployeeLayout>
  )
}

export default EmployeeDashboard
