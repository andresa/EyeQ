import { Button, Layout, Typography } from 'antd'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../../hooks/useSession'
import { LogOut } from 'lucide-react'

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
    <Layout.Header className="flex items-center justify-between px-3 md:px-5 lg:px-6 bg-accent-700">
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        {menuButton}
        <Typography.Title
          level={4}
          className="!m-0 shrink-0 cursor-pointer !text-white"
          onClick={() => navigate('/')}
        >
          EyeQ
        </Typography.Title>
      </div>
      {userProfile && (
        <div className="flex min-w-0 items-center gap-4 md:gap-3">
          {userProfile?.firstName && (
            <Typography.Text className="truncate text-white font-semibold">
              {userProfile.firstName}
            </Typography.Text>
          )}
          <Button
            type="text"
            icon={<LogOut />}
            onClick={handleSignOut}
            className="text-white"
          />
        </div>
      )}
    </Layout.Header>
  )
}

export default EyeQHeader
