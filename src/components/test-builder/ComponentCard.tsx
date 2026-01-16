import { Button, Card, Space, Typography } from 'antd'
import type { TestComponent } from '../../types'
import ComponentEditor from './ComponentEditor'

interface ComponentCardProps {
  component: TestComponent
  index: number
  onChange: (component: TestComponent) => void
  onMove: (direction: 'up' | 'down') => void
  onDelete: () => void
}

const ComponentCard = ({
  component,
  index,
  onChange,
  onMove,
  onDelete,
}: ComponentCardProps) => (
  <Card
    className="mb-4"
    title={
      <Space>
        <Typography.Text strong>
          {index + 1}. {component.type.replace('_', ' ')}
        </Typography.Text>
      </Space>
    }
    extra={
      <Space>
        <Button onClick={() => onMove('up')}>Up</Button>
        <Button onClick={() => onMove('down')}>Down</Button>
        <Button danger onClick={onDelete}>
          Delete
        </Button>
      </Space>
    }
  >
    <ComponentEditor component={component} onChange={onChange} />
  </Card>
)

export default ComponentCard
