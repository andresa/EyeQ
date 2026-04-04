import { useState } from 'react'
import { Button, Input, Modal, Table, Tag } from 'antd'
import Selection from '../atoms/Selection'
import { useQuery } from '@tanstack/react-query'
import type { QuestionLibraryItem, TestComponent } from '../../types'
import { usePaginatedQuery } from '../../hooks/usePaginatedQuery'
import { listQuestionCategories, listQuestionLibrary } from '../../services/manager'
import { createUUID } from '../../utils/uuid'

interface QuestionLibraryModalProps {
  open: boolean
  companyId: string
  onAdd: (components: TestComponent[]) => void
  onClose: () => void
}

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

const toComponent = (item: QuestionLibraryItem): TestComponent => ({
  id: createUUID(),
  type: item.type,
  title: item.title,
  description: item.description,
  required: item.required,
  options: item.options?.map((opt) => ({ id: createUUID(), label: opt.label })),
  correctAnswer: undefined,
  categoryId: item.categoryId,
  imageId: item.imageId,
})

const QuestionLibraryModal = ({
  open,
  companyId,
  onAdd,
  onClose,
}: QuestionLibraryModalProps) => {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [selectedItems, setSelectedItems] = useState<Record<string, QuestionLibraryItem>>(
    {},
  )
  const [nameFilter, setNameFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

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
    queryKey: ['questionLibrary', companyId, 'modal'],
    enabled: open && !!companyId,
    pageSize: 8,
    filters: questionLibraryFilters,
    fetchPage: async ({ limit, cursor }) => {
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
      const res = await listQuestionCategories(companyId)
      if (!res.success || !res.data) return []
      return res.data
    },
    enabled: open && !!companyId,
  })

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]))

  const handleAfterOpenChange = (visible: boolean) => {
    if (!visible) {
      setSelectedKeys([])
      setSelectedItems({})
      setNameFilter('')
      setTypeFilter('')
      setCategoryFilter('')
    }
  }

  const handleAdd = () => {
    const selected = selectedKeys
      .map((key) => selectedItems[key])
      .filter((item): item is QuestionLibraryItem => Boolean(item))
    onAdd(selected.map(toComponent))
    onClose()
  }

  const toggleSelection = (item: QuestionLibraryItem) => {
    setSelectedKeys((prev) =>
      prev.includes(item.id) ? prev.filter((key) => key !== item.id) : [...prev, item.id],
    )
    setSelectedItems((prev) => {
      if (prev[item.id]) {
        const next = { ...prev }
        delete next[item.id]
        return next
      }
      return { ...prev, [item.id]: item }
    })
  }

  return (
    <Modal
      title="Copy from Question Library"
      open={open}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      width={720}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="add"
          type="primary"
          disabled={selectedKeys.length === 0}
          onClick={handleAdd}
        >
          Add ({selectedKeys.length})
        </Button>,
      ]}
    >
      <div className="flex gap-4 mb-4">
        <Input
          placeholder="Filter by name"
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          allowClear
          className="flex-1"
        />
        <Selection
          value={typeFilter}
          onChange={setTypeFilter}
          options={typeOptions}
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
          className="w-44"
        />
      </div>
      <Table
        loading={isLoading}
        dataSource={items}
        rowKey="id"
        size="small"
        pagination={pagination}
        rowSelection={{
          selectedRowKeys: selectedKeys,
          preserveSelectedRowKeys: true,
          onChange: (keys, rows) => {
            setSelectedKeys(keys as string[])
            setSelectedItems((prev) => {
              const next = { ...prev }
              for (const row of rows as QuestionLibraryItem[]) {
                next[row.id] = row
              }
              for (const item of items) {
                if (!keys.includes(item.id)) {
                  delete next[item.id]
                }
              }
              return next
            })
          },
        }}
        onRow={(record) => ({
          onClick: () => {
            toggleSelection(record)
          },
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
            title: 'Category',
            dataIndex: 'categoryId',
            width: 140,
            render: (categoryId: string | null | undefined) =>
              categoryId && categoryMap[categoryId] ? (
                <Tag>{categoryMap[categoryId]}</Tag>
              ) : (
                <Tag color="default">Uncategorised</Tag>
              ),
          },
        ]}
      />
    </Modal>
  )
}

export default QuestionLibraryModal
