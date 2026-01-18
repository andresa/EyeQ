import {
  Button,
  DatePicker,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import { EditOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import EmployerLayout from '../../layouts/EmployerLayout'
import { createEmployees, updateEmployee, listEmployees } from '../../services/employer'
import type { Employee, UserRole } from '../../types'
import { useSession } from '../../hooks/useSession'
import PhoneInput from '../../components/atoms/PhoneInput'

const roleOptions: { label: string; value: UserRole }[] = [
  { label: 'Admin', value: 'admin' },
  { label: 'Employer', value: 'employer' },
  { label: 'Employee', value: 'employee' },
]

const roleColors: Record<UserRole, string> = {
  admin: 'red',
  employer: 'blue',
  employee: 'green',
}

const EmployerEmployeesPage = () => {
  const { userProfile } = useSession()
  const companyId = userProfile?.companyId
  const [open, setOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
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
    enabled: !!companyId,
  })

  const openCreate = () => {
    setEditingEmployee(null)
    form.resetFields()
    setOpen(true)
  }

  const openEdit = (employee: Employee) => {
    setEditingEmployee(employee)
    form.setFieldsValue({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone,
      dob: employee.dob ? dayjs(employee.dob) : undefined,
      role: employee.role || 'employee',
      isActive: employee.isActive,
    })
    setOpen(true)
  }

  const closeModal = () => {
    setOpen(false)
    setEditingEmployee(null)
    form.resetFields()
  }

  const onSubmit = async () => {
    const values = await form.validateFields()
    if (!companyId) {
      message.error('Company not found.')
      return
    }

    if (editingEmployee) {
      // Update existing employee (role is not editable by employers)
      const response = await updateEmployee(editingEmployee.id, companyId, {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        dob: values.dob?.format('YYYY-MM-DD'),
        isActive: values.isActive,
      })
      if (!response.success) {
        message.error(response.error || 'Unable to update employee')
        return
      }
      message.success('Employee updated')
    } else {
      // Create new employee
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
    }

    closeModal()
    refetch()
  }

  return (
    <EmployerLayout>
      <Space direction="vertical" size="large" className="w-full">
        <div className="flex items-center justify-between">
          <Typography.Title level={3} className="m-0">
            Employees
          </Typography.Title>
          <Button type="primary" onClick={openCreate}>
            Add employee
          </Button>
        </div>
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
            {
              title: 'Role',
              dataIndex: 'role',
              render: (role: UserRole) => (
                <Tag color={roleColors[role] || 'green'}>{role || 'employee'}</Tag>
              ),
            },
            {
              title: 'Active',
              dataIndex: 'isActive',
              render: (value) => (value ? 'Yes' : 'No'),
            },
            {
              title: 'Actions',
              render: (_, record) => (
                <Button
                  type="link"
                  icon={<EditOutlined />}
                  onClick={() => openEdit(record)}
                >
                  Edit
                </Button>
              ),
            },
          ]}
        />
      </Space>
      <Modal
        title={editingEmployee ? 'Edit employee' : 'Add employee'}
        open={open}
        onOk={onSubmit}
        onCancel={closeModal}
        okText={editingEmployee ? 'Save changes' : 'Create employee'}
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
          {editingEmployee && (
            <>
              <Form.Item name="role" label="Role">
                <Select options={roleOptions} aria-label="Role" disabled />
              </Form.Item>
              <Form.Item name="isActive" label="Active" valuePropName="checked">
                <Switch />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </EmployerLayout>
  )
}

export default EmployerEmployeesPage
