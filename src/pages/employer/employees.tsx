import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Modal,
  Space,
  Table,
  message,
} from 'antd'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import EmployerLayout from '../../layouts/EmployerLayout'
import CompanyEmployerSelector from '../../components/molecules/CompanyEmployerSelector'
import { createEmployees, listEmployees } from '../../services/employer'
import type { Employee } from '../../types'
import { useSession } from '../../hooks/useSession'
import PhoneInput from '../../components/atoms/PhoneInput'

const EmployerEmployeesPage = () => {
  const { session } = useSession()
  const companyId = session?.companyId
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['employer', 'employees', companyId],
    queryFn: async () => {
      if (!companyId) return [] as Employee[]
      const response = await listEmployees(companyId)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to load employees')
      }
      return response.data
    },
  })

  const onSubmit = async () => {
    const values = await form.validateFields()
    if (!companyId) {
      message.error('Select a company first.')
      return
    }
    const response = await createEmployees({
      companyId,
      employees: [
        {
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phone: values.phone,
          dob: values.dob?.format('YYYY-MM-DD'),
        },
      ],
    })
    if (!response.success) {
      message.error(response.error || 'Unable to create employee')
      return
    }
    message.success('Employee created')
    setOpen(false)
    form.resetFields()
    refetch()
  }

  return (
    <EmployerLayout>
      <Space orientation="vertical" size="large" className="w-full">
        <Card>
          <Space orientation="vertical" className="w-full">
            <CompanyEmployerSelector />
            <Button type="primary" onClick={() => setOpen(true)} disabled={!companyId}>
              Add employee
            </Button>
          </Space>
        </Card>
        <Table
          loading={isLoading}
          dataSource={data || []}
          rowKey="id"
          columns={[
            {
              title: 'Name',
              render: (_, record) => `${record.firstName} ${record.lastName}`,
            },
            { title: 'Email', dataIndex: 'email' },
            { title: 'Phone', dataIndex: 'phone' },
            { title: 'DOB', dataIndex: 'dob' },
            { title: 'Active', dataIndex: 'isActive', render: (value) => (value ? 'Yes' : 'No') },
          ]}
        />
      </Space>
      <Modal
        title="Add employee"
        open={open}
        onOk={onSubmit}
        onCancel={() => setOpen(false)}
        okText="Create employee"
      >
        <Form form={form} layout="vertical">
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
          <Form.Item name="dob" label="Date of birth">
            <DatePicker className="w-full" />
          </Form.Item>
        </Form>
      </Modal>
    </EmployerLayout>
  )
}

export default EmployerEmployeesPage
