import { useMemo, useState } from 'react'
import { Button, Input, Modal, Select, Table, Tag } from 'antd'
import { useQuery } from '@tanstack/react-query'
import type { QuestionLibraryItem, TestComponent } from '../../types'
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
})

const QuestionLibraryModal = ({
  open,
  companyId,
  onAdd,
  onClose,
}: QuestionLibraryModalProps) => {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [nameFilter, setNameFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['questionLibrary', companyId],
    queryFn: async () => {
      const res = await listQuestionLibrary(companyId)
      if (!res.success || !res.data) throw new Error(res.error || 'Failed to load')
      return res.data
    },
    enabled: open && !!companyId,
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
      setNameFilter('')
      setTypeFilter('')
      setCategoryFilter('')
    }
  }

  const filtered = useMemo(() => {
    let result = items
    if (nameFilter) {
      const lower = nameFilter.toLowerCase()
      result = result.filter((i) => i.title.toLowerCase().includes(lower))
    }
    if (typeFilter) {
      result = result.filter((i) => i.type === typeFilter)
    }
    if (categoryFilter) {
      if (categoryFilter === 'uncategorised') {
        result = result.filter((i) => !i.categoryId)
      } else {
        result = result.filter((i) => i.categoryId === categoryFilter)
      }
    }
    return result
  }, [items, nameFilter, typeFilter, categoryFilter])

  const handleAdd = () => {
    const selected = items.filter((i) => selectedKeys.includes(i.id))
    onAdd(selected.map(toComponent))
    onClose()
  }

  return (
    <Modal
      title="Copy from library"
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
        <Select
          value={typeFilter}
          onChange={setTypeFilter}
          options={typeOptions}
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
          className="w-44"
        />
      </div>
      <Table
        loading={isLoading}
        dataSource={filtered}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 8 }}
        rowSelection={{
          selectedRowKeys: selectedKeys,
          onChange: (keys) => setSelectedKeys(keys as string[]),
        }}
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
