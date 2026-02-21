import { Button, Card, Tooltip } from 'antd'
import {
  CheckCircle,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  FileText,
  Info,
  Trash2,
} from 'lucide-react'
import type { TestComponent } from '../../types'
import ComponentEditor from './ComponentEditor'

const typeColors: Record<
  string,
  { color: string; icon: React.ReactNode; label: string; className: string }
> = {
  single_choice: {
    color: 'blue',
    icon: <CheckCircle size={16} color="blue" />,
    label: 'Single choice',
    className: 'bg-blue-500/10',
  },
  multiple_choice: {
    color: 'purple',
    icon: <CheckSquare size={16} color="purple" />,
    label: 'Multiple choice',
    className: 'bg-purple-500/10',
  },
  text: {
    color: 'green',
    icon: <FileText size={16} color="green" />,
    label: 'Text response',
    className: 'bg-green-500/10',
  },
  info: {
    color: 'gray',
    icon: <Info size={16} color="gray" />,
    label: 'Info block',
    className: 'bg-gray-500/10',
  },
}

interface ComponentCardProps {
  component: TestComponent
  index: number
  componentsCount: number
  onChange: (component: TestComponent) => void
  onMove: (direction: 'up' | 'down') => void
  onDelete: () => void
}

const ComponentCard = ({
  component,
  index,
  componentsCount,
  onChange,
  onMove,
  onDelete,
}: ComponentCardProps) => (
  <Card
    title={
      <div
        className={`${typeColors[component.type].className} rounded-md py-1 px-2 w-fit`}
      >
        <div className="flex items-center">
          {typeColors[component.type].icon}
          <span className="ml-2 text-sm">{typeColors[component.type].label}</span>
        </div>
      </div>
    }
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
    <ComponentEditor component={component} onChange={onChange} />
  </Card>
)

export default ComponentCard
