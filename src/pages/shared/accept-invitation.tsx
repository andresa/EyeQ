import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Button, Card, Result, Spin, Typography } from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons'
import { validateInvitation, acceptInvitation } from '../../services/shared'
import { useSession } from '../../hooks/useSession'
import type { InvitationValidation } from '../../types'

const { Title, Text, Paragraph } = Typography

type PageState = 'loading' | 'invalid' | 'valid' | 'accepting' | 'success' | 'error'

const AcceptInvitationPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useSession()
  const token = searchParams.get('token')

  const [pageState, setPageState] = useState<PageState>('loading')
  const [invitation, setInvitation] = useState<InvitationValidation | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Validate the invitation token
  useEffect(() => {
    const validate = async () => {
      if (!token) {
        setError('No invitation token provided.')
        setPageState('invalid')
        return
      }

      try {
        const response = await validateInvitation(token)
        if (response.success && response.data) {
          setInvitation(response.data)
          setPageState('valid')
        } else {
          setError(response.error || 'Invalid invitation.')
          setPageState('invalid')
        }
      } catch {
        setError('Failed to validate invitation.')
        setPageState('invalid')
      }
    }

    validate()
  }, [token])

  // Handle accepting the invitation
  const handleAccept = async () => {
    if (!token) return

    setPageState('accepting')

    try {
      const response = await acceptInvitation(token)
      if (response.success && response.data) {
        // Store the session token and user data directly
        // This avoids a race condition with Cosmos DB eventual consistency
        login(response.data.token, response.data.user)
        setPageState('success')
      } else {
        setError(response.error || 'Failed to accept invitation.')
        setPageState('error')
      }
    } catch {
      setError('Failed to accept invitation. Please try again.')
      setPageState('error')
    }
  }

  // Loading state
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent-500 via-accent-600 to-accent-700">
        <Card className="w-full max-w-md text-center shadow-2xl">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
          <Title level={4} className="mt-4">
            Validating invitation...
          </Title>
        </Card>
      </div>
    )
  }

  // Invalid token
  if (pageState === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent-500 via-accent-600 to-accent-700 p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <Result
            status="error"
            icon={<CloseCircleOutlined />}
            title="Invalid Invitation"
            subTitle={error || 'This invitation link is invalid or has expired.'}
            extra={
              <Button type="primary" onClick={() => navigate('/login')}>
                Go to Login
              </Button>
            }
          />
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
            title="Welcome to EyeQ!"
            subTitle="Your account has been set up and you're now logged in."
            extra={
              <Button type="primary" size="large" onClick={() => navigate('/')}>
                Go to Dashboard
              </Button>
            }
          />
        </Card>
      </div>
    )
  }

  // Error state (after attempting to accept)
  if (pageState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent-500 via-accent-600 to-accent-700 p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <Result
            status="error"
            title="Something went wrong"
            subTitle={error}
            extra={[
              <Button key="retry" type="primary" onClick={handleAccept}>
                Try Again
              </Button>,
              <Button key="login" onClick={() => navigate('/login')}>
                Go to Login
              </Button>,
            ]}
          />
        </Card>
      </div>
    )
  }

  // Valid invitation - show acceptance UI
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent-500 via-accent-600 to-accent-700 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-accent-500 to-accent-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-white font-bold">EyeQ</span>
          </div>
          <Title level={2} className="mb-2">
            You&apos;re Invited!
          </Title>
          <Paragraph type="secondary">
            <strong>{invitation?.userName}</strong>, you&apos;ve been invited to join{' '}
            <strong>{invitation?.companyName}</strong> on EyeQ.
          </Paragraph>
        </div>

        {pageState === 'accepting' ? (
          <div className="text-center py-8">
            <Spin indicator={<LoadingOutlined style={{ fontSize: 36 }} spin />} />
            <Text className="block mt-4">Setting up your account...</Text>
          </div>
        ) : (
          <>
            <Paragraph type="secondary" className="text-center mb-6">
              Click the button below to accept your invitation and get started.
            </Paragraph>

            <Button
              type="primary"
              size="large"
              block
              onClick={handleAccept}
              className="h-12"
            >
              Accept Invitation & Join
            </Button>
          </>
        )}

        <div className="mt-6 pt-4 border-t border-gray-200 text-center">
          <Text type="secondary" className="text-xs">
            Invitation expires:{' '}
            {invitation?.expiresAt
              ? new Date(invitation.expiresAt).toLocaleDateString()
              : 'Unknown'}
          </Text>
        </div>
      </Card>
    </div>
  )
}

export default AcceptInvitationPage
