import { Input } from 'antd'

interface PhoneInputProps {
  value?: string
  onChange?: (value: string) => void
}

const PhoneInput = ({ value, onChange }: PhoneInputProps) => (
  <Input
    value={value}
    onChange={(event) => onChange?.(event.target.value)}
    placeholder="+61 412 345 678"
    aria-label="Phone number"
  />
)

export default PhoneInput
