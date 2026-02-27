import { useLocation, useNavigate } from 'react-router-dom'
import type { MenuProps } from 'antd'
import type { PropsWithChildren, ReactNode } from 'react'
import AppLayout from './AppLayout'
import { Gauge } from 'lucide-react'

interface EmployeeLayoutProps extends PropsWithChildren {
  pageHeading?: ReactNode
}
const EmployeeLayout = ({ pageHeading, children }: EmployeeLayoutProps) => {
  const navigate = useNavigate()
  const location = useLocation()

  const iconSize = 18
  const items: MenuProps['items'] = [
    { key: '/employee', label: 'Dashboard', icon: <Gauge size={iconSize} /> },
  ]

  return (
    <AppLayout
      title="Employee Portal"
      items={items}
      pageHeading={pageHeading}
      selectedKeys={[location.pathname]}
      onNavigate={navigate}
    >
      {children}
    </AppLayout>
  )
}

export default EmployeeLayout
