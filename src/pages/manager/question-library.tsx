import { useState } from 'react'
import {
  App,
  Button,
  Checkbox,
  Dropdown,
  Input,
  Modal,
  Select,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { MenuProps } from 'antd'
import { EllipsisOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import ManagerLayout from '../../layouts/ManagerLayout'
import PageHeading from '../../components/atoms/PageHeading'
import {
  deleteQuestionLibraryItem,
  createQuestionLibraryItems,
  listQuestionCategories,
  listQuestionLibrary,
  updateQuestionLibraryItem,
} from '../../services/manager'
import type { ComponentType, QuestionLibraryItem, TestComponentOption } from '../../types'
import { useSession } from '../../hooks/useSession'
import { formatDateTime } from '../../utils/date'
import { createUUID } from '../../utils/uuid'
import { LibraryBig, Trash2 } from 'lucide-react'
import { questionTypeLabels } from '../../utils/questions'
import { QuestionTypeTag } from '../../components/organisms/QuestionTypeTag'

/** Draft for creating a new question (no server fields). */
type QuestionDraft = Pick<
  QuestionLibraryItem,
  | 'type'
  | 'title'
  | 'description'
  | 'required'
  | 'options'
  | 'correctAnswer'
  | 'categoryId'
>

const defaultDraft = (): QuestionDraft => ({
  type: 'single_choice',
  title: '',
  description: '',
  required: true,
  options: [
    { id: createUUID(), label: 'Option 1' },
    { id: createUUID(), label: 'Option 2' },
  ],
  correctAnswer: undefined,
  categoryId: null,
})

const QuestionLibraryPage = () => {
  const { message, modal } = App.useApp()
  const { userProfile } = useSession()
  const companyId = userProfile?.companyId
  const managerId = userProfile?.userType === 'manager' ? userProfile.id : undefined
  const queryClient = useQueryClient()

  const [nameFilter, setNameFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [editing, setEditing] = useState<QuestionLibraryItem | QuestionDraft | null>(null)
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

  const { data: categories = [] } = useQuery({
    queryKey: ['questionCategories', companyId],
    queryFn: async () => {
      if (!companyId) return []
      const res = await listQuestionCategories(companyId)
      if (!res.success || !res.data) throw new Error(res.error || 'Failed to load')
      return res.data
    },
  })

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]))

  const filtered = (items || []).filter((item) => {
    if (nameFilter && !item.title.toLowerCase().includes(nameFilter.toLowerCase()))
      return false
    if (typeFilter && item.type !== typeFilter) return false
    if (categoryFilter) {
      if (categoryFilter === 'uncategorised') {
        if (item.categoryId) return false
      } else if (item.categoryId !== categoryFilter) {
        return false
      }
    }
    return true
  })

  const handleDelete = (record: QuestionLibraryItem) => {
    modal.confirm({
      title: 'Delete question',
      content: `Are you sure you want to delete "${record.title}"?`,
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        const res = await deleteQuestionLibraryItem(record.id)
        if (!res.success) {
          message.error(res.error || 'Failed to delete')
          return
        }
        message.success('Question deleted')
        queryClient.invalidateQueries({ queryKey: ['questionLibrary'] })
      },
    })
  }

  const getMenuItems = (record: QuestionLibraryItem): MenuProps['items'] => [
    {
      key: 'edit',
      label: 'Edit',
      onClick: (e) => {
        e.domEvent.stopPropagation()
        setEditing({ ...record })
      },
    },
    {
      key: 'delete',
      danger: true,
      label: 'Delete',
      onClick: (e) => {
        e.domEvent.stopPropagation()
        handleDelete(record)
      },
    },
  ]

  const handleSaveEdit = async () => {
    if (!editing) return
    const trimmedTitle = editing.title?.trim() ?? ''
    if (!trimmedTitle) {
      message.error('Title is required')
      return
    }
    setSaving(true)
    const isCreate = !('id' in editing) || !editing.id
    if (isCreate) {
      if (!companyId || !managerId) {
        message.error('Cannot create question: missing company or manager context')
        setSaving(false)
        return
      }
      const res = await createQuestionLibraryItems({
        companyId,
        managerId,
        items: [
          {
            type: editing.type,
            title: trimmedTitle,
            description: editing.description,
            required: editing.required,
            options: editing.options,
            correctAnswer: editing.correctAnswer,
            categoryId: editing.categoryId,
          },
        ],
      })
      setSaving(false)
      if (!res.success) {
        message.error(res.error || 'Failed to create question')
        return
      }
      message.success('Question created')
    } else {
      const res = await updateQuestionLibraryItem(editing.id, {
        type: editing.type,
        title: trimmedTitle,
        description: editing.description,
        required: editing.required,
        options: editing.options,
        correctAnswer: editing.correctAnswer,
        categoryId: editing.categoryId,
      })
      setSaving(false)
      if (!res.success) {
        message.error(res.error || 'Failed to save')
        return
      }
      message.success('Question updated')
    }
    setEditing(null)
    queryClient.invalidateQueries({ queryKey: ['questionLibrary'] })
  }

  const updateEditing = (updates: Partial<QuestionLibraryItem | QuestionDraft>) => {
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
    <ManagerLayout
      pageHeading={
        <PageHeading>
          <div className="flex items-center gap-2">
            <LibraryBig />
            <Typography.Title level={4}>Question Library</Typography.Title>
          </div>
        </PageHeading>
      }
    >
      <div className="flex flex-col gap-6 w-full">
        <div className="flex items-center justify-between">
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
              options={[{ value: '', label: 'All types' }, ...questionTypeLabels]}
              className="w-40"
            />
            <Select
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { value: '', label: 'All categories' },
                { value: 'uncategorised', label: 'Uncategorised' },
                ...categories.map((c) => ({ value: c.id, label: c.name })),
              ]}
              className="w-48"
            />
          </div>
          <Button
            type="primary"
            onClick={() => setEditing(defaultDraft())}
            disabled={!companyId || !managerId}
          >
            Create Question
          </Button>
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
              width: 200,
              render: (type: ComponentType) => (
                <QuestionTypeTag type={type} size="small" />
              ),
            },
            {
              title: 'Category',
              dataIndex: 'categoryId',
              width: 180,
              render: (categoryId: string | null | undefined) =>
                categoryId && categoryMap[categoryId] ? (
                  <Tag>{categoryMap[categoryId]}</Tag>
                ) : (
                  <Tag color="default">Uncategorised</Tag>
                ),
            },
            {
              title: 'Created',
              dataIndex: 'createdAt',
              width: 180,
              render: (v: string) => formatDateTime(v),
            },
            {
              title: 'Actions',
              width: 100,
              render: (_: unknown, record: QuestionLibraryItem) => (
                <div className="flex items-center justify-center">
                  <Dropdown menu={{ items: getMenuItems(record) }} trigger={['click']}>
                    <Button
                      type="text"
                      icon={<EllipsisOutlined />}
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Question actions"
                    />
                  </Dropdown>
                </div>
              ),
            },
          ]}
        />
      </div>

      <Modal
        title={
          editing && 'id' in editing && editing.id ? 'Edit Question' : 'Create Question'
        }
        open={!!editing}
        onCancel={() => setEditing(null)}
        onOk={handleSaveEdit}
        confirmLoading={saving}
        okText="Save"
        width={600}
      >
        {editing && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Typography.Text strong>Title</Typography.Text>
              <Input
                value={editing.title}
                onChange={(e) => updateEditing({ title: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Typography.Text strong>Type</Typography.Text>
              <Select
                value={editing.type}
                onChange={handleTypeChange}
                options={questionTypeLabels}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Typography.Text strong>Category</Typography.Text>
              <Select
                value={editing.categoryId ?? undefined}
                onChange={(v) => updateEditing({ categoryId: v || null })}
                options={[
                  { value: '', label: 'Uncategorised' },
                  ...categories.map((c) => ({ value: c.id, label: c.name })),
                ]}
                allowClear
                placeholder="Select category"
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-1">
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
                      type="text"
                      icon={<Trash2 size={20} />}
                      className="text-red-500"
                      onClick={() => removeOption(idx)}
                      disabled={(editing.options?.length ?? 0) <= 1}
                    />
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
