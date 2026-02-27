import { useLocation, useNavigate } from 'react-router-dom'
import type { MenuProps } from 'antd'
import type { PropsWithChildren, ReactNode } from 'react'
import AppLayout from './AppLayout'
import { Building, Gauge, Users, UserStar } from 'lucide-react'

interface AdminLayoutProps extends PropsWithChildren {
  pageHeading?: ReactNode
}
const AdminLayout = ({ pageHeading, children }: AdminLayoutProps) => {
  const navigate = useNavigate()
  const location = useLocation()

  const iconSize = 18
  const items: MenuProps['items'] = [
    { key: '/admin', label: 'Dashboard', icon: <Gauge size={iconSize} /> },
    { key: '/admin/companies', label: 'Companies', icon: <Building size={iconSize} /> },
    { key: '/admin/managers', label: 'Managers', icon: <UserStar size={iconSize} /> },
    { key: '/admin/employees', label: 'Employees', icon: <Users size={iconSize} /> },
  ]

  return (
    <AppLayout
      title="Admin Portal"
      items={items}
      pageHeading={pageHeading}
      selectedKeys={[location.pathname]}
      onNavigate={navigate}
    >
      {children}
    </AppLayout>
  )
}

export default AdminLayout
