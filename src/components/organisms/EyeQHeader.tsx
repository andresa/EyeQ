import { Layout, Space, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../../hooks/useSession'

interface EyeQHeaderProps {
  title: string
}

const EyeQHeader = ({ title }: EyeQHeaderProps) => {
  const navigate = useNavigate()
  const { session, clearSession } = useSession()

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
      {session ? (
        <Space size="middle">
          <Typography.Text className="text-[#d6e4ff]">
            {session.email}
          </Typography.Text>
          <Typography.Link
            className="text-white"
            onClick={() => {
              clearSession()
              navigate('/login')
            }}
          >
            Sign out
          </Typography.Link>
        </Space>
      ) : null}
    </Layout.Header>
  )
}

export default EyeQHeader
