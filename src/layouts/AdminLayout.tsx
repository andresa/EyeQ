import { useLocation, useNavigate } from 'react-router-dom'
import type { MenuProps } from 'antd'
import type { PropsWithChildren } from 'react'
import AppLayout from './AppLayout'

const AdminLayout = ({ children }: PropsWithChildren) => {
  const navigate = useNavigate()
  const location = useLocation()

  const items: MenuProps['items'] = [
    { key: '/admin', label: 'Dashboard' },
    { key: '/admin/companies', label: 'Companies' },
    { key: '/admin/employers', label: 'Employers' },
  ]

  return (
    <AppLayout
      title="Admin Portal"
      items={items}
      selectedKeys={[location.pathname]}
      onNavigate={navigate}
    >
      {children}
    </AppLayout>
  )
}

export default AdminLayout
