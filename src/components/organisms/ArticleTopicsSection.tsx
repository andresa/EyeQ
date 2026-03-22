import { useState } from 'react'
import { App, Button, Card, Input, Typography } from 'antd'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createArticleTopic,
  deleteArticleTopic,
  listArticleTopics,
  updateArticleTopic,
} from '../../services/manager'
import type { ArticleTopic } from '../../types'

interface ArticleTopicsSectionProps {
  companyId: string
}

const ArticleTopicsSection = ({ companyId }: ArticleTopicsSectionProps) => {
  const { message, modal } = App.useApp()
  const queryClient = useQueryClient()
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const { data: topics = [], isLoading } = useQuery({
    queryKey: ['articleTopics', companyId],
    queryFn: async () => {
      const res = await listArticleTopics(companyId)
      if (!res.success || !res.data) throw new Error(res.error || 'Failed to load')
      return res.data
    },
    enabled: !!companyId,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['articleTopics'] })

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    const res = await createArticleTopic({ companyId, name: newName.trim() })
    setCreating(false)
    if (!res.success) {
      message.error(res.error || 'Failed to create topic')
      return
    }

    message.success('Topic created')
    setNewName('')
    invalidate()
  }

  const handleStartEdit = (topic: ArticleTopic) => {
    setEditingId(topic.id)
    setEditingName(topic.name)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editingName.trim()) return
    setSavingEdit(true)
    const res = await updateArticleTopic(editingId, { name: editingName.trim() })
    setSavingEdit(false)
    if (!res.success) {
      message.error(res.error || 'Failed to update topic')
      return
    }

    message.success('Topic updated')
    setEditingId(null)
    setEditingName('')
    invalidate()
  }

  const handleDelete = (topic: ArticleTopic) => {
    modal.confirm({
      title: 'Delete topic',
      content: `Are you sure you want to delete "${topic.name}"? Articles using it will simply stop showing the topic.`,
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        const res = await deleteArticleTopic(topic.id)
        if (!res.success) {
          message.error(res.error || 'Failed to delete topic')
          return
        }

        message.success('Topic deleted')
        invalidate()
      },
    })
  }

  return (
    <Card title="Article topics" className="w-full max-w-2xl">
      <Typography.Paragraph type="secondary" className="mb-4">
        Organize learning articles with topics so employees can find related resources
        faster.
      </Typography.Paragraph>

      <div className="flex flex-col gap-4">
        {isLoading ? (
          <Typography.Text type="secondary">Loading...</Typography.Text>
        ) : topics.length === 0 ? (
          <Typography.Text type="secondary">
            No topics yet. Create one below.
          </Typography.Text>
        ) : (
          <div className="flex flex-col gap-2">
            {topics.map((topic) => (
              <div
                key={topic.id}
                className="flex items-center gap-2 rounded border border-gray-200 p-2"
              >
                {editingId === topic.id ? (
                  <>
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onPressEnter={handleSaveEdit}
                      className="flex-1"
                      aria-label="Edit topic name"
                    />
                    <Button
                      size="small"
                      type="text"
                      icon={<Check size={16} />}
                      onClick={handleSaveEdit}
                      loading={savingEdit}
                      aria-label="Save"
                    />
                    <Button
                      size="small"
                      type="text"
                      icon={<X size={16} />}
                      onClick={handleCancelEdit}
                      aria-label="Cancel"
                    />
                  </>
                ) : (
                  <>
                    <Typography.Text className="flex-1">{topic.name}</Typography.Text>
                    <Button
                      size="small"
                      type="text"
                      icon={<Pencil size={16} />}
                      onClick={() => handleStartEdit(topic)}
                      aria-label="Edit"
                    />
                    <Button
                      size="small"
                      type="text"
                      danger
                      icon={<Trash2 size={16} />}
                      onClick={() => handleDelete(topic)}
                      aria-label="Delete"
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex w-full gap-2">
          <Input
            placeholder="New topic name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onPressEnter={handleCreate}
            className="min-w-0 flex-1"
            aria-label="New topic name"
          />
          <Button
            type="primary"
            onClick={handleCreate}
            loading={creating}
            className="flex-shrink-0"
          >
            Add topic
          </Button>
        </div>
      </div>
    </Card>
  )
}

export default ArticleTopicsSection
