import { useLocation, useNavigate } from 'react-router-dom'
import type { MenuProps } from 'antd'
import type { PropsWithChildren, ReactNode } from 'react'
import AppLayout from './AppLayout'
import {
  FlaskConical,
  Gauge,
  LibraryBig,
  ScrollText,
  Settings,
  Users,
} from 'lucide-react'

interface ManagerLayoutProps extends PropsWithChildren {
  pageHeading?: ReactNode
}

const ManagerLayout = ({ pageHeading, children }: ManagerLayoutProps) => {
  const navigate = useNavigate()
  const location = useLocation()

  const iconSize = 18
  const items: MenuProps['items'] = [
    { key: '/manager', label: 'Dashboard', icon: <Gauge size={iconSize} /> },
    { key: '/manager/employees', label: 'Employees', icon: <Users size={iconSize} /> },
    { key: '/manager/tests', label: 'Tests', icon: <FlaskConical size={iconSize} /> },
    {
      key: '/manager/question-library',
      label: 'Question Library',
      icon: <LibraryBig size={iconSize} />,
    },
    {
      key: '/manager/test-submissions',
      label: 'Submissions',
      icon: <ScrollText size={iconSize} />,
    },
    { key: '/manager/settings', label: 'Settings', icon: <Settings size={iconSize} /> },
  ]

  const selectedPath = location.pathname.startsWith('/manager/test-submissions')
    ? '/manager/test-submissions'
    : location.pathname.startsWith('/manager/submission')
      ? '/manager/test-submissions'
      : location.pathname.startsWith('/manager/test-builder')
        ? '/manager/tests'
        : location.pathname

  return (
    <AppLayout
      title="Manager Portal"
      pageHeading={pageHeading}
      items={items}
      selectedKeys={[selectedPath]}
      onNavigate={navigate}
    >
      {children}
    </AppLayout>
  )
}

export default ManagerLayout
