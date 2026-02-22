import { Button, Card, Tooltip } from 'antd'
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import type { TestComponent } from '../../types'
import ComponentEditor from './ComponentEditor'
import { QuestionTypeTag } from '../organisms/QuestionTypeTag'

interface ComponentCardProps {
  component: TestComponent
  index: number
  componentsCount: number
  companyId?: string
  onChange: (component: TestComponent) => void
  onMove: (direction: 'up' | 'down') => void
  onDelete: () => void
}

const ComponentCard = ({
  component,
  index,
  componentsCount,
  companyId,
  onChange,
  onMove,
  onDelete,
}: ComponentCardProps) => (
  <Card
    title={<QuestionTypeTag type={component.type} />}
    extra={
      <div className="flex gap-2">
        <Button
          size="small"
          type="text"
          icon={<ChevronUp size={18} />}
          disabled={index === 0}
          onClick={() => onMove('up')}
          aria-label="Move component up"
        />
        <Button
          size="small"
          type="text"
          icon={<ChevronDown size={18} />}
          disabled={index === componentsCount - 1}
          onClick={() => onMove('down')}
          aria-label="Move component down"
        />
        <Tooltip title="Delete component">
          <Button
            size="small"
            type="text"
            danger
            icon={<Trash2 size={18} />}
            onClick={onDelete}
            aria-label="Delete component"
          />
        </Tooltip>
      </div>
    }
  >
    <ComponentEditor component={component} companyId={companyId} onChange={onChange} />
  </Card>
)

export default ComponentCard
