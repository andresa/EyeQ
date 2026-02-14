import { useLocation, useNavigate } from 'react-router-dom'
import type { MenuProps } from 'antd'
import type { PropsWithChildren } from 'react'
import AppLayout from './AppLayout'

const ManagerLayout = ({ children }: PropsWithChildren) => {
  const navigate = useNavigate()
  const location = useLocation()

  const items: MenuProps['items'] = [
    { key: '/manager', label: 'Dashboard' },
    { key: '/manager/employees', label: 'Employees' },
    { key: '/manager/tests', label: 'Tests' },
    { key: '/manager/test-submissions', label: 'Test submissions' },
    { key: '/manager/assigned-tests', label: 'Assigned tests' },
  ]

  const selectedPath = location.pathname.startsWith('/manager/test-submissions')
    ? '/manager/test-submissions'
    : location.pathname.startsWith('/manager/test-builder')
      ? '/manager/tests'
      : location.pathname.startsWith('/manager/assigned-tests')
        ? '/manager/assigned-tests'
        : location.pathname

  return (
    <AppLayout
      title="Manager Portal"
      items={items}
      selectedKeys={[selectedPath]}
      onNavigate={navigate}
    >
      {children}
    </AppLayout>
  )
}

export default ManagerLayout
