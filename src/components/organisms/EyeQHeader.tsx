import { Layout, Typography } from 'antd'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../../hooks/useSession'

interface EyeQHeaderProps {
  title: string
  menuButton?: ReactNode
}

const EyeQHeader = ({ title, menuButton }: EyeQHeaderProps) => {
  const navigate = useNavigate()
  const { userProfile, logout } = useSession()

  const handleSignOut = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <Layout.Header className="flex items-center justify-between bg-[#0b1f3a] px-3 md:px-5 lg:px-6">
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        {menuButton}
        <Typography.Title
          level={4}
          className="!m-0 shrink-0 cursor-pointer !text-white"
          onClick={() => navigate('/')}
        >
          EyeQ
        </Typography.Title>
        <Typography.Text className="hidden text-[#d6e4ff] md:inline">
          {title}
        </Typography.Text>
      </div>
      {userProfile && (
        <div className="flex min-w-0 items-center gap-4 md:gap-3">
          {userProfile?.firstName && (
            <Typography.Text className="truncate text-[#d6e4ff]">
              {userProfile.firstName}
            </Typography.Text>
          )}
          <Typography.Link
            className="shrink-0 whitespace-nowrap text-white"
            onClick={handleSignOut}
          >
            Sign out
          </Typography.Link>
        </div>
      )}
    </Layout.Header>
  )
}

export default EyeQHeader
