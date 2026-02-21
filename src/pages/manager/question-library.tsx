import { useState } from 'react'
import {
  Button,
  Checkbox,
  Input,
  Modal,
  Popconfirm,
  Select,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import ManagerLayout from '../../layouts/ManagerLayout'
import {
  deleteQuestionLibraryItem,
  listQuestionLibrary,
  updateQuestionLibraryItem,
} from '../../services/manager'
import type { ComponentType, QuestionLibraryItem, TestComponentOption } from '../../types'
import { useSession } from '../../hooks/useSession'
import { formatDateTime } from '../../utils/date'
import { createUUID } from '../../utils/uuid'

const typeOptions = [
  { value: '', label: 'All types' },
  { value: 'single_choice', label: 'Single choice' },
  { value: 'multiple_choice', label: 'Multiple choice' },
  { value: 'text', label: 'Text response' },
  { value: 'info', label: 'Info block' },
]

const typeColors: Record<string, string> = {
  single_choice: 'blue',
  multiple_choice: 'purple',
  text: 'green',
  info: 'default',
}

const QuestionLibraryPage = () => {
  const { userProfile } = useSession()
  const companyId = userProfile?.companyId
  const queryClient = useQueryClient()

  const [nameFilter, setNameFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [editing, setEditing] = useState<QuestionLibraryItem | null>(null)
  const [saving, setSaving] = useState(false)

  const { data: items, isLoading } = useQuery({
    queryKey: ['questionLibrary', companyId],
    queryFn: async () => {
      if (!companyId) return []
      const res = await listQuestionLibrary(companyId)
      if (!res.success || !res.data) throw new Error(res.error || 'Failed to load')
      return res.data
    },
  })

  const filtered = (items || []).filter((item) => {
    if (nameFilter && !item.title.toLowerCase().includes(nameFilter.toLowerCase()))
      return false
    if (typeFilter && item.type !== typeFilter) return false
    return true
  })

  const handleDelete = async (id: string) => {
    const res = await deleteQuestionLibraryItem(id)
    if (!res.success) {
      message.error(res.error || 'Failed to delete')
      return
    }
    message.success('Question deleted')
    queryClient.invalidateQueries({ queryKey: ['questionLibrary'] })
  }

  const handleSaveEdit = async () => {
    if (!editing) return
    setSaving(true)
    const res = await updateQuestionLibraryItem(editing.id, {
      type: editing.type,
      title: editing.title,
      description: editing.description,
      required: editing.required,
      options: editing.options,
      correctAnswer: editing.correctAnswer,
    })
    setSaving(false)
    if (!res.success) {
      message.error(res.error || 'Failed to save')
      return
    }
    message.success('Question updated')
    setEditing(null)
    queryClient.invalidateQueries({ queryKey: ['questionLibrary'] })
  }

  const updateEditing = (updates: Partial<QuestionLibraryItem>) => {
    if (!editing) return
    setEditing({ ...editing, ...updates })
  }

  const updateOption = (index: number, label: string) => {
    if (!editing?.options) return
    const updated = [...editing.options]
    updated[index] = { ...updated[index], label }
    updateEditing({ options: updated })
  }

  const removeOption = (index: number) => {
    if (!editing?.options) return
    const removed = editing.options[index]
    const updated = editing.options.filter((_, i) => i !== index)
    const correctAnswer = editing.correctAnswer
    if (typeof correctAnswer === 'string' && correctAnswer === removed.id) {
      updateEditing({ options: updated, correctAnswer: undefined })
    } else if (Array.isArray(correctAnswer)) {
      updateEditing({
        options: updated,
        correctAnswer: correctAnswer.filter((id) => id !== removed.id),
      })
    } else {
      updateEditing({ options: updated })
    }
  }

  const addOption = () => {
    if (!editing) return
    const options = [...(editing.options || []), { id: createUUID(), label: '' }]
    updateEditing({ options })
  }

  const handleTypeChange = (type: ComponentType) => {
    if (!editing) return
    const isChoice = type === 'single_choice' || type === 'multiple_choice'
    const wasChoice =
      editing.type === 'single_choice' || editing.type === 'multiple_choice'
    updateEditing({
      type,
      options:
        isChoice && !wasChoice
          ? [
              { id: createUUID(), label: 'Option 1' },
              { id: createUUID(), label: 'Option 2' },
            ]
          : isChoice
            ? editing.options
            : undefined,
      correctAnswer: isChoice ? undefined : undefined,
    })
  }

  const isChoiceType =
    editing?.type === 'single_choice' || editing?.type === 'multiple_choice'

  return (
    <ManagerLayout>
      <div className="flex flex-col gap-6 w-full">
        <Typography.Title level={3}>Question Library</Typography.Title>
        <div className="flex gap-4">
          <Input
            placeholder="Filter by name"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            allowClear
            className="max-w-xs"
          />
          <Select
            value={typeFilter}
            onChange={setTypeFilter}
            options={typeOptions}
            className="w-40"
          />
        </div>
        <Table
          loading={isLoading}
          dataSource={filtered}
          rowKey="id"
          onRow={(record) => ({
            onClick: () => setEditing({ ...record }),
            style: { cursor: 'pointer' },
          })}
          columns={[
            { title: 'Title', dataIndex: 'title', ellipsis: true },
            {
              title: 'Type',
              dataIndex: 'type',
              width: 140,
              render: (type: string) => (
                <Tag color={typeColors[type]}>{type.replace('_', ' ')}</Tag>
              ),
            },
            {
              title: 'Created',
              dataIndex: 'createdAt',
              width: 180,
              render: (v: string) => formatDateTime(v),
            },
            {
              title: '',
              width: 80,
              render: (_: unknown, record: QuestionLibraryItem) => (
                <Popconfirm
                  title="Delete this question?"
                  onConfirm={(e) => {
                    e?.stopPropagation()
                    handleDelete(record.id)
                  }}
                  onCancel={(e) => e?.stopPropagation()}
                >
                  <Button danger size="small" onClick={(e) => e.stopPropagation()}>
                    Delete
                  </Button>
                </Popconfirm>
              ),
            },
          ]}
        />
      </div>

      <Modal
        title="Edit Question"
        open={!!editing}
        onCancel={() => setEditing(null)}
        onOk={handleSaveEdit}
        confirmLoading={saving}
        okText="Save"
        width={600}
      >
        {editing && (
          <div className="flex flex-col gap-4">
            <div>
              <Typography.Text strong>Title</Typography.Text>
              <Input
                value={editing.title}
                onChange={(e) => updateEditing({ title: e.target.value })}
              />
            </div>
            <div>
              <Typography.Text strong>Type</Typography.Text>
              <Select
                value={editing.type}
                onChange={handleTypeChange}
                options={typeOptions.filter((o) => o.value !== '')}
                className="w-full"
              />
            </div>
            <div>
              <Typography.Text strong>Description</Typography.Text>
              <Input.TextArea
                value={editing.description}
                onChange={(e) => updateEditing({ description: e.target.value })}
                rows={3}
              />
            </div>
            {editing.type !== 'info' && (
              <Checkbox
                checked={editing.required}
                onChange={(e) => updateEditing({ required: e.target.checked })}
              >
                Required
              </Checkbox>
            )}
            {isChoiceType && (
              <div className="flex flex-col gap-2">
                <Typography.Text strong>Options</Typography.Text>
                {(editing.options || []).map((opt: TestComponentOption, idx: number) => (
                  <div key={opt.id} className="flex gap-2 items-center">
                    <Input
                      value={opt.label}
                      onChange={(e) => updateOption(idx, e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      size="small"
                      danger
                      onClick={() => removeOption(idx)}
                      disabled={(editing.options?.length ?? 0) <= 1}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button size="small" onClick={addOption}>
                  Add option
                </Button>
              </div>
            )}
            {isChoiceType && (
              <div>
                <Typography.Text strong>
                  Correct answer{editing.type === 'multiple_choice' ? 's' : ''}
                </Typography.Text>
                {editing.type === 'single_choice' ? (
                  <Select
                    value={
                      typeof editing.correctAnswer === 'string'
                        ? editing.correctAnswer
                        : undefined
                    }
                    onChange={(v) => updateEditing({ correctAnswer: v })}
                    options={(editing.options || []).map((o) => ({
                      value: o.id,
                      label: o.label || '(empty)',
                    }))}
                    allowClear
                    placeholder="Select correct answer"
                    className="w-full"
                  />
                ) : (
                  <Select
                    mode="multiple"
                    value={
                      Array.isArray(editing.correctAnswer) ? editing.correctAnswer : []
                    }
                    onChange={(v) => updateEditing({ correctAnswer: v })}
                    options={(editing.options || []).map((o) => ({
                      value: o.id,
                      label: o.label || '(empty)',
                    }))}
                    placeholder="Select correct answers"
                    className="w-full"
                  />
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </ManagerLayout>
  )
}

export default QuestionLibraryPage
