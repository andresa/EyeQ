import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Button, Card, Result, Spin, Typography } from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons'
import { verifyMagicLink } from '../../services/shared'
import { useSession } from '../../hooks/useSession'
import { getDashboardRoute } from '../../utils/auth'

const { Title } = Typography

type PageState = 'verifying' | 'success' | 'error'

const VerifyPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login, userProfile } = useSession()
  const token = searchParams.get('token')

  const [pageState, setPageState] = useState<PageState>('verifying')
  const [error, setError] = useState<string | null>(null)
  const verifyAttempted = useRef(false)

  useEffect(() => {
    // Prevent double execution
    if (verifyAttempted.current) return
    verifyAttempted.current = true

    const verify = async () => {
      if (!token) {
        setError('No verification token provided.')
        setPageState('error')
        return
      }

      try {
        const response = await verifyMagicLink(token)
        if (response.success && response.data) {
          // Store the session token and user data directly
          // This avoids a race condition with Cosmos DB eventual consistency
          login(response.data.token, response.data.user)
          setPageState('success')
        } else {
          setError(response.error || 'Failed to verify link.')
          setPageState('error')
        }
      } catch {
        setError('Network error. Please try again.')
        setPageState('error')
      }
    }

    verify()
  }, [token, login])

  // Redirect to dashboard after success
  useEffect(() => {
    if (pageState === 'success' && userProfile) {
      const timer = setTimeout(() => {
        const targetRoute = getDashboardRoute(userProfile.role)
        navigate(targetRoute, { replace: true })
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [pageState, userProfile, navigate])

  // Verifying state
  if (pageState === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent-500 via-accent-600 to-accent-700">
        <Card className="w-full max-w-md text-center shadow-2xl">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
          <Title level={4} className="mt-4">
            Verifying your login...
          </Title>
        </Card>
      </div>
    )
  }

  // Success state
  if (pageState === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent-500 via-accent-600 to-accent-700 p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <Result
            status="success"
            icon={<CheckCircleOutlined />}
            title="Welcome back!"
            subTitle="You're now signed in. Redirecting to your dashboard..."
            extra={
              <Button
                type="primary"
                onClick={() => {
                  const route = userProfile ? getDashboardRoute(userProfile.role) : '/'
                  navigate(route, { replace: true })
                }}
              >
                Go to Dashboard
              </Button>
            }
          />
        </Card>
      </div>
    )
  }

  // Error state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent-500 via-accent-600 to-accent-700 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <Result
          status="error"
          icon={<CloseCircleOutlined />}
          title="Verification Failed"
          subTitle={error || 'This link is invalid or has expired.'}
          extra={[
            <Button key="login" type="primary" onClick={() => navigate('/login')}>
              Go to Login
            </Button>,
          ]}
        />
      </Card>
    </div>
  )
}

export default VerifyPage
