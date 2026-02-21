import { Button, Checkbox, Input, Radio, Typography } from 'antd'
import { createUUID } from '../../utils/uuid'
import type { TestComponentOption } from '../../types'

interface OptionEditorProps {
  options: TestComponentOption[]
  correctAnswer?: string | string[]
  type: 'single_choice' | 'multiple_choice'
  onChange: (options: TestComponentOption[]) => void
  onCorrectAnswerChange: (value: string | string[] | undefined) => void
}

const OptionEditor = ({
  options,
  correctAnswer,
  type,
  onChange,
  onCorrectAnswerChange,
}: OptionEditorProps) => {
  const updateOption = (id: string, label: string) => {
    onChange(options.map((option) => (option.id === id ? { ...option, label } : option)))
  }

  const removeOption = (id: string) => {
    onChange(options.filter((option) => option.id !== id))
  }

  const addOption = () => {
    onChange([...options, { id: createUUID(), label: '' }])
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <Typography.Text type="secondary">Options</Typography.Text>
      <Typography.Text type="secondary">Select the correct answer(s)</Typography.Text>
      {type === 'single_choice' ? (
        <Radio.Group
          value={typeof correctAnswer === 'string' ? correctAnswer : undefined}
          onChange={(event) => onCorrectAnswerChange(event.target.value)}
        >
          <div className="flex flex-col gap-4 w-full">
            {options.map((option) => (
              <div key={option.id} className="flex gap-4 w-full">
                <Input
                  value={option.label}
                  onChange={(event) => updateOption(option.id, event.target.value)}
                  placeholder="Option label"
                  aria-label="Option label"
                />
                <Radio value={option.id} aria-label="Correct answer" />
                <Button onClick={() => removeOption(option.id)}>Remove</Button>
              </div>
            ))}
          </div>
        </Radio.Group>
      ) : (
        <Checkbox.Group
          value={Array.isArray(correctAnswer) ? correctAnswer : []}
          onChange={(values) => onCorrectAnswerChange(values as string[])}
        >
          <div className="flex flex-col gap-4 w-full">
            {options.map((option) => (
              <div key={option.id} className="flex gap-4 w-full">
                <Input
                  value={option.label}
                  onChange={(event) => updateOption(option.id, event.target.value)}
                  placeholder="Option label"
                  aria-label="Option label"
                />
                <Checkbox value={option.id} aria-label="Correct answer" />
                <Button onClick={() => removeOption(option.id)}>Remove</Button>
              </div>
            ))}
          </div>
        </Checkbox.Group>
      )}
      <Button
        onClick={() => onCorrectAnswerChange(type === 'multiple_choice' ? [] : undefined)}
        type="link"
      >
        Clear correct answer
      </Button>
      <Button type="dashed" onClick={addOption} block>
        Add option
      </Button>
    </div>
  )
}

export default OptionEditor
