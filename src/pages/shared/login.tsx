import { useState } from 'react'
import { Button, Card, Form, Input, Space, Typography, message } from 'antd'
import { Selector } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { loginWithEmail } from '../../services/shared'
import type { UserRole } from '../../types'
import { useSession } from '../../hooks/useSession'

const roleOptions = [
  { label: 'Employee', value: 'employee' },
  { label: 'Employer', value: 'employer' },
  { label: 'Admin', value: 'admin' },
]

const LoginPage = () => {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const { setSession } = useSession()
  const [role, setRole] = useState<UserRole>('employee')
  const [loading, setLoading] = useState(false)

  const onSubmit = async () => {
    const values = await form.validateFields()
    setLoading(true)
    const response = await loginWithEmail({ email: values.email, role })
    setLoading(false)
    if (!response.success || !response.data) {
      message.error(response.error || 'Unable to sign in.')
      return
    }
    setSession({ email: values.email, role })
    navigate(`/${role}`)
  }

  return (
    <div className="page-center">
      <Card className="w-full max-w-md">
        <Space orientation="vertical" size="large" className="w-full">
          <div>
            <Typography.Title level={3}>Welcome to EyeQ</Typography.Title>
            <Typography.Text type="secondary">
              Sign in with your work email to continue.
            </Typography.Text>
          </div>
          <Form form={form} layout="vertical" onFinish={onSubmit}>
            <Form.Item
              name="email"
              label="Work email"
              rules={[
                { required: true, message: 'Please enter your email.' },
                { type: 'email', message: 'Enter a valid email.' },
              ]}
            >
              <Input placeholder="you@company.com" aria-label="Work email" />
            </Form.Item>
            <Form.Item label="Role">
              <Selector
                options={roleOptions}
                value={[role]}
                columns={3}
                onChange={(next) =>
                  setRole((next[0] as UserRole) || 'employee')
                }
              />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              aria-label="Sign in"
            >
              Sign in
            </Button>
          </Form>
        </Space>
      </Card>
    </div>
  )
}

export default LoginPage
