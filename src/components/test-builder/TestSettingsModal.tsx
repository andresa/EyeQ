import { Checkbox, Form, InputNumber, Modal, Typography } from 'antd'
import { useEffect } from 'react'
import type { TestSettings } from '../../types'

interface TestSettingsModalProps {
  open: boolean
  onClose: () => void
  settings: TestSettings
  onChange: (settings: TestSettings) => void
}

interface SettingsFormValues {
  allowBackNavigation: boolean
  _hours: number | null
  _minutes: number | null
}

const TestSettingsModal = ({
  open,
  onClose,
  settings,
  onChange,
}: TestSettingsModalProps) => {
  const [form] = Form.useForm<SettingsFormValues>()

  useEffect(() => {
    if (open) {
      const total = settings.timeLimitMinutes ?? 0
      form.setFieldsValue({
        allowBackNavigation: settings.allowBackNavigation,
        _hours: total >= 60 ? Math.floor(total / 60) : null,
        _minutes: total % 60 || (total ? 0 : null),
      })
    }
  }, [open, settings, form])

  const handleOk = async () => {
    const values = await form.validateFields()
    const totalMinutes = (values._hours || 0) * 60 + (values._minutes || 0)
    onChange({
      allowBackNavigation: values.allowBackNavigation,
      timeLimitMinutes: totalMinutes > 0 ? totalMinutes : null,
    })
    onClose()
  }

  return (
    <Modal
      title="Test settings"
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText="Save"
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="allowBackNavigation"
          valuePropName="checked"
          extra="When selected, employees can navigate back to review and change answers in previous sections. When disabled, they can only move forward."
        >
          <Checkbox>Allow back navigation</Checkbox>
        </Form.Item>
        <Typography.Text strong className="block mb-2">
          Time to complete
        </Typography.Text>
        <div className="flex items-center gap-2 mb-1">
          <Form.Item name="_hours" className="mb-0" noStyle>
            <InputNumber
              min={0}
              max={23}
              precision={0}
              placeholder="0"
              className="w-20"
            />
          </Form.Item>
          <Typography.Text>hours</Typography.Text>
          <Form.Item name="_minutes" className="mb-0" noStyle>
            <InputNumber
              min={0}
              max={59}
              precision={0}
              placeholder="0"
              className="w-20"
            />
          </Form.Item>
          <Typography.Text>minutes</Typography.Text>
        </div>
        <Typography.Text type="secondary" className="text-xs">
          Maximum time employees have to complete the test from the moment they open it.
          Leave blank for no time restriction.
        </Typography.Text>
      </Form>
    </Modal>
  )
}

export default TestSettingsModal
