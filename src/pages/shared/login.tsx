import { useState, useEffect } from 'react'
import { Alert, Button, Card, Divider, Form, Input, Space, Typography } from 'antd'
import { MailOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../../hooks/useSession'
import { getDashboardRoute } from '../../utils/auth'
import { requestMagicLink } from '../../services/shared'

const LoginPage = () => {
  const navigate = useNavigate()
  const { userProfile, isLoading, isAuthenticated } = useSession()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Redirect authenticated users to their role-specific dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated && userProfile) {
      const targetRoute = getDashboardRoute(userProfile.role)
      navigate(targetRoute, { replace: true })
    }
  }, [isAuthenticated, userProfile, isLoading, navigate])

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

  return (
    <div className="page-center">
      <Card className="w-full max-w-md">
        <Space direction="vertical" size="large" className="w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-white font-bold">EQ</span>
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

          {success ? (
            <div className="text-center py-4">
              <CheckCircleOutlined
                style={{ fontSize: 48, color: '#52c41a' }}
                className="mb-4"
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
                  autoFocus
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
        </Space>
      </Card>
    </div>
  )
}

export default LoginPage
