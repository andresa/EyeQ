import { Alert, Button, Card, Divider, Space, Typography } from 'antd'
import { GoogleOutlined, WindowsOutlined } from '@ant-design/icons'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../../hooks/useSession'
import { getDashboardRoute } from '../../utils/auth'

const LoginPage = () => {
  const navigate = useNavigate()
  const { swaUser, userProfile, profileError, isLoading, clearSession } = useSession()

  // Redirect authenticated users to their role-specific dashboard
  useEffect(() => {
    if (!isLoading && swaUser && userProfile) {
      const targetRoute = getDashboardRoute(userProfile.role)
      navigate(targetRoute, { replace: true })
    }
  }, [swaUser, userProfile, isLoading, navigate])

  const handleMicrosoftSignIn = () => {
    // After login, return to the home page which will redirect based on role
    window.location.href = '/.auth/login/aad?post_login_redirect_uri=/'
  }

  const handleGoogleSignIn = () => {
    // After login, return to the home page which will redirect based on role
    window.location.href = '/.auth/login/google?post_login_redirect_uri=/'
  }

  const handleTryDifferentAccount = () => {
    clearSession()
    window.location.href = '/.auth/logout?post_logout_redirect_uri=/login'
  }

  if (isLoading) {
    return (
      <div className="page-center">
        <Card className="w-full max-w-md">
          <div className="flex justify-center py-8">
            <Typography.Text type="secondary">Loading...</Typography.Text>
          </div>
        </Card>
      </div>
    )
  }

  // User is authenticated via SWA but not found in database
  const showNotRegisteredError = swaUser && profileError

  return (
    <div className="page-center">
      <Card className="w-full max-w-md">
        <Space direction="vertical" size="large" className="w-full">
          <div className="text-center">
            <Typography.Title level={3}>Welcome to EyeQ</Typography.Title>
            <Typography.Text type="secondary">
              Sign in with your account to continue.
            </Typography.Text>
          </div>

          {showNotRegisteredError && (
            <Alert
              type="warning"
              showIcon
              message="Account not registered"
              description="Your email is not registered in the system. Please contact your administrator to create your account."
              action={
                <Button size="small" onClick={handleTryDifferentAccount}>
                  Try different account
                </Button>
              }
            />
          )}

          {!showNotRegisteredError && (
            <div className="flex flex-col gap-3">
              <Button
                size="large"
                icon={<WindowsOutlined />}
                onClick={handleMicrosoftSignIn}
                block
                className="flex items-center justify-center"
              >
                Sign in with Microsoft
              </Button>

              <Button
                size="large"
                icon={<GoogleOutlined />}
                onClick={handleGoogleSignIn}
                block
                className="flex items-center justify-center"
              >
                Sign in with Google
              </Button>
            </div>
          )}

          <Divider className="my-2">
            <Typography.Text type="secondary" className="text-xs">
              Secure authentication via Azure
            </Typography.Text>
          </Divider>

          <Typography.Text type="secondary" className="text-center text-xs block">
            By signing in, you agree to our terms of service and privacy policy.
          </Typography.Text>
        </Space>
      </Card>
    </div>
  )
}

export default LoginPage
