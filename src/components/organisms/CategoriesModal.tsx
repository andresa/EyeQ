import { useState } from 'react'
import { Button, Input, Modal, Typography, message } from 'antd'
import { Pencil, Trash2, Check, X } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createQuestionCategory,
  deleteQuestionCategory,
  listQuestionCategories,
  updateQuestionCategory,
} from '../../services/manager'
import type { QuestionCategory } from '../../types'

interface CategoriesModalProps {
  open: boolean
  companyId: string
  onClose: () => void
}

const CategoriesModal = ({ open, companyId, onClose }: CategoriesModalProps) => {
  const queryClient = useQueryClient()
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['questionCategories', companyId],
    queryFn: async () => {
      const res = await listQuestionCategories(companyId)
      if (!res.success || !res.data) throw new Error(res.error || 'Failed to load')
      return res.data
    },
    enabled: open && !!companyId,
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['questionCategories'] })

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    const res = await createQuestionCategory({ companyId, name: newName.trim() })
    setCreating(false)
    if (!res.success) {
      message.error(res.error || 'Failed to create category')
      return
    }
    message.success('Category created')
    setNewName('')
    invalidate()
  }

  const handleStartEdit = (cat: QuestionCategory) => {
    setEditingId(cat.id)
    setEditingName(cat.name)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editingName.trim()) return
    setSavingEdit(true)
    const res = await updateQuestionCategory(editingId, { name: editingName.trim() })
    setSavingEdit(false)
    if (!res.success) {
      message.error(res.error || 'Failed to update category')
      return
    }
    message.success('Category updated')
    setEditingId(null)
    setEditingName('')
    invalidate()
  }

  const handleDelete = (cat: QuestionCategory) => {
    Modal.confirm({
      title: 'Delete category',
      content: `Are you sure you want to delete "${cat.name}"? Questions in this category will become uncategorised.`,
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        const res = await deleteQuestionCategory(cat.id)
        if (!res.success) {
          message.error(res.error || 'Failed to delete category')
          return
        }
        message.success('Category deleted')
        invalidate()
      },
    })
  }

  return (
    <Modal
      title="Manage Categories"
      open={open}
      onCancel={onClose}
      footer={null}
      width={480}
    >
      <div className="flex flex-col gap-4">
        {isLoading ? (
          <Typography.Text type="secondary">Loading...</Typography.Text>
        ) : categories.length === 0 ? (
          <Typography.Text type="secondary">
            No categories yet. Create one below.
          </Typography.Text>
        ) : (
          <div className="flex flex-col gap-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center gap-2 p-2 rounded border border-gray-200"
              >
                {editingId === cat.id ? (
                  <>
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onPressEnter={handleSaveEdit}
                      className="flex-1"
                      // eslint-disable-next-line jsx-a11y/no-autofocus
                      autoFocus
                    />
                    <Button
                      size="small"
                      type="text"
                      icon={<Check size={16} />}
                      onClick={handleSaveEdit}
                      loading={savingEdit}
                    />
                    <Button
                      size="small"
                      type="text"
                      icon={<X size={16} />}
                      onClick={handleCancelEdit}
                    />
                  </>
                ) : (
                  <>
                    <Typography.Text className="flex-1">{cat.name}</Typography.Text>
                    <Button
                      size="small"
                      type="text"
                      icon={<Pencil size={16} />}
                      onClick={() => handleStartEdit(cat)}
                    />
                    <Button
                      size="small"
                      type="text"
                      danger
                      icon={<Trash2 size={16} />}
                      onClick={() => handleDelete(cat)}
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            placeholder="New category name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onPressEnter={handleCreate}
            className="flex-1"
          />
          <Button type="primary" onClick={handleCreate} loading={creating}>
            Add
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default CategoriesModal
