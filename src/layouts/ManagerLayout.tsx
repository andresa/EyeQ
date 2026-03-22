import { useLocation, useNavigate } from 'react-router-dom'
import type { MenuProps } from 'antd'
import type { PropsWithChildren, ReactNode } from 'react'
import AppLayout from './AppLayout'
import {
  BookOpen,
  FlaskConical,
  Gauge,
  LibraryBig,
  ScrollText,
  Settings,
  Trophy,
  Users,
} from 'lucide-react'

interface ManagerLayoutProps extends PropsWithChildren {
  pageHeading?: ReactNode
  maxWidth?: 'default' | 'wide'
}

const ManagerLayout = ({ pageHeading, children, maxWidth }: ManagerLayoutProps) => {
  const navigate = useNavigate()
  const location = useLocation()

  const iconSize = 18
  const items: MenuProps['items'] = [
    { key: '/manager', label: 'Dashboard', icon: <Gauge size={iconSize} /> },
    { key: '/manager/employees', label: 'Employees', icon: <Users size={iconSize} /> },
    { key: '/manager/tests', label: 'Tests', icon: <FlaskConical size={iconSize} /> },
    {
      key: '/manager/learning-resources',
      label: 'Learning Resources',
      icon: <BookOpen size={iconSize} />,
    },
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
    { key: '/leaderboard', label: 'Leaderboard', icon: <Trophy size={iconSize} /> },
  ]
  const footerItems: MenuProps['items'] = [
    { key: '/manager/settings', label: 'Settings', icon: <Settings size={iconSize} /> },
  ]

  const selectedPath = location.pathname.startsWith('/manager/test-submissions')
    ? '/manager/test-submissions'
    : location.pathname.startsWith('/manager/submission')
      ? '/manager/test-submissions'
      : location.pathname.startsWith('/manager/test-builder')
        ? '/manager/tests'
        : location.pathname.startsWith('/manager/learning-resources')
          ? '/manager/learning-resources'
          : location.pathname

  return (
    <AppLayout
      title="Manager Portal"
      pageHeading={pageHeading}
      items={items}
      footerItems={footerItems}
      selectedKeys={[selectedPath]}
      onNavigate={navigate}
      maxWidth={maxWidth}
    >
      {children}
    </AppLayout>
  )
}

export default ManagerLayout
