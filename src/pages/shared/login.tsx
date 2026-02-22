import { useState, useEffect } from 'react'
import { Alert, Button, Card, Divider, Form, Input, Select, Spin, Typography } from 'antd'
import {
  MailOutlined,
  CheckCircleOutlined,
  UserOutlined,
  TeamOutlined,
  CrownOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../../hooks/useSession'
import { getDashboardRoute, isDevMode } from '../../utils/auth'
import {
  requestMagicLink,
  getDevUsers,
  devLogin,
  type DevUser,
  type DevUsersResponse,
} from '../../services/shared'

const LoginPage = () => {
  const navigate = useNavigate()
  const { userProfile, isLoading, isAuthenticated, login } = useSession()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Dev login state
  const [devModeEnabled, setDevModeEnabled] = useState(false)
  const [devUsers, setDevUsers] = useState<DevUsersResponse | null>(null)
  const [devUsersLoading, setDevUsersLoading] = useState(false)
  const [devLoginLoading, setDevLoginLoading] = useState(false)

  // Redirect authenticated users to their role-specific dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated && userProfile) {
      const targetRoute = getDashboardRoute(userProfile.role)
      navigate(targetRoute, { replace: true })
    }
  }, [isAuthenticated, userProfile, isLoading, navigate])

  // Check if dev mode is enabled and fetch dev users
  useEffect(() => {
    if (!devModeEnabled && !devUsersLoading && isDevMode()) {
      setDevModeEnabled(true)
      setDevUsersLoading(true)
      // Fetch dev users since dev mode is enabled
      getDevUsers()
        .then((usersResponse) => {
          if (usersResponse?.success && usersResponse.data) {
            setDevUsers(usersResponse.data)
          }
        })
        .catch(() => {
          // Silently fail - dev login just won't be available
        })
        .finally(() => {
          setDevUsersLoading(false)
        })
    }
  }, [devModeEnabled, devUsersLoading])

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await requestMagicLink(email.trim())
      if (response.success) {
        setSuccess(true)
      } else {
        setError(response.error || 'Failed to send login link.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setSuccess(false)
    setEmail('')
    setError(null)
  }

  const handleDevLogin = async (
    userId: string,
    userType: 'admin' | 'manager' | 'employee',
  ) => {
    setDevLoginLoading(true)
    setError(null)

    try {
      const response = await devLogin(userId, userType)
      if (response.success && response.data) {
        // Use login with user data to avoid race condition
        login(response.data.token, response.data.user)
        const targetRoute = getDashboardRoute(response.data.user.role)
        navigate(targetRoute, { replace: true })
      } else {
        setError(response.error || 'Dev login failed.')
      }
    } catch {
      setError('Dev login failed. Is the API running?')
    } finally {
      setDevLoginLoading(false)
    }
  }

  const formatUserOption = (user: DevUser) => ({
    value: user.id,
    label: `${user.firstName} ${user.lastName}${user.email ? ` (${user.email})` : ''}`,
  })

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

  const showDevLogin = devModeEnabled && devUsers

  return (
    <div className="page-center">
      <Card className="w-full max-w-md">
        <div className="flex flex-col gap-6 w-full">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-accent-500 to-accent-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-white font-bold">EyeQ</span>
            </div>
            <Typography.Title level={3} className="mb-1">
              Welcome to EyeQ
            </Typography.Title>
            <Typography.Text type="secondary">
              {success
                ? 'Check your email for a login link'
                : 'Enter your email to sign in'}
            </Typography.Text>
          </div>

          {/* Dev Login Section */}
          {showDevLogin && !success && (
            <>
              <div className="rounded-lg border p-4 bg-accent-700">
                <div className="mb-4 font-semibold text-white">Dev Login (EyeQDBDev)</div>
                {devLoginLoading ? (
                  <div className="text-center py-4">
                    <Spin />
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 w-full">
                    {devUsers.admins.length > 0 && (
                      <Select
                        placeholder={
                          <span>
                            <CrownOutlined /> Select Admin
                          </span>
                        }
                        options={devUsers.admins.map(formatUserOption)}
                        onChange={(userId) => handleDevLogin(userId, 'admin')}
                        style={{ width: '100%' }}
                        allowClear
                      />
                    )}

                    {devUsers.managers.length > 0 && (
                      <Select
                        placeholder={
                          <span>
                            <TeamOutlined /> Select Manager
                          </span>
                        }
                        options={devUsers.managers.map(formatUserOption)}
                        onChange={(userId) => handleDevLogin(userId, 'manager')}
                        style={{ width: '100%' }}
                        allowClear
                      />
                    )}

                    {devUsers.employees.length > 0 && (
                      <Select
                        placeholder={
                          <span>
                            <UserOutlined /> Select Employee
                          </span>
                        }
                        options={devUsers.employees.map(formatUserOption)}
                        onChange={(userId) => handleDevLogin(userId, 'employee')}
                        style={{ width: '100%' }}
                        allowClear
                      />
                    )}
                  </div>
                )}
              </div>

              <Divider className="my-2">
                <Typography.Text type="secondary" className="text-xs">
                  or use magic link
                </Typography.Text>
              </Divider>
            </>
          )}

          {success ? (
            <div className="text-center py-4">
              <CheckCircleOutlined
                style={{ fontSize: 48 }}
                className="mb-4 text-[var(--color-success)]"
              />
              <Typography.Paragraph>
                We&apos;ve sent a login link to <strong>{email}</strong>
              </Typography.Paragraph>
              <Typography.Paragraph type="secondary" className="text-sm">
                Click the link in the email to sign in. The link expires in 15 minutes.
              </Typography.Paragraph>
              <Button type="link" onClick={handleReset}>
                Use a different email
              </Button>
            </div>
          ) : (
            <Form onFinish={handleSubmit} layout="vertical">
              {error && <Alert type="error" message={error} showIcon className="mb-4" />}

              <Form.Item label="Email address" required className="mb-4">
                <Input
                  size="large"
                  type="email"
                  placeholder="you@example.com"
                  prefix={<MailOutlined className="text-gray-400" />}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus={!showDevLogin}
                />
              </Form.Item>

              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={isSubmitting}
              >
                Send Login Link
              </Button>
            </Form>
          )}

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
  )
}

export default LoginPage
