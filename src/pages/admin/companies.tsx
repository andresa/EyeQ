import { App, Button, Dropdown, Form, Input, Modal, Switch, Table } from 'antd'
import type { MenuProps } from 'antd'
import { EllipsisOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import AdminLayout from '../../layouts/AdminLayout'
import {
  createCompany,
  deleteCompany,
  listCompanies,
  updateCompany,
} from '../../services/admin'
import type { Company } from '../../types'

const AdminCompaniesPage = () => {
  const { message, modal } = App.useApp()
  const [form] = Form.useForm()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Company | null>(null)
  const [loading, setLoading] = useState(false)

  const { data, refetch } = useQuery({
    queryKey: ['admin', 'companies'],
    queryFn: async () => {
      setLoading(true)
      const response = await listCompanies()
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to load companies')
      }
      setLoading(false)
      return response.data
    },
  })

  const closeModal = () => {
    setOpen(false)
    setEditing(null)
    form.resetFields()
  }

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ isActive: true })
    setOpen(true)
  }

  const openEdit = (company: Company) => {
    setEditing(company)
    form.setFieldsValue({
      name: company.name,
      address: company.address,
      isActive: company.isActive,
    })
    setOpen(true)
  }

  const handleDelete = (company: Company) => {
    modal.confirm({
      title: 'Delete company',
      content: `Are you sure you want to delete "${company.name}"? This action cannot be undone.`,
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        const response = await deleteCompany(company.id)
        if (!response.success) {
          message.error(response.error || 'Failed to delete company')
          return
        }
        message.success('Company deleted')
        refetch()
      },
    })
  }

  const getMenuItems = (record: Company): MenuProps['items'] => [
    {
      key: 'edit',
      label: 'Edit',
      onClick: (e) => {
        e.domEvent.stopPropagation()
        openEdit(record)
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

  const onSubmit = async () => {
    const values = await form.validateFields()
    const response = editing
      ? await updateCompany(editing.id, values)
      : await createCompany(values)
    if (!response.success) {
      message.error(response.error || 'Unable to save company')
      return
    }
    message.success('Company saved')
    closeModal()
    refetch()
  }

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 w-full">
        <div className="flex items-center justify-end">
          <Button type="primary" onClick={openCreate}>
            Add company
          </Button>
        </div>
        <Table
          loading={loading}
          dataSource={data || []}
          rowKey="id"
          onRow={(record) => ({
            onClick: () => openEdit(record),
            style: { cursor: 'pointer' },
          })}
          columns={[
            { title: 'Name', dataIndex: 'name' },
            { title: 'Address', dataIndex: 'address' },
            {
              title: 'Active',
              dataIndex: 'isActive',
              render: (value: boolean) => (value ? 'Yes' : 'No'),
            },
            {
              title: 'Actions',
              width: 100,
              render: (_, record) => (
                <div className="flex items-center justify-center">
                  <Dropdown menu={{ items: getMenuItems(record) }} trigger={['click']}>
                    <Button
                      type="text"
                      icon={<EllipsisOutlined />}
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Company actions"
                    />
                  </Dropdown>
                </div>
              ),
            },
          ]}
        />
      </div>
      <Modal
        title={editing ? 'Edit company' : 'Add company'}
        open={open}
        onOk={onSubmit}
        onCancel={closeModal}
        okText={editing ? 'Save changes' : 'Create company'}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Company name"
            rules={[{ required: true, message: 'Enter a company name.' }]}
          >
            <Input placeholder="Acme Corp" aria-label="Company name" />
          </Form.Item>
          <Form.Item name="address" label="Address">
            <Input placeholder="123 Business Rd" aria-label="Company address" />
          </Form.Item>
          <Form.Item name="isActive" valuePropName="checked">
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" defaultValue />
          </Form.Item>
        </Form>
      </Modal>
    </AdminLayout>
  )
}

export default AdminCompaniesPage
