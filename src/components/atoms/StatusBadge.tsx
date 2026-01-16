import { Tag } from 'antd'
import type { TestInstanceStatus } from '../../types'

interface StatusBadgeProps {
  status: TestInstanceStatus
}

const statusMap: Record<TestInstanceStatus, { color: string; label: string }> =
  {
    pending: { color: 'blue', label: 'Pending' },
    completed: { color: 'green', label: 'Completed' },
    marked: { color: 'purple', label: 'Marked' },
    expired: { color: 'red', label: 'Expired' },
  }

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const { color, label } = statusMap[status]
  return <Tag color={color}>{label}</Tag>
}

export default StatusBadge
