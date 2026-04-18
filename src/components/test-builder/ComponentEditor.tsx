import { Checkbox, Switch, Tooltip } from 'antd'
import Selection from '../atoms/Selection'
import RichTextEditor from '../atoms/RichTextEditor'
import { useQuery } from '@tanstack/react-query'
import type { TestComponent } from '../../types'
import { listQuestionCategories } from '../../services/manager'
import OptionEditor from './OptionEditor'
import ImageUpload from './ImageUpload'
import { Info } from 'lucide-react'

interface ComponentEditorProps {
  component: TestComponent
  companyId?: string
  onChange: (component: TestComponent) => void
}

const ComponentEditor = ({ component, companyId, onChange }: ComponentEditorProps) => {
  const update = (updates: Partial<TestComponent>) => {
    onChange({ ...component, ...updates })
  }

  const hasCorrectAnswer = (value: TestComponent['correctAnswer']) =>
    typeof value === 'string' ? Boolean(value) : Array.isArray(value) && value.length > 0

  const canAddToFlashCards =
    (component.type === 'single_choice' || component.type === 'multiple_choice') &&
    hasCorrectAnswer(component.correctAnswer)

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
      <RichTextEditor
        key={component.id + '-title'}
        value={component.title ?? ''}
        onChange={(md) => update({ title: md })}
        placeholder="Question title"
        singleLine
        ariaLabel="Question title"
      />
      <RichTextEditor
        key={component.id + '-desc'}
        value={component.description ?? ''}
        onChange={(md) => update({ description: md })}
        placeholder="Description"
        ariaLabel="Question description"
      />
      <ImageUpload
        imageId={component.imageId}
        companyId={companyId}
        onChange={(imageId) => update({ imageId })}
      />
      <Selection
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
          companyId={companyId}
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
                addToFlashCards: valid ? component.addToFlashCards : false,
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
              addToFlashCards:
                validSelections.length > 0 ? component.addToFlashCards : false,
            })
          }}
          onCorrectAnswerChange={(value) =>
            update({
              correctAnswer: value,
              addToFlashCards: hasCorrectAnswer(value)
                ? component.addToFlashCards
                : false,
            })
          }
        />
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center">
            <Checkbox
              checked={component.saveToLibrary}
              onChange={(event) => update({ saveToLibrary: event.target.checked })}
            >
              Save to library
            </Checkbox>
            <Tooltip title="Save this question to the Question Library so it can be reused in other tests">
              <Info size={16} className="text-gray-400" />
            </Tooltip>
          </div>
          <div className="flex items-center">
            <Checkbox
              checked={component.addToFlashCards}
              onChange={(event) => update({ addToFlashCards: event.target.checked })}
              disabled={!canAddToFlashCards}
            >
              Add to Flash Cards
            </Checkbox>
            <Tooltip title="Create a flash card from this question. Requires a choice question with a correct answer selected.">
              <Info size={16} className="text-gray-400" />
            </Tooltip>
          </div>
        </div>
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
