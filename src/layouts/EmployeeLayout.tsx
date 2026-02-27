import { useLocation, useNavigate } from 'react-router-dom'
import type { MenuProps } from 'antd'
import type { PropsWithChildren, ReactNode } from 'react'
import AppLayout from './AppLayout'
import { ClipboardList, Gauge } from 'lucide-react'

interface EmployeeLayoutProps extends PropsWithChildren {
  pageHeading?: ReactNode
}
const EmployeeLayout = ({ pageHeading, children }: EmployeeLayoutProps) => {
  const navigate = useNavigate()
  const location = useLocation()

  const iconSize = 18
  const items: MenuProps['items'] = [
    { key: '/employee', label: 'Dashboard', icon: <Gauge size={iconSize} /> },
    {
      key: '/employee/tests',
      label: 'My tests',
      icon: <ClipboardList size={iconSize} />,
    },
  ]

  const selectedPath =
    location.pathname === '/employee'
      ? '/employee'
      : location.pathname.startsWith('/employee/tests') ||
          location.pathname.startsWith('/employee/test/') ||
          location.pathname.startsWith('/employee/test-results/')
        ? '/employee/tests'
        : location.pathname

  return (
    <AppLayout
      title="Employee Portal"
      items={items}
      pageHeading={pageHeading}
      selectedKeys={[selectedPath]}
      onNavigate={navigate}
    >
      {children}
    </AppLayout>
  )
}

export default EmployeeLayout
