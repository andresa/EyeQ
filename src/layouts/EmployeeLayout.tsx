import { useLocation, useNavigate } from 'react-router-dom'
import type { MenuProps } from 'antd'
import type { PropsWithChildren } from 'react'
import AppLayout from './AppLayout'

const EmployeeLayout = ({ children }: PropsWithChildren) => {
  const navigate = useNavigate()
  const location = useLocation()

  const items: MenuProps['items'] = [
    { key: '/employee', label: 'Dashboard' },
  ]

  return (
    <AppLayout
      title="Employee Portal"
      items={items}
      selectedKeys={[location.pathname]}
      onNavigate={navigate}
    >
      {children}
    </AppLayout>
  )
}

export default EmployeeLayout
