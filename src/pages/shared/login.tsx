import { useEffect } from 'react'
import { Card, Divider, Spin, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../../hooks/useSession'
import { getDashboardRoute, isDevMode } from '../../utils/auth'
import { EyeQLogo } from '../../components/molecules/EyeQLogo'
import MagicLinkForm from '../../components/molecules/MagicLinkForm'

const LoginPage = () => {
  const navigate = useNavigate()
  const { userProfile, isLoading, isAuthenticated, profileError } = useSession()

  useEffect(() => {
    if (!isLoading && isAuthenticated && userProfile) {
      const targetRoute = getDashboardRoute(userProfile.role)
      navigate(targetRoute, { replace: true })
    }
  }, [isAuthenticated, userProfile, isLoading, navigate])

  if (isLoading) {
    return (
      <div className="h-screen overflow-y-auto flex items-center justify-center p-6">
        <div className="flex justify-center py-8">
          <Spin />
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <div className="flex flex-col gap-6 w-full">
            <div className="text-center">
              {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
              <div
                className="flex justify-center"
                onClick={(e) => {
                  if (e.shiftKey && isDevMode()) navigate('/dev-login')
                }}
              >
                <EyeQLogo size="medium" />
              </div>
              <Typography.Title level={3} className="mt-4">
                Welcome to EyeQ
              </Typography.Title>
              <Typography.Text type="secondary">
                Enter your email to sign in
              </Typography.Text>
            </div>
            <MagicLinkForm profileError={profileError} />
            <Divider className="my-2">
              <Typography.Text type="secondary" className="text-xs">
                Passwordless authentication
              </Typography.Text>
            </Divider>
            <Typography.Text type="secondary" className="text-center text-xs block">
              By signing in, you agree to our terms of service and privacy policy.
            </Typography.Text>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default LoginPage
