import { useRef, useState } from 'react'
import { Alert, Button, Form, Input, Typography } from 'antd'
import { MailOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { requestMagicLink } from '../../services/shared'

interface MagicLinkFormProps {
  profileError?: string | null
}

const MagicLinkForm = ({ profileError }: MagicLinkFormProps) => {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const honeypotRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await requestMagicLink(email.trim(), honeypotRef.current?.value)
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

  if (success) {
    return (
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
    )
  }

  return (
    <>
      {profileError && <Alert type="warning" message={profileError} showIcon />}
      <div>
        {error && <Alert type="error" message={error} showIcon className="mb-4" />}
        {/* Honeypot: doubles as iOS 26 QuickType workaround and anti-spam trap */}
        <div
          aria-hidden="true"
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' as const }}
        >
          <input
            ref={honeypotRef}
            type="text"
            name="_hp"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>
        <Form.Item label="Email address" layout="vertical" required className="mb-4">
          <Input
            size="large"
            type="email"
            name="email"
            id="login-email"
            placeholder="you@example.com"
            prefix={<MailOutlined className="text-gray-400" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus={true}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit()
            }}
          />
        </Form.Item>
        <Button
          type="primary"
          size="large"
          block
          loading={isSubmitting}
          onClick={handleSubmit}
        >
          Send Login Link
        </Button>
      </div>
    </>
  )
}

export default MagicLinkForm
