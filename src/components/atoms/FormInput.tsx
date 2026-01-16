import { Form, Input } from 'antd'

interface FormInputProps {
  name: string
  label: string
  required?: boolean
  placeholder?: string
  type?: 'text' | 'email'
}

const FormInput = ({
  name,
  label,
  required,
  placeholder,
  type = 'text',
}: FormInputProps) => (
  <Form.Item
    name={name}
    label={label}
    rules={
      required
        ? [{ required: true, message: `Please enter ${label.toLowerCase()}` }]
        : []
    }
  >
    <Input type={type} placeholder={placeholder} aria-label={label} />
  </Form.Item>
)

export default FormInput
