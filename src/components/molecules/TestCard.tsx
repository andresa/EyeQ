import { Card, Space, Typography } from 'antd'
import StatusBadge from '../atoms/StatusBadge'
import type { TestInstance, TestTemplate } from '../../types'
import { formatDateTime } from '../../utils/date'

interface TestCardProps {
  instance: TestInstance
  test?: TestTemplate
  onOpen?: () => void
}

const TestCard = ({ instance, test, onOpen }: TestCardProps) => (
  <Card hoverable onClick={onOpen} className="mb-4">
    <div className="flex items-start justify-between gap-4">
      <Space orientation="vertical" size={4}>
        <Typography.Text strong>
          {test?.name || instance.testName || instance.testId}
        </Typography.Text>
        <Typography.Text type="secondary">
          Assigned {formatDateTime(instance.assignedAt)}
        </Typography.Text>
        {instance.expiresAt ? (
          <Typography.Text type="secondary">
            Due {formatDateTime(instance.expiresAt)}
          </Typography.Text>
        ) : null}
      </Space>
      <StatusBadge status={instance.status} />
    </div>
  </Card>
)

export default TestCard
