import { useAutoAnimate } from '@formkit/auto-animate/react'
import { Button, Card, Input, Tooltip, Typography } from 'antd'
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
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
}: SectionListProps) => {
  const [animateRef] = useAutoAnimate({ duration: 250 })

  return (
    <Card className="h-full">
      <div className="flex flex-col gap-4 w-full">
        <Typography.Text strong>Sections</Typography.Text>
        <Button type="dashed" onClick={onAdd} block>
          Add section
        </Button>
        <div ref={animateRef} className="flex flex-col gap-4 w-full">
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
                section.id === selectedId ? 'bg-accent-50' : 'bg-white'
              }`}
            >
              <div className="flex flex-col gap-4 w-full">
                <Input
                  value={section.title}
                  onChange={(event) => onRename(section.id, event.target.value)}
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                  onFocus={() => onSelect(section.id)}
                  aria-label="Section title"
                />
                <div className="flex gap-2">
                  <Button
                    size="small"
                    type="text"
                    icon={<ChevronUp size={18} />}
                    disabled={index === 0}
                    onClick={(event) => {
                      event.stopPropagation()
                      onMove(section.id, 'up')
                    }}
                    aria-label="Move section up"
                  />
                  <Button
                    size="small"
                    type="text"
                    icon={<ChevronDown size={18} />}
                    disabled={index === sections.length - 1}
                    onClick={(event) => {
                      event.stopPropagation()
                      onMove(section.id, 'down')
                    }}
                    aria-label="Move section down"
                  />
                  <Tooltip title="Delete section">
                    <Button
                      size="small"
                      type="text"
                      danger
                      icon={<Trash2 size={18} />}
                      onClick={(event) => {
                        event.stopPropagation()
                        onDelete(section.id)
                      }}
                      aria-label="Delete section"
                    />
                  </Tooltip>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

export default SectionList
