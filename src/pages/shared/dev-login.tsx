import { useState, useEffect } from 'react'
import { Alert, Card, Divider, Spin, Typography } from 'antd'
import Selection from '../../components/atoms/Selection'
import { UserOutlined, TeamOutlined, CrownOutlined } from '@ant-design/icons'
import { Navigate, useNavigate } from 'react-router-dom'
import { useSession } from '../../hooks/useSession'
import { getDashboardRoute, isDevMode } from '../../utils/auth'
import {
  getDevUsers,
  devLogin,
  type DevUser,
  type DevUsersResponse,
} from '../../services/shared'
import { EyeQLogo } from '../../components/molecules/EyeQLogo'
import MagicLinkForm from '../../components/molecules/MagicLinkForm'
import { formatUserName } from '../../utils/formatUserName'

const DevLoginPage = () => {
  const navigate = useNavigate()
  const { userProfile, isLoading, isAuthenticated, login, profileError } = useSession()

  const [devUsers, setDevUsers] = useState<DevUsersResponse | null>(null)
  const [devUsersLoading, setDevUsersLoading] = useState(true)
  const [devLoginLoading, setDevLoginLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && isAuthenticated && userProfile) {
      const targetRoute = getDashboardRoute(userProfile.role)
      navigate(targetRoute, { replace: true })
    }
  }, [isAuthenticated, userProfile, isLoading, navigate])

  useEffect(() => {
    getDevUsers()
      .then((usersResponse) => {
        if (usersResponse?.success && usersResponse.data) {
          setDevUsers(usersResponse.data)
        }
      })
      .catch(() => {})
      .finally(() => {
        setDevUsersLoading(false)
      })
  }, [])

  if (!isDevMode()) {
    return <Navigate to="/login" replace />
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
    label: `${formatUserName(user)}${user.email ? ` (${user.email})` : ''}`,
  })

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
              <div className="flex justify-center">
                <EyeQLogo size="medium" />
              </div>
              <Typography.Title level={3} className="mt-4">
                Welcome to EyeQ
              </Typography.Title>
              <Typography.Text type="secondary">Dev Login</Typography.Text>
            </div>
            {error && <Alert type="error" title={error} showIcon />}
            {devUsersLoading ? (
              <div className="text-center py-4">
                <Spin />
              </div>
            ) : (
              devUsers && (
                <div className="rounded-lg border p-4 bg-accent-700">
                  <div className="mb-4 font-semibold text-white">
                    Dev Login (EyeQDBDev)
                  </div>
                  {devLoginLoading ? (
                    <div className="text-center py-4">
                      <Spin />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 w-full">
                      {devUsers.admins.length > 0 && (
                        <Selection<string>
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
                        <Selection<string>
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
                        <Selection<string>
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
              )
            )}

            <Divider className="my-2">
              <Typography.Text type="secondary" className="text-xs">
                or use magic link
              </Typography.Text>
            </Divider>
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

export default DevLoginPage
