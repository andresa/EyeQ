import { Checkbox, Input, Select, Switch } from 'antd'
import { useQuery } from '@tanstack/react-query'
import type { TestComponent } from '../../types'
import { listQuestionCategories } from '../../services/manager'
import OptionEditor from './OptionEditor'

interface ComponentEditorProps {
  component: TestComponent
  companyId?: string
  onChange: (component: TestComponent) => void
}

const ComponentEditor = ({ component, companyId, onChange }: ComponentEditorProps) => {
  const update = (updates: Partial<TestComponent>) => {
    onChange({ ...component, ...updates })
  }

  const { data: categories = [] } = useQuery({
    queryKey: ['questionCategories', companyId],
    queryFn: async () => {
      if (!companyId) return []
      const res = await listQuestionCategories(companyId)
      if (!res.success || !res.data) return []
      return res.data
    },
    enabled: !!companyId,
  })

  return (
    <div className="flex flex-col gap-4 w-full">
      <Input
        value={component.title}
        onChange={(event) => update({ title: event.target.value })}
        placeholder="Question title"
        aria-label="Question title"
      />
      <Input.TextArea
        value={component.description}
        onChange={(event) => update({ description: event.target.value })}
        placeholder="Description"
        rows={3}
        aria-label="Question description"
      />
      <Select
        value={component.categoryId ?? undefined}
        onChange={(v) => update({ categoryId: v || null })}
        options={[
          { value: '', label: 'Uncategorised' },
          ...categories.map((c) => ({ value: c.id, label: c.name })),
        ]}
        allowClear
        placeholder="Select category"
        className="w-full"
      />
      {component.type === 'single_choice' || component.type === 'multiple_choice' ? (
        <OptionEditor
          options={component.options || []}
          type={component.type}
          correctAnswer={component.correctAnswer}
          onChange={(options) => {
            if (component.type === 'single_choice') {
              const selected =
                typeof component.correctAnswer === 'string'
                  ? component.correctAnswer
                  : undefined
              const valid = options.some((option) => option.id === selected)
              update({
                options,
                correctAnswer: valid ? selected : undefined,
              })
              return
            }
            const selected = Array.isArray(component.correctAnswer)
              ? component.correctAnswer
              : []
            const validSelections = selected.filter((optionId) =>
              options.some((option) => option.id === optionId),
            )
            update({
              options,
              correctAnswer: validSelections,
            })
          }}
          onCorrectAnswerChange={(value) => update({ correctAnswer: value })}
        />
      ) : null}
      <div className="flex justify-between">
        <Checkbox
          checked={component.saveToLibrary}
          onChange={(event) => update({ saveToLibrary: event.target.checked })}
        >
          Save to library
        </Checkbox>
        {component.type !== 'info' && (
          <Switch
            checked={component.required}
            onChange={(checked) => update({ required: checked })}
            checkedChildren="Required"
            unCheckedChildren="Optional"
          />
        )}
      </div>
    </div>
  )
}

export default ComponentEditor
