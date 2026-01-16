import { useLocation, useNavigate } from 'react-router-dom'
import type { MenuProps } from 'antd'
import type { PropsWithChildren } from 'react'
import AppLayout from './AppLayout'

const EmployerLayout = ({ children }: PropsWithChildren) => {
  const navigate = useNavigate()
  const location = useLocation()

  const items: MenuProps['items'] = [
    { key: '/employer', label: 'Dashboard' },
    { key: '/employer/employees', label: 'Employees' },
    { key: '/employer/tests', label: 'Tests' },
    { key: '/employer/test-submissions', label: 'Test submissions' },
    { key: '/employer/assigned-tests', label: 'Assigned tests' },
  ]

  const selectedPath = location.pathname.startsWith('/employer/test-submissions')
    ? '/employer/test-submissions'
    : location.pathname.startsWith('/employer/test-builder')
      ? '/employer/tests'
      : location.pathname.startsWith('/employer/assigned-tests')
        ? '/employer/assigned-tests'
      : location.pathname

  return (
    <AppLayout
      title="Employer Portal"
      items={items}
      selectedKeys={[selectedPath]}
      onNavigate={navigate}
    >
      {children}
    </AppLayout>
  )
}

export default EmployerLayout
