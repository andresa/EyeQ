import { useLocation, useNavigate } from 'react-router-dom'
import type { MenuProps } from 'antd'
import type { PropsWithChildren, ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import AppLayout from './AppLayout'
import { ClipboardList, Gauge, Trophy } from 'lucide-react'
import { useSession } from '../hooks/useSession'
import { fetchLeaderboardSettings } from '../services/shared'

interface EmployeeLayoutProps extends PropsWithChildren {
  pageHeading?: ReactNode
  hideHeader?: boolean
  disableSideMenu?: boolean
}
const EmployeeLayout = ({
  pageHeading,
  children,
  hideHeader,
  disableSideMenu,
}: EmployeeLayoutProps) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { userProfile } = useSession()
  const companyId = userProfile?.companyId

  const { data: settingsData } = useQuery({
    queryKey: ['leaderboard-settings', companyId],
    queryFn: async () => {
      const response = await fetchLeaderboardSettings(companyId!)
      if (!response.success || !response.data) return { boards: [] }
      return response.data
    },
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000,
  })

  const hasLeaderboards = (settingsData?.boards?.length ?? 0) > 0

  const iconSize = 18
  const items: MenuProps['items'] = [
    { key: '/employee', label: 'Dashboard', icon: <Gauge size={iconSize} /> },
    {
      key: '/employee/tests',
      label: 'My tests',
      icon: <ClipboardList size={iconSize} />,
    },
    ...(hasLeaderboards
      ? [{ key: '/leaderboard', label: 'Leaderboard', icon: <Trophy size={iconSize} /> }]
      : []),
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
      hideHeader={hideHeader}
      disableSideMenu={disableSideMenu}
    >
      {children}
    </AppLayout>
  )
}

export default EmployeeLayout
