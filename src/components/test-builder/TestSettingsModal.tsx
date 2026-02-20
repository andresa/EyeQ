import { Form, Modal, Switch } from 'antd'
import { useEffect } from 'react'
import type { TestSettings } from '../../types'

interface TestSettingsModalProps {
  open: boolean
  onClose: () => void
  settings: TestSettings
  onChange: (settings: TestSettings) => void
}

const TestSettingsModal = ({
  open,
  onClose,
  settings,
  onChange,
}: TestSettingsModalProps) => {
  const [form] = Form.useForm<TestSettings>()

  useEffect(() => {
    if (open) {
      form.setFieldsValue(settings)
    }
  }, [open, settings, form])

  const handleOk = async () => {
    const values = await form.validateFields()
    onChange(values)
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
      <Form form={form} layout="vertical" initialValues={settings}>
        <Form.Item
          name="allowBackNavigation"
          valuePropName="checked"
          extra="When enabled, employees can navigate back to review and change answers in previous sections. When disabled, they can only move forward."
        >
          <Switch
            checkedChildren="Back navigation allowed"
            unCheckedChildren="Back navigation disabled"
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default TestSettingsModal
