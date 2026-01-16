import { Button, Input, Space, Typography } from 'antd'
import type { TestSection } from '../../types'

interface SectionListProps {
  sections: TestSection[]
  selectedId?: string
  onSelect: (id: string) => void
  onAdd: () => void
  onRename: (id: string, title: string) => void
  onMove: (id: string, direction: 'up' | 'down') => void
  onDelete: (id: string) => void
}

const SectionList = ({
  sections,
  selectedId,
  onSelect,
  onAdd,
  onRename,
  onMove,
  onDelete,
}: SectionListProps) => (
  <Space orientation="vertical" className="w-full">
    <Button type="dashed" onClick={onAdd} block>
      Add section
    </Button>
    <Space orientation="vertical" className="w-full">
      {sections.map((section, index) => (
        <div
          key={section.id}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(section.id)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onSelect(section.id)
            }
          }}
          className={`cursor-pointer rounded-lg border border-slate-200 p-3 ${
            section.id === selectedId ? 'bg-[#f0f5ff]' : 'bg-white'
          }`}
        >
          <Space orientation="vertical" className="w-full">
            <Typography.Text strong>{`Section ${index + 1}`}</Typography.Text>
            <Input
              value={section.title}
              onChange={(event) => onRename(section.id, event.target.value)}
              onClick={(event) => event.stopPropagation()}
              onFocus={() => onSelect(section.id)}
              aria-label="Section title"
            />
            <Space>
              <Button
                onClick={(event) => {
                  event.stopPropagation()
                  onMove(section.id, 'up')
                }}
              >
                Up
              </Button>
              <Button
                onClick={(event) => {
                  event.stopPropagation()
                  onMove(section.id, 'down')
                }}
              >
                Down
              </Button>
              <Button
                danger
                onClick={(event) => {
                  event.stopPropagation()
                  onDelete(section.id)
                }}
              >
                Delete
              </Button>
            </Space>
          </Space>
        </div>
      ))}
    </Space>
  </Space>
)

export default SectionList
