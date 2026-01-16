import { Card, Space, Statistic, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import EmployerLayout from '../../layouts/EmployerLayout'
import CompanyEmployerSelector from '../../components/molecules/CompanyEmployerSelector'
import { listEmployees, listTests } from '../../services/employer'
import { useSession } from '../../hooks/useSession'

const EmployerDashboard = () => {
  const { session } = useSession()
  const companyId = session?.companyId

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
  })

  return (
    <EmployerLayout>
      <Space orientation="vertical" size="large" className="w-full">
        <Typography.Title level={3}>Employer dashboard</Typography.Title>
        <CompanyEmployerSelector />
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
