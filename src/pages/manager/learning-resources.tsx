import { useState } from 'react'
import { App, Button, Dropdown, Input, Modal, Table, Tabs, Tag, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { EllipsisOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Trash2 } from 'lucide-react'
import ManagerLayout from '../../layouts/ManagerLayout'
import StandardPageHeading from '../../components/molecules/StandardPageHeading'
import Selection from '../../components/atoms/Selection'
import RichTextEditor from '../../components/atoms/RichTextEditor'
import ImageUpload from '../../components/test-builder/ImageUpload'
import { usePaginatedQuery } from '../../hooks/usePaginatedQuery'
import {
  createArticle,
  createFlashCards,
  deleteArticle,
  deleteFlashCard,
  listArticleTopics,
  listArticles,
  listFlashCards,
  listQuestionCategories,
  updateArticle,
  updateFlashCard,
} from '../../services/manager'
import type { Article, FlashCard, FlashCardType, TestComponentOption } from '../../types'
import { useSession } from '../../hooks/useSession'
import { createUUID } from '../../utils/uuid'
import { formatDateTime } from '../../utils/date'

const stripMarkdown = (value: string) =>
  value
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*+/g, '')
    .trim()

const isMeaningfulRichText = (value?: string | null) =>
  typeof value === 'string' && stripMarkdown(value).length > 0

const createDefaultOptions = (): TestComponentOption[] => [
  { id: createUUID(), label: 'Option 1' },
  { id: createUUID(), label: 'Option 2' },
]

const defaultArticleDraft = (): ArticleEditorState => ({
  title: '',
  description: '',
  topicIds: [],
})

const defaultFlashCardDraft = (): FlashCardEditorState => ({
  type: 'single_choice',
  title: '',
  options: createDefaultOptions(),
  correctAnswer: undefined,
  imageId: null,
  categoryId: null,
})

interface ArticleEditorState {
  id?: string
  title: string
  description: string
  topicIds: string[]
}

interface FlashCardEditorState {
  id?: string
  type: FlashCardType
  title: string
  options: TestComponentOption[]
  correctAnswer?: string | string[]
  imageId?: string | null
  categoryId?: string | null
}

const resolveCorrectAnswerLabels = (flashCard: FlashCard) => {
  const selectedIds = Array.isArray(flashCard.correctAnswer)
    ? flashCard.correctAnswer
    : [flashCard.correctAnswer]

  return selectedIds
    .map(
      (answerId) =>
        flashCard.options.find((option) => option.id === answerId)?.label || answerId,
    )
    .filter(Boolean)
}

const ArticlesTabContent = ({ companyId }: { companyId: string }) => {
  const { message, modal } = App.useApp()
  const queryClient = useQueryClient()
  const [nameFilter, setNameFilter] = useState('')
  const [topicFilter, setTopicFilter] = useState('')
  const [editingArticle, setEditingArticle] = useState<ArticleEditorState | null>(null)
  const [saving, setSaving] = useState(false)

  const { data: topics = [] } = useQuery({
    queryKey: ['articleTopics', companyId],
    queryFn: async () => {
      const response = await listArticleTopics(companyId)
      if (!response.success || !response.data)
        throw new Error(response.error || 'Failed to load')
      return response.data
    },
    enabled: !!companyId,
  })

  const {
    data: articles,
    isLoading,
    pagination,
  } = usePaginatedQuery({
    queryKey: ['manager-learning-resources-articles', companyId],
    enabled: !!companyId,
    filters: {
      name: nameFilter.trim() || undefined,
      topicId: topicFilter || undefined,
    },
    fetchPage: async ({ limit, cursor }) => {
      const response = await listArticles({
        companyId,
        name: nameFilter.trim() || undefined,
        topicId: topicFilter || undefined,
        limit,
        cursor,
      })
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to load articles')
      }
      return response
    },
  })

  const topicMap = Object.fromEntries(topics.map((topic) => [topic.id, topic.name]))

  const invalidateArticles = () =>
    queryClient.invalidateQueries({ queryKey: ['manager-learning-resources-articles'] })

  const handleDelete = (article: Article) => {
    modal.confirm({
      title: 'Delete article',
      content: `Are you sure you want to delete "${stripMarkdown(article.title)}"?`,
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        const response = await deleteArticle(article.id)
        if (!response.success) {
          message.error(response.error || 'Failed to delete article')
          return
        }

        message.success('Article deleted')
        invalidateArticles()
      },
    })
  }

  const handleSave = async () => {
    if (!editingArticle) return
    if (!isMeaningfulRichText(editingArticle.title)) {
      message.error('Article title is required')
      return
    }
    if (!isMeaningfulRichText(editingArticle.description)) {
      message.error('Article description is required')
      return
    }

    setSaving(true)
    const payload = {
      companyId,
      title: editingArticle.title.trim(),
      description: editingArticle.description.trim(),
      topicIds: editingArticle.topicIds,
    }

    const response = editingArticle.id
      ? await updateArticle(editingArticle.id, payload)
      : await createArticle(payload)
    setSaving(false)

    if (!response.success) {
      message.error(response.error || 'Failed to save article')
      return
    }

    message.success(editingArticle.id ? 'Article updated' : 'Article created')
    setEditingArticle(null)
    invalidateArticles()
  }

  const getMenuItems = (article: Article): MenuProps['items'] => [
    {
      key: 'edit',
      label: 'Edit',
      onClick: (event) => {
        event.domEvent.stopPropagation()
        setEditingArticle({
          id: article.id,
          title: article.title,
          description: article.description,
          topicIds: article.topicIds ?? [],
        })
      },
    },
    {
      key: 'delete',
      label: 'Delete',
      danger: true,
      onClick: (event) => {
        event.domEvent.stopPropagation()
        handleDelete(article)
      },
    },
  ]

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Input
            placeholder="Filter by title"
            value={nameFilter}
            onChange={(event) => setNameFilter(event.target.value)}
            allowClear
            className="max-w-xs"
          />
          <Selection
            value={topicFilter}
            onChange={(value) => setTopicFilter(value)}
            options={[
              { value: '', label: 'All topics' },
              ...topics.map((topic) => ({ value: topic.id, label: topic.name })),
            ]}
            className="w-48"
          />
        </div>

        <Button type="primary" onClick={() => setEditingArticle(defaultArticleDraft())}>
          Create Article
        </Button>
      </div>

      <Table
        loading={isLoading}
        dataSource={articles}
        rowKey="id"
        pagination={pagination}
        onRow={(record) => ({
          onClick: () =>
            setEditingArticle({
              id: record.id,
              title: record.title,
              description: record.description,
              topicIds: record.topicIds ?? [],
            }),
          style: { cursor: 'pointer' },
        })}
        columns={[
          {
            title: 'Title',
            dataIndex: 'title',
            render: (title: string) => (
              <span title={stripMarkdown(title)}>
                {stripMarkdown(title) || 'Untitled article'}
              </span>
            ),
          },
          {
            title: 'Topics',
            dataIndex: 'topicIds',
            width: 260,
            render: (topicIds: string[] | undefined) =>
              topicIds?.length ? (
                <div className="flex flex-wrap gap-1">
                  {topicIds
                    .map((topicId) => topicMap[topicId])
                    .filter(Boolean)
                    .map((topicName) => (
                      <Tag key={topicName}>{topicName}</Tag>
                    ))}
                </div>
              ) : (
                <Tag color="default">No topics</Tag>
              ),
          },
          {
            title: 'Created on',
            dataIndex: 'createdAt',
            width: 180,
            render: (value: string) => formatDateTime(value),
          },
          {
            title: 'Actions',
            width: 100,
            render: (_: unknown, record: Article) => (
              <div className="flex items-center justify-center">
                <Dropdown menu={{ items: getMenuItems(record) }} trigger={['click']}>
                  <Button
                    type="text"
                    icon={<EllipsisOutlined />}
                    onClick={(event) => event.stopPropagation()}
                    aria-label="Article actions"
                  />
                </Dropdown>
              </div>
            ),
          },
        ]}
      />

      <Modal
        title={editingArticle?.id ? 'Edit Article' : 'Create Article'}
        open={!!editingArticle}
        onCancel={() => setEditingArticle(null)}
        onOk={() => void handleSave()}
        confirmLoading={saving}
        okText="Save"
        width={720}
      >
        {editingArticle && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Typography.Text strong>Title</Typography.Text>
              <RichTextEditor
                key={`${editingArticle.id ?? 'new'}-article-title`}
                value={editingArticle.title}
                onChange={(title) =>
                  setEditingArticle((prev) => (prev ? { ...prev, title } : prev))
                }
                placeholder="Article title"
                singleLine
                ariaLabel="Article title"
              />
            </div>

            <div className="flex flex-col gap-1">
              <Typography.Text strong>Description</Typography.Text>
              <RichTextEditor
                key={`${editingArticle.id ?? 'new'}-article-description`}
                value={editingArticle.description}
                onChange={(description) =>
                  setEditingArticle((prev) => (prev ? { ...prev, description } : prev))
                }
                placeholder="Article description"
                ariaLabel="Article description"
              />
            </div>

            <div className="flex flex-col gap-1">
              <Typography.Text strong>Topics</Typography.Text>
              <Selection
                mode="multiple"
                value={editingArticle.topicIds}
                onChange={(topicIds) =>
                  setEditingArticle((prev) =>
                    prev ? { ...prev, topicIds: topicIds as string[] } : prev,
                  )
                }
                options={topics.map((topic) => ({ value: topic.id, label: topic.name }))}
                placeholder="Select topics"
                className="w-full"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

const FlashCardsTabContent = ({ companyId }: { companyId: string }) => {
  const { message, modal } = App.useApp()
  const queryClient = useQueryClient()
  const [categoryFilter, setCategoryFilter] = useState('')
  const [editingFlashCard, setEditingFlashCard] = useState<FlashCardEditorState | null>(
    null,
  )
  const [saving, setSaving] = useState(false)

  const { data: categories = [] } = useQuery({
    queryKey: ['questionCategories', companyId],
    queryFn: async () => {
      const response = await listQuestionCategories(companyId)
      if (!response.success || !response.data)
        throw new Error(response.error || 'Failed to load')
      return response.data
    },
    enabled: !!companyId,
  })

  const {
    data: flashCards,
    isLoading,
    pagination,
  } = usePaginatedQuery({
    queryKey: ['manager-learning-resources-flash-cards', companyId],
    enabled: !!companyId,
    filters: { categoryId: categoryFilter || undefined },
    fetchPage: async ({ limit, cursor }) => {
      const response = await listFlashCards({
        companyId,
        categoryId: categoryFilter || undefined,
        limit,
        cursor,
      })
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to load flash cards')
      }
      return response
    },
  })

  const categoryMap = Object.fromEntries(
    categories.map((category) => [category.id, category.name]),
  )

  const invalidateFlashCards = () =>
    queryClient.invalidateQueries({
      queryKey: ['manager-learning-resources-flash-cards'],
    })

  const updateOption = (index: number, label: string) => {
    setEditingFlashCard((prev) => {
      if (!prev) return prev
      const options = [...prev.options]
      options[index] = { ...options[index], label }
      return { ...prev, options }
    })
  }

  const removeOption = (index: number) => {
    setEditingFlashCard((prev) => {
      if (!prev) return prev
      const removed = prev.options[index]
      const options = prev.options.filter((_, optionIndex) => optionIndex !== index)

      if (prev.type === 'single_choice') {
        return {
          ...prev,
          options,
          correctAnswer:
            prev.correctAnswer === removed.id ? undefined : prev.correctAnswer,
        }
      }

      return {
        ...prev,
        options,
        correctAnswer: Array.isArray(prev.correctAnswer)
          ? prev.correctAnswer.filter((answerId) => answerId !== removed.id)
          : [],
      }
    })
  }

  const addOption = () => {
    setEditingFlashCard((prev) =>
      prev
        ? { ...prev, options: [...prev.options, { id: createUUID(), label: '' }] }
        : prev,
    )
  }

  const handleTypeChange = (type: FlashCardType) => {
    setEditingFlashCard((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        type,
        correctAnswer: type === 'multiple_choice' ? [] : undefined,
      }
    })
  }

  const handleDelete = (flashCard: FlashCard) => {
    modal.confirm({
      title: 'Delete flash card',
      content: `Are you sure you want to delete "${stripMarkdown(flashCard.title)}"?`,
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        const response = await deleteFlashCard(flashCard.id)
        if (!response.success) {
          message.error(response.error || 'Failed to delete flash card')
          return
        }

        message.success('Flash card deleted')
        invalidateFlashCards()
      },
    })
  }

  const handleSave = async () => {
    if (!editingFlashCard) return
    if (!isMeaningfulRichText(editingFlashCard.title)) {
      message.error('Question title is required')
      return
    }

    const options = editingFlashCard.options
      .map((option) => ({ ...option, label: option.label.trim() }))
      .filter((option) => option.label)

    if (options.length < 2) {
      message.error('Flash cards need at least two non-empty options')
      return
    }

    if (
      editingFlashCard.type === 'single_choice' &&
      (typeof editingFlashCard.correctAnswer !== 'string' ||
        !editingFlashCard.correctAnswer)
    ) {
      message.error('Select a correct answer')
      return
    }

    if (
      editingFlashCard.type === 'multiple_choice' &&
      (!Array.isArray(editingFlashCard.correctAnswer) ||
        editingFlashCard.correctAnswer.length === 0)
    ) {
      message.error('Select at least one correct answer')
      return
    }

    const correctAnswer =
      editingFlashCard.type === 'single_choice'
        ? editingFlashCard.correctAnswer
        : editingFlashCard.correctAnswer

    if (!correctAnswer) {
      message.error('Select a correct answer')
      return
    }

    setSaving(true)
    const payload = {
      type: editingFlashCard.type,
      title: editingFlashCard.title.trim(),
      options,
      correctAnswer,
      imageId: editingFlashCard.imageId ?? null,
      categoryId: editingFlashCard.categoryId ?? null,
    }

    const response = editingFlashCard.id
      ? await updateFlashCard(editingFlashCard.id, payload)
      : await createFlashCards({ companyId, items: [payload] })
    setSaving(false)

    if (!response.success) {
      message.error(response.error || 'Failed to save flash card')
      return
    }

    message.success(editingFlashCard.id ? 'Flash card updated' : 'Flash card created')
    setEditingFlashCard(null)
    invalidateFlashCards()
  }

  const getMenuItems = (flashCard: FlashCard): MenuProps['items'] => [
    {
      key: 'edit',
      label: 'Edit',
      onClick: (event) => {
        event.domEvent.stopPropagation()
        setEditingFlashCard({
          id: flashCard.id,
          type: flashCard.type,
          title: flashCard.title,
          options: flashCard.options,
          correctAnswer: flashCard.correctAnswer,
          imageId: flashCard.imageId ?? null,
          categoryId: flashCard.categoryId ?? null,
        })
      },
    },
    {
      key: 'delete',
      label: 'Delete',
      danger: true,
      onClick: (event) => {
        event.domEvent.stopPropagation()
        handleDelete(flashCard)
      },
    },
  ]

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-wrap gap-4">
          <Selection
            value={categoryFilter}
            onChange={(value) => setCategoryFilter(value)}
            options={[
              { value: '', label: 'All categories' },
              { value: 'uncategorised', label: 'Uncategorised' },
              ...categories.map((category) => ({
                value: category.id,
                label: category.name,
              })),
            ]}
            className="w-52"
          />
        </div>

        <Button
          type="primary"
          onClick={() => setEditingFlashCard(defaultFlashCardDraft())}
        >
          Create Flash Card
        </Button>
      </div>

      <Table
        loading={isLoading}
        dataSource={flashCards}
        rowKey="id"
        pagination={pagination}
        onRow={(record) => ({
          onClick: () =>
            setEditingFlashCard({
              id: record.id,
              type: record.type,
              title: record.title,
              options: record.options,
              correctAnswer: record.correctAnswer,
              imageId: record.imageId ?? null,
              categoryId: record.categoryId ?? null,
            }),
          style: { cursor: 'pointer' },
        })}
        columns={[
          {
            title: 'Question title',
            dataIndex: 'title',
            render: (title: string) => (
              <span title={stripMarkdown(title)}>
                {stripMarkdown(title) || 'Untitled question'}
              </span>
            ),
          },
          {
            title: 'Correct answer(s)',
            width: 260,
            render: (_: unknown, flashCard: FlashCard) =>
              resolveCorrectAnswerLabels(flashCard).join(', '),
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
            render: (value: string) => formatDateTime(value),
          },
          {
            title: 'Actions',
            width: 100,
            render: (_: unknown, record: FlashCard) => (
              <div className="flex items-center justify-center">
                <Dropdown menu={{ items: getMenuItems(record) }} trigger={['click']}>
                  <Button
                    type="text"
                    icon={<EllipsisOutlined />}
                    onClick={(event) => event.stopPropagation()}
                    aria-label="Flash card actions"
                  />
                </Dropdown>
              </div>
            ),
          },
        ]}
      />

      <Modal
        title={editingFlashCard?.id ? 'Edit Flash Card' : 'Create Flash Card'}
        open={!!editingFlashCard}
        onCancel={() => setEditingFlashCard(null)}
        onOk={() => void handleSave()}
        confirmLoading={saving}
        okText="Save"
        width={720}
      >
        {editingFlashCard && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Typography.Text strong>Question title</Typography.Text>
              <RichTextEditor
                key={`${editingFlashCard.id ?? 'new'}-flash-card-title`}
                value={editingFlashCard.title}
                onChange={(title) =>
                  setEditingFlashCard((prev) => (prev ? { ...prev, title } : prev))
                }
                placeholder="Question title"
                singleLine
                ariaLabel="Flash card question title"
              />
            </div>

            <div className="flex flex-col gap-1">
              <Typography.Text strong>Type</Typography.Text>
              <Selection
                value={editingFlashCard.type}
                onChange={(value) => handleTypeChange(value as FlashCardType)}
                options={[
                  { value: 'single_choice', label: 'Single Choice' },
                  { value: 'multiple_choice', label: 'Multiple Choice' },
                ]}
                className="w-full"
              />
            </div>

            <ImageUpload
              imageId={editingFlashCard.imageId}
              companyId={companyId}
              onChange={(imageId) =>
                setEditingFlashCard((prev) => (prev ? { ...prev, imageId } : prev))
              }
            />

            <div className="flex flex-col gap-1">
              <Typography.Text strong>Category</Typography.Text>
              <Selection
                value={editingFlashCard.categoryId ?? undefined}
                onChange={(categoryId) =>
                  setEditingFlashCard((prev) =>
                    prev ? { ...prev, categoryId: categoryId || null } : prev,
                  )
                }
                options={[
                  { value: '', label: 'Uncategorised' },
                  ...categories.map((category) => ({
                    value: category.id,
                    label: category.name,
                  })),
                ]}
                allowClear
                placeholder="Select category"
                className="w-full"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Typography.Text strong>Options</Typography.Text>
              {editingFlashCard.options.map((option, index) => (
                <div key={option.id} className="flex items-center gap-2">
                  <Input
                    value={option.label}
                    onChange={(event) => updateOption(index, event.target.value)}
                    className="flex-1"
                  />
                  <Button
                    size="small"
                    type="text"
                    icon={<Trash2 size={18} />}
                    className="text-red-500"
                    onClick={() => removeOption(index)}
                    disabled={editingFlashCard.options.length <= 2}
                    aria-label="Remove option"
                  />
                </div>
              ))}
              <Button size="small" onClick={addOption}>
                Add option
              </Button>
            </div>

            <div className="flex flex-col gap-1">
              <Typography.Text strong>
                Correct answer{editingFlashCard.type === 'multiple_choice' ? 's' : ''}
              </Typography.Text>
              {editingFlashCard.type === 'single_choice' ? (
                <Selection
                  value={
                    typeof editingFlashCard.correctAnswer === 'string'
                      ? editingFlashCard.correctAnswer
                      : undefined
                  }
                  onChange={(correctAnswer) =>
                    setEditingFlashCard((prev) =>
                      prev ? { ...prev, correctAnswer } : prev,
                    )
                  }
                  options={editingFlashCard.options.map((option) => ({
                    value: option.id,
                    label: option.label || '(empty)',
                  }))}
                  allowClear
                  placeholder="Select correct answer"
                  className="w-full"
                />
              ) : (
                <Selection
                  mode="multiple"
                  value={
                    Array.isArray(editingFlashCard.correctAnswer)
                      ? editingFlashCard.correctAnswer
                      : []
                  }
                  onChange={(correctAnswer) =>
                    setEditingFlashCard((prev) =>
                      prev ? { ...prev, correctAnswer: correctAnswer as string[] } : prev,
                    )
                  }
                  options={editingFlashCard.options.map((option) => ({
                    value: option.id,
                    label: option.label || '(empty)',
                  }))}
                  placeholder="Select correct answers"
                  className="w-full"
                />
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

const ManagerLearningResourcesPage = () => {
  const { userProfile } = useSession()
  const companyId = userProfile?.companyId

  return (
    <ManagerLayout
      pageHeading={<StandardPageHeading title="Learning Resources" icon={<BookOpen />} />}
    >
      <div className="flex w-full flex-col gap-6">
        {companyId ? (
          <Tabs
            defaultActiveKey="articles"
            items={[
              {
                key: 'articles',
                label: 'Articles',
                children: <ArticlesTabContent companyId={companyId} />,
              },
              {
                key: 'flash-cards',
                label: 'Flash Cards',
                children: <FlashCardsTabContent companyId={companyId} />,
              },
            ]}
          />
        ) : (
          <Typography.Text type="secondary">
            You must be associated with a company to manage learning resources.
          </Typography.Text>
        )}
      </div>
    </ManagerLayout>
  )
}

export default ManagerLearningResourcesPage
