import { Grid, Layout, Typography } from 'antd'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../../hooks/useSession'
import { EyeQLogo } from '../molecules/EyeQLogo'
import clsx from 'clsx'

interface EyeQHeaderProps {
  menuButton?: ReactNode
}

const EyeQHeader = ({ menuButton }: EyeQHeaderProps) => {
  const navigate = useNavigate()
  const { userProfile } = useSession()
  const isMobile = !Grid.useBreakpoint().md

  return (
    <Layout.Header className="sticky top-0 z-50 flex h-[72px] items-center px-3 md:px-5 lg:px-6 bg-accent-700">
      <div className="flex items-center gap-2 md:gap-3 min-w-0">{menuButton}</div>

      <button
        type="button"
        className={clsx(
          'flex shrink-0 cursor-pointer items-center gap-2.5 bg-transparent border-none p-0',
          isMobile && 'absolute left-1/2 -translate-x-1/2',
        )}
        onClick={() => navigate('/')}
      >
        <EyeQLogo size="small" shadow rounded color="white" />
        {!isMobile && (
          <span className="text-2xl font-semibold tracking-wide text-white font-heading">
            EyeQ
          </span>
        )}
      </button>

      {!isMobile && userProfile?.firstName && (
        <Typography.Text className="ml-auto truncate text-white/90 font-medium">
          {userProfile.firstName}
        </Typography.Text>
      )}
    </Layout.Header>
  )
}

export default EyeQHeader
