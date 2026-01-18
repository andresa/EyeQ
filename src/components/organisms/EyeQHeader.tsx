import { Layout, Space, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../../hooks/useSession'

interface EyeQHeaderProps {
  title: string
}

const EyeQHeader = ({ title }: EyeQHeaderProps) => {
  const navigate = useNavigate()
  const { swaUser, userProfile, clearSession } = useSession()

  const handleSignOut = () => {
    // Clear local session state
    clearSession()
    // Redirect to SWA logout endpoint which will redirect to login page after
    window.location.href = '/.auth/logout?post_logout_redirect_uri=/login'
  }

  // Display user's name if available, fallback to email
  const displayName = userProfile
    ? `${userProfile.firstName} ${userProfile.lastName}`
    : swaUser?.userDetails

  return (
    <Layout.Header className="flex items-center justify-between bg-[#0b1f3a] px-6">
      <Space>
        <Typography.Title
          level={4}
          className="m-0 cursor-pointer text-white"
          onClick={() => navigate('/')}
        >
          EyeQ
        </Typography.Title>
        <Typography.Text className="text-[#d6e4ff]">{title}</Typography.Text>
      </Space>
      {(swaUser || userProfile) && (
        <Space size="middle">
          <Typography.Text className="text-[#d6e4ff]">{displayName}</Typography.Text>
          <Typography.Link className="text-white" onClick={handleSignOut}>
            Sign out
          </Typography.Link>
        </Space>
      )}
    </Layout.Header>
  )
}

export default EyeQHeader
