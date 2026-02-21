import { Button, Card, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../layouts/AdminLayout'

const AdminDashboard = () => {
  const navigate = useNavigate()

  return (
    <AdminLayout>
      <div className="page-title">
        <Typography.Title level={3}>Admin dashboard</Typography.Title>
      </div>
      <div className="flex flex-col gap-6 w-full">
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
