import { Checkbox, Input, Space, Typography } from 'antd'
import type { TestComponent } from '../../types'
import OptionEditor from './OptionEditor'

interface ComponentEditorProps {
  component: TestComponent
  onChange: (component: TestComponent) => void
}

const ComponentEditor = ({ component, onChange }: ComponentEditorProps) => {
  const update = (updates: Partial<TestComponent>) => {
    onChange({ ...component, ...updates })
  }

  return (
    <Space orientation="vertical" className="w-full">
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
      {component.type !== 'info' ? (
        <Checkbox
          checked={component.required}
          onChange={(event) => update({ required: event.target.checked })}
        >
          Required
        </Checkbox>
      ) : (
        <Typography.Text type="secondary">
          Info blocks are always optional.
        </Typography.Text>
      )}
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
          onCorrectAnswerChange={(value) =>
            update({ correctAnswer: value })
          }
        />
      ) : null}
    </Space>
  )
}

export default ComponentEditor
