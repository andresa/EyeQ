import { Button, Card, Space, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../layouts/AdminLayout'

const AdminDashboard = () => {
  const navigate = useNavigate()

  return (
    <AdminLayout>
      <div className="page-title">
        <Typography.Title level={3}>Admin dashboard</Typography.Title>
      </div>
      <Space orientation="vertical" size="large" className="w-full">
        <Card>
          <Typography.Title level={4}>Manage core data</Typography.Title>
          <Typography.Paragraph>
            Create companies, onboard managers, and keep company profiles updated.
          </Typography.Paragraph>
          <Space>
            <Button type="primary" onClick={() => navigate('/admin/companies')}>
              Manage companies
            </Button>
            <Button onClick={() => navigate('/admin/managers')}>Manage managers</Button>
          </Space>
        </Card>
      </Space>
    </AdminLayout>
  )
}

export default AdminDashboard
