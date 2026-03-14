import { Button, Layout, Typography } from 'antd'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../../hooks/useSession'
import { LogOut } from 'lucide-react'
import { EyeQLogo } from '../molecules/EyeQLogo'

interface EyeQHeaderProps {
  menuButton?: ReactNode
}

const EyeQHeader = ({ menuButton }: EyeQHeaderProps) => {
  const navigate = useNavigate()
  const { userProfile, logout } = useSession()

  const handleSignOut = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <Layout.Header className="sticky top-0 z-50 flex h-[72px] items-center justify-between px-3 md:px-5 lg:px-6 bg-accent-700">
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        {menuButton}
        <button
          type="button"
          className="flex shrink-0 cursor-pointer items-center gap-2.5 bg-transparent border-none p-0"
          onClick={() => navigate('/')}
        >
          <EyeQLogo size="small" shadow rounded />
          <span className="hidden text-2xl font-semibold tracking-wide text-white font-heading sm:inline">
            EyeQ
          </span>
        </button>
      </div>
      {userProfile && (
        <div className="flex min-w-0 items-center gap-2 md:gap-3">
          {userProfile?.firstName && (
            <Typography.Text className="truncate text-white/90 font-medium">
              {userProfile.firstName}
            </Typography.Text>
          )}
          <Button
            type="text"
            icon={<LogOut size={18} />}
            onClick={handleSignOut}
            className="!text-white/80 hover:!text-white hover:!bg-white/10 transition-colors"
          />
        </div>
      )}
    </Layout.Header>
  )
}

export default EyeQHeader
