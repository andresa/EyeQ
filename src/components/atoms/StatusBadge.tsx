import { Tag } from 'antd'
import type { TestInstanceStatus } from '../../types'

interface StatusBadgeProps {
  status: TestInstanceStatus
}

const statusMap: Record<TestInstanceStatus, { color: string; label: string }> = {
  assigned: { color: 'blue', label: 'Assigned' },
  opened: { color: 'cyan', label: 'Opened' },
  'in-progress': { color: 'orange', label: 'In Progress' },
  completed: { color: 'green', label: 'Completed' },
  marked: { color: 'purple', label: 'Marked' },
  expired: { color: 'red', label: 'Expired' },
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const { color, label } = statusMap[status]
  return <Tag color={color}>{label}</Tag>
}

export default StatusBadge
