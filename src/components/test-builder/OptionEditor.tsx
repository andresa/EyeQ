import { Button, Input, Select, Tooltip, Typography } from 'antd'
import { createUUID } from '../../utils/uuid'
import { Info, X } from 'lucide-react'
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

  const selectOptions = options.map((o) => ({
    value: o.id,
    label: o.label || '(empty)',
  }))

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-col gap-2">
        <Typography.Text strong>Options</Typography.Text>
        {options.map((option) => (
          <div key={option.id} className="flex gap-2 items-center">
            <Input
              value={option.label}
              onChange={(event) => updateOption(option.id, event.target.value)}
              placeholder="Option label"
              aria-label="Option label"
              className="flex-1"
            />
            <Button
              size="small"
              type="text"
              icon={<X size={20} />}
              className="text-red-500"
              onClick={() => removeOption(option.id)}
              disabled={options.length <= 1}
            />
          </div>
        ))}
        <Button size="small" onClick={addOption}>
          Add option
        </Button>
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <Typography.Text strong>
            Correct answer{type === 'multiple_choice' ? 's' : ''}
          </Typography.Text>
          <Tooltip
            title={`Select the correct answer${type === 'multiple_choice' ? 's' : ''} to enable automatic marking. Correct answers are not shown to employees.`}
          >
            <Info size={16} className="text-gray-400" />
          </Tooltip>
        </div>
        {type === 'single_choice' ? (
          <Select
            value={typeof correctAnswer === 'string' ? correctAnswer : undefined}
            onChange={(v) => onCorrectAnswerChange(v)}
            options={selectOptions}
            allowClear
            placeholder="Select correct answer"
            className="w-full"
          />
        ) : (
          <Select
            mode="multiple"
            value={Array.isArray(correctAnswer) ? correctAnswer : []}
            onChange={(v) => onCorrectAnswerChange(v)}
            options={selectOptions}
            placeholder="Select correct answers"
            className="w-full"
          />
        )}
      </div>
    </div>
  )
}

export default OptionEditor
