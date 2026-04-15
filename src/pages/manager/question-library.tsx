import { useState } from 'react'
import {
  App,
  Button,
  Checkbox,
  Dropdown,
  Input,
  Modal,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import Selection from '../../components/atoms/Selection'
import RichTextEditor from '../../components/atoms/RichTextEditor'
import type { MenuProps } from 'antd'
import { EllipsisOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import ManagerLayout from '../../layouts/ManagerLayout'
import StandardPageHeading from '../../components/molecules/StandardPageHeading'
import {
  createFlashCards,
  deleteQuestionLibraryItem,
  createQuestionLibraryItems,
  listQuestionCategories,
  listQuestionLibrary,
  updateQuestionLibraryItem,
} from '../../services/manager'
import type {
  ComponentType,
  FlashCardType,
  QuestionLibraryItem,
  TestComponentOption,
} from '../../types'
import { useSession } from '../../hooks/useSession'
import { usePaginatedQuery } from '../../hooks/usePaginatedQuery'
import { formatDateTime } from '../../utils/date'
import { createUUID } from '../../utils/uuid'
import { Info, LibraryBig, Trash2 } from 'lucide-react'
import { questionTypeLabels } from '../../utils/questions'
import { QuestionTypeTag } from '../../components/organisms/QuestionTypeTag'
import ImageUpload from '../../components/test-builder/ImageUpload'

/** Draft for creating a new question (no server fields). */
interface QuestionEditorState extends Pick<
  QuestionLibraryItem,
  | 'type'
  | 'title'
  | 'description'
  | 'required'
  | 'options'
  | 'correctAnswer'
  | 'categoryId'
  | 'imageId'
> {
  id?: string
  addToFlashCards?: boolean
}

const defaultDraft = (): QuestionEditorState => ({
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
  imageId: null,
  addToFlashCards: false,
})

const hasCorrectAnswer = (value: QuestionEditorState['correctAnswer']) =>
  typeof value === 'string' ? Boolean(value) : Array.isArray(value) && value.length > 0

const canAddToFlashCards = (editing: QuestionEditorState | null) =>
  !!editing &&
  (editing.type === 'single_choice' || editing.type === 'multiple_choice') &&
  hasCorrectAnswer(editing.correctAnswer)

const QuestionLibraryPage = () => {
  const { message, modal } = App.useApp()
  const { userProfile } = useSession()
  const companyId = userProfile?.companyId
  const managerId = userProfile?.userType === 'manager' ? userProfile.id : undefined
  const queryClient = useQueryClient()

  const [nameFilter, setNameFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [editing, setEditing] = useState<QuestionEditorState | null>(null)
  const [pendingQuestions, setPendingQuestions] = useState<QuestionEditorState[]>([])
  const [saving, setSaving] = useState(false)

  const questionLibraryFilters = {
    name: nameFilter.trim() || undefined,
    type: typeFilter || undefined,
    categoryId: categoryFilter || undefined,
  }

  const {
    data: items,
    isLoading,
    pagination,
  } = usePaginatedQuery({
    queryKey: ['questionLibrary', companyId],
    enabled: !!companyId,
    filters: questionLibraryFilters,
    fetchPage: async ({ limit, cursor }) => {
      if (!companyId) {
        return { success: true, data: [], nextCursor: null, total: 0 }
      }

      const res = await listQuestionLibrary({
        companyId,
        ...questionLibraryFilters,
        limit,
        cursor,
      })
      if (!res.success || !res.data) throw new Error(res.error || 'Failed to load')
      return res
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
        setEditing({
          id: record.id,
          type: record.type,
          title: record.title,
          description: record.description,
          required: record.required,
          options: record.options,
          correctAnswer: record.correctAnswer,
          categoryId: record.categoryId,
          imageId: record.imageId,
          addToFlashCards: false,
        })
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

  const stripMarkdown = (md: string) =>
    md
      .replace(/\*+/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .trim()

  const validateEditing = (): boolean => {
    if (!editing) return false
    if (!stripMarkdown(editing.title?.trim() ?? '')) {
      message.error('Title is required')
      return false
    }
    if (!editing.id && (!companyId || !managerId)) {
      message.error('Cannot create question: missing company or manager context')
      return false
    }
    return true
  }

  const handleSaveAndAddAnother = () => {
    if (!validateEditing() || !editing) return
    setPendingQuestions((prev) => [...prev, editing])
    setEditing(defaultDraft())
  }

  const createFlashCardsForItems = async (items: QuestionEditorState[]) => {
    const eligible = items.filter((q) => q.addToFlashCards && canAddToFlashCards(q))
    if (eligible.length === 0) return

    const flashCardResponse = await createFlashCards({
      companyId: companyId!,
      items: eligible.map((q) => ({
        type: q.type as FlashCardType,
        title: q.title.trim(),
        options: q.options ?? [],
        correctAnswer: q.correctAnswer!,
        imageId: q.imageId,
        categoryId: q.categoryId,
      })),
    })

    if (!flashCardResponse.success) {
      message.warning(
        flashCardResponse.error || 'Questions saved, but flash cards were not created',
      )
    }
  }

  const handleSaveEdit = async () => {
    if (!validateEditing() || !editing) return

    const trimmedTitle = editing.title?.trim() ?? ''
    setSaving(true)

    if (editing.id) {
      const res = await updateQuestionLibraryItem(editing.id, {
        type: editing.type,
        title: trimmedTitle,
        description: editing.description,
        required: editing.required,
        options: editing.options,
        correctAnswer: editing.correctAnswer,
        categoryId: editing.categoryId,
        imageId: editing.imageId,
      })
      setSaving(false)
      if (!res.success) {
        message.error(res.error || 'Failed to save')
        return
      }
      message.success('Question updated')
      await createFlashCardsForItems([editing])
    } else {
      const allItems = [...pendingQuestions, editing]
      const res = await createQuestionLibraryItems({
        companyId: companyId!,
        managerId: managerId!,
        items: allItems.map((q) => ({
          type: q.type,
          title: q.title.trim(),
          description: q.description,
          required: q.required,
          options: q.options,
          correctAnswer: q.correctAnswer,
          categoryId: q.categoryId,
          imageId: q.imageId,
        })),
      })
      setSaving(false)
      if (!res.success) {
        message.error(res.error || 'Failed to create questions')
        return
      }
      const count = allItems.length
      message.success(`${count} question${count > 1 ? 's' : ''} created`)
      await createFlashCardsForItems(allItems)
      setPendingQuestions([])
    }

    setEditing(null)
    queryClient.invalidateQueries({ queryKey: ['questionLibrary'] })
    queryClient.invalidateQueries({
      queryKey: ['manager-learning-resources-flash-cards'],
    })
  }

  const handleCancel = () => {
    if (pendingQuestions.length > 0) {
      modal.confirm({
        title: 'Discard queued questions?',
        content: `You have ${pendingQuestions.length} unsaved question(s) that will be lost.`,
        okText: 'Discard',
        okButtonProps: { danger: true },
        onOk: () => {
          setPendingQuestions([])
          setEditing(null)
        },
      })
    } else {
      setEditing(null)
    }
  }

  const updateEditing = (updates: Partial<QuestionEditorState>) => {
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
      updateEditing({
        options: updated,
        correctAnswer: undefined,
        addToFlashCards: false,
      })
    } else if (Array.isArray(correctAnswer)) {
      const nextAnswers = correctAnswer.filter((id) => id !== removed.id)
      updateEditing({
        options: updated,
        correctAnswer: nextAnswers,
        addToFlashCards: nextAnswers.length > 0 ? editing.addToFlashCards : false,
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
      addToFlashCards: false,
    })
  }

  const isChoiceType =
    editing?.type === 'single_choice' || editing?.type === 'multiple_choice'

  return (
    <ManagerLayout
      pageHeading={<StandardPageHeading title="Question Library" icon={<LibraryBig />} />}
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
            <Selection
              value={typeFilter}
              onChange={setTypeFilter}
              options={[{ value: '', label: 'All types' }, ...questionTypeLabels]}
              className="w-40"
            />
            <Selection
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
            onClick={() => {
              setPendingQuestions([])
              setEditing(defaultDraft())
            }}
            disabled={!companyId || !managerId}
          >
            Create Question
          </Button>
        </div>
        <Table
          loading={isLoading}
          dataSource={items}
          rowKey="id"
          pagination={pagination}
          onRow={(record) => ({
            onClick: () =>
              setEditing({
                id: record.id,
                type: record.type,
                title: record.title,
                description: record.description,
                required: record.required,
                options: record.options,
                correctAnswer: record.correctAnswer,
                categoryId: record.categoryId,
                imageId: record.imageId,
                addToFlashCards: false,
              }),
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
              title: 'Created on',
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
        destroyOnHidden
        title={editing?.id ? 'Edit Question' : 'Create Question'}
        open={!!editing}
        onCancel={handleCancel}
        onOk={handleSaveEdit}
        confirmLoading={saving}
        okText="Save"
        width={600}
        footer={
          editing && !editing.id ? (
            <div className="flex items-center justify-between">
              <Typography.Text type="secondary" className="text-sm">
                {pendingQuestions.length > 0
                  ? `${pendingQuestions.length} question(s) queued`
                  : ''}
              </Typography.Text>
              <div className="flex gap-2">
                <Button onClick={handleCancel}>Cancel</Button>
                <Button onClick={handleSaveAndAddAnother}>Save & Add Another</Button>
                <Button type="primary" onClick={handleSaveEdit} loading={saving}>
                  {pendingQuestions.length > 0
                    ? `Save All (${pendingQuestions.length + 1})`
                    : 'Save'}
                </Button>
              </div>
            </div>
          ) : undefined
        }
      >
        {editing && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Typography.Text strong>Title</Typography.Text>
              <RichTextEditor
                key={`${editing.id ?? `new-${pendingQuestions.length}`}-title`}
                value={editing.title}
                onChange={(title) => updateEditing({ title })}
                placeholder="Question title"
                singleLine
                ariaLabel="Question title"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Typography.Text strong>Type</Typography.Text>
              <Selection
                value={editing.type}
                onChange={handleTypeChange}
                options={questionTypeLabels}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Typography.Text strong>Category</Typography.Text>
              <Selection
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
              <RichTextEditor
                key={`${editing.id ?? `new-${pendingQuestions.length}`}-desc`}
                value={editing.description ?? ''}
                onChange={(description) => updateEditing({ description })}
                placeholder="Description"
                ariaLabel="Question description"
              />
            </div>
            <ImageUpload
              imageId={editing.imageId}
              companyId={companyId}
              onChange={(imageId) => updateEditing({ imageId })}
            />
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
                  <Selection
                    value={
                      typeof editing.correctAnswer === 'string'
                        ? editing.correctAnswer
                        : undefined
                    }
                    onChange={(v) =>
                      updateEditing({
                        correctAnswer: v,
                        addToFlashCards: v ? editing.addToFlashCards : false,
                      })
                    }
                    options={(editing.options || []).map((o) => ({
                      value: o.id,
                      label: o.label || '(empty)',
                    }))}
                    allowClear
                    placeholder="Select correct answer"
                    className="w-full"
                  />
                ) : (
                  <Selection
                    mode="multiple"
                    value={
                      Array.isArray(editing.correctAnswer) ? editing.correctAnswer : []
                    }
                    onChange={(v) =>
                      updateEditing({
                        correctAnswer: v,
                        addToFlashCards: v.length > 0 ? editing.addToFlashCards : false,
                      })
                    }
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
            <div className="flex items-center">
              <Checkbox
                checked={editing.addToFlashCards}
                onChange={(e) => updateEditing({ addToFlashCards: e.target.checked })}
                disabled={!canAddToFlashCards(editing)}
              >
                Add to Flash Cards
              </Checkbox>
              <Tooltip title="Create a flash card from this question. Requires a choice question with a correct answer selected.">
                <Info size={16} className="text-gray-400" />
              </Tooltip>
            </div>
          </div>
        )}
      </Modal>
    </ManagerLayout>
  )
}

export default QuestionLibraryPage
