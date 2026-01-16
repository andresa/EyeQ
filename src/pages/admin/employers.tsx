import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  message,
} from 'antd'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import AdminLayout from '../../layouts/AdminLayout'
import { createEmployer, listCompanies, listEmployers } from '../../services/admin'
import type { Company, Employer } from '../../types'
import PhoneInput from '../../components/atoms/PhoneInput'

const AdminEmployersPage = () => {
  const [form] = Form.useForm()
  const [open, setOpen] = useState(false)
  const [companyId, setCompanyId] = useState<string>('')

  const { data: companies } = useQuery({
    queryKey: ['admin', 'companies'],
    queryFn: async () => {
      const response = await listCompanies()
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to load companies')
      }
      return response.data
    },
  })

  const { data: employers, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'employers', companyId],
    queryFn: async () => {
      if (!companyId) return [] as Employer[]
      const response = await listEmployers(companyId)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to load employers')
      }
      return response.data
    },
  })

  const openCreate = () => {
    form.resetFields()
    setOpen(true)
  }

  const closeModal = () => {
    setOpen(false)
    form.resetFields()
  }

  const onSubmit = async () => {
    const values = await form.validateFields()
    const response = await createEmployer(values)
    if (!response.success) {
      message.error(response.error || 'Unable to create employer')
      return
    }
    message.success('Employer created')
    closeModal()
    refetch()
  }

  return (
    <AdminLayout>
      <Space orientation="vertical" size="large" className="w-full">
        <Card>
          <Space orientation="vertical" className="w-full">
            <Select
              placeholder="Select company"
              value={companyId || undefined}
              onChange={(value) => setCompanyId(value)}
              options={(companies || []).map((company: Company) => ({
                label: company.name,
                value: company.id,
              }))}
              aria-label="Select company"
            />
            <Button type="primary" onClick={openCreate} disabled={!companyId}>
              Add employer
            </Button>
          </Space>
        </Card>
        <Table
          loading={isLoading}
          dataSource={employers || []}
          rowKey="id"
          columns={[
            {
              title: 'Name',
              render: (_, record) => `${record.firstName} ${record.lastName}`,
            },
            { title: 'Email', dataIndex: 'email' },
            { title: 'Phone', dataIndex: 'phone' },
            { title: 'Active', dataIndex: 'isActive', render: (value) => (value ? 'Yes' : 'No') },
          ]}
        />
      </Space>
      <Modal
        title="Add employer"
        open={open}
        onOk={onSubmit}
        onCancel={closeModal}
        okText="Create employer"
      >
        <Form form={form} layout="vertical" initialValues={{ companyId }}>
          <Form.Item
            name="companyId"
            label="Company"
            rules={[{ required: true, message: 'Select a company.' }]}
          >
            <Select
              options={(companies || []).map((company: Company) => ({
                label: company.name,
                value: company.id,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="firstName"
            label="First name"
            rules={[{ required: true, message: 'Enter first name.' }]}
          >
            <Input aria-label="First name" />
          </Form.Item>
          <Form.Item
            name="lastName"
            label="Last name"
            rules={[{ required: true, message: 'Enter last name.' }]}
          >
            <Input aria-label="Last name" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Enter email.' },
              { type: 'email', message: 'Enter a valid email.' },
            ]}
          >
            <Input aria-label="Email" />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <PhoneInput />
          </Form.Item>
        </Form>
      </Modal>
    </AdminLayout>
  )
}

export default AdminEmployersPage
