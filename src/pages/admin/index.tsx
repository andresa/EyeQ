import { Button, Card, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../layouts/AdminLayout'
import { useSession } from '../../hooks/useSession'

const AdminDashboard = () => {
  const navigate = useNavigate()
  const { userProfile } = useSession()

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 w-full">
        <div className="flex flex-col gap-2">
          <Typography.Title level={4}>
            Welcome, {userProfile?.firstName || 'Admin'}
          </Typography.Title>
          {userProfile?.companyName && (
            <Typography.Text type="secondary">{userProfile.companyName}</Typography.Text>
          )}
        </div>
        <Card>
          <Typography.Title level={4}>Manage core data</Typography.Title>
          <Typography.Paragraph>
            Create companies, onboard managers, and keep company profiles updated.
          </Typography.Paragraph>
          <div className="flex gap-4">
            <Button type="primary" onClick={() => navigate('/admin/companies')}>
              Manage companies
            </Button>
            <Button onClick={() => navigate('/admin/managers')}>Manage managers</Button>
          </div>
        </Card>
      </div>
    </AdminLayout>
  )
}

export default AdminDashboard
