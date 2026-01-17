import { useState } from 'react'
import { Button, Card, Form, Input, Space, Typography, message } from 'antd'
import { Selector } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { loginWithEmail } from '../../services/shared'
import { supabase } from '../../services/supabase'
import type { UserRole } from '../../types'
import { useSession } from '../../hooks/useSession'

const roleOptions = [
  { label: 'Employee', value: 'employee' },
  { label: 'Employer', value: 'employer' },
  { label: 'Admin', value: 'admin' },
]

type LoginFormValues = {
  email: string
  code?: string
}

const LoginPage = () => {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const { setSession } = useSession()
  const [role, setRole] = useState<UserRole>('employee')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'request' | 'verify'>('request')

  const sendCode = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) {
      message.error(error.message)
      return false
    }
    message.success('Check your email for the 6-digit code.')
    return true
  }

  const onSubmit = async (values: LoginFormValues) => {
    setLoading(true)
    try {
      if (step === 'request') {
        const sent = await sendCode(values.email)
        if (sent) {
          setStep('verify')
          form.setFieldsValue({ code: '' })
        }
        return
      }

      const token = (values.code || '').replace(/\s+/g, '')
      const { error } = await supabase.auth.verifyOtp({
        email: values.email,
        token,
        type: 'email',
      })
      if (error) {
        message.error(error.message)
        return
      }

      const response = await loginWithEmail({ email: values.email, role })
      if (!response.success || !response.data) {
        message.error(response.error || 'Unable to sign in.')
        return
      }

      const nextRole = response.data.role ?? role
      setSession({ email: response.data.email, role: nextRole })
      if (nextRole) {
        navigate(`/${nextRole}`)
      } else {
        message.error('No role assigned. Please contact support.')
        navigate('/login')
      }
    } finally {
      setLoading(false)
    }
  }

  const onResendCode = async () => {
    const values = await form.validateFields(['email'])
    setLoading(true)
    try {
      await sendCode(values.email)
    } finally {
      setLoading(false)
    }
  }

  const onChangeEmail = () => {
    setStep('request')
    form.setFieldsValue({ code: '' })
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
          <Form<LoginFormValues> form={form} layout="vertical" onFinish={onSubmit}>
            <Form.Item
              name="email"
              label="Work email"
              rules={[
                { required: true, message: 'Please enter your email.' },
                { type: 'email', message: 'Enter a valid email.' },
              ]}
            >
              <Input
                placeholder="you@company.com"
                aria-label="Work email"
                disabled={step === 'verify' || loading}
              />
            </Form.Item>
            <Form.Item label="Role">
              <div
                style={{
                  pointerEvents: step === 'verify' || loading ? 'none' : 'auto',
                  opacity: step === 'verify' || loading ? 0.6 : 1,
                }}
              >
                <Selector
                  options={roleOptions}
                  value={[role]}
                  columns={3}
                  onChange={(next) => setRole((next[0] as UserRole) || 'employee')}
                />
              </div>
            </Form.Item>
            {step === 'verify' ? (
              <Form.Item
                name="code"
                label="6-digit code"
                rules={[
                  { required: true, message: 'Enter the 6-digit code.' },
                  { pattern: /^\d{6}$/, message: 'Code must be 6 digits.' },
                ]}
              >
                <Input
                  placeholder="123456"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  aria-label="6-digit code"
                />
              </Form.Item>
            ) : null}
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              aria-label={step === 'request' ? 'Send code' : 'Verify code'}
            >
              {step === 'request' ? 'Send code' : 'Verify code'}
            </Button>
            {step === 'verify' ? (
              <Space direction="vertical" size="middle" className="w-full">
                <Button block onClick={onResendCode} disabled={loading}>
                  Resend code
                </Button>
                <Button type="link" onClick={onChangeEmail} disabled={loading}>
                  Use a different email
                </Button>
              </Space>
            ) : null}
          </Form>
        </Space>
      </Card>
    </div>
  )
}

export default LoginPage
