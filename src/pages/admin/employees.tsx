import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from 'antd'
import { DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import AdminLayout from '../../layouts/AdminLayout'
import {
  createEmployee,
  updateEmployee,
  listCompanies,
  listEmployees,
} from '../../services/admin'
import type { Company, Employee } from '../../types'
import PhoneInput from '../../components/atoms/PhoneInput'
import { deleteEmployee } from '../../services/employer'

// Only employee and employer roles are allowed (not admin)
const roleOptions = [
  { label: 'Employee', value: 'employee' },
  { label: 'Employer', value: 'employer' },
]

const roleColors: Record<string, string> = {
  employer: 'blue',
  employee: 'green',
}

const AdminEmployeesPage = () => {
  const [form] = Form.useForm()
  const [open, setOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
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

  const {
    data: employees,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'employees', companyId],
    queryFn: async () => {
      if (!companyId) return [] as Employee[]
      const response = await listEmployees(companyId)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to load employees')
      }
      return response.data
    },
  })

  const openCreate = () => {
    setEditingEmployee(null)
    form.resetFields()
    form.setFieldsValue({ companyId, role: 'employee', isActive: true })
    setOpen(true)
  }

  const openEdit = (employee: Employee) => {
    setEditingEmployee(employee)
    form.setFieldsValue({
      companyId: employee.companyId,
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

    if (editingEmployee) {
      // Update existing employee
      const response = await updateEmployee(
        editingEmployee.id,
        editingEmployee.companyId,
        {
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phone: values.phone,
          dob: values.dob?.format('YYYY-MM-DD'),
          role: values.role,
          isActive: values.isActive,
        },
      )
      if (!response.success) {
        message.error(response.error || 'Unable to update employee')
        return
      }
      message.success('Employee updated')
    } else {
      // Create new employee
      const response = await createEmployee({
        companyId: values.companyId,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        dob: values.dob?.format('YYYY-MM-DD'),
        role: values.role,
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

  const onDeleteEmployee = async (employee: Employee) => {
    if (!companyId) return

    setDeleteLoading(employee.id)
    try {
      const response = await deleteEmployee(employee.id, companyId)
      if (!response.success) {
        message.error(response.error || 'Failed to delete employee')
        return
      }
      message.success(`${employee.firstName} ${employee.lastName} has been deleted`)
      refetch()
    } catch {
      message.error('Failed to delete employee')
    } finally {
      setDeleteLoading(null)
    }
  }

  return (
    <AdminLayout>
      <Space direction="vertical" size="large" className="w-full">
        <Card>
          <Space direction="vertical" className="w-full">
            <Select
              placeholder="Select company"
              value={companyId || undefined}
              onChange={(value) => setCompanyId(value)}
              options={(companies || []).map((company: Company) => ({
                label: company.name,
                value: company.id,
              }))}
              aria-label="Select company"
              className="w-full"
            />
            <Button type="primary" onClick={openCreate} disabled={!companyId}>
              Add employee
            </Button>
          </Space>
        </Card>
        <Table
          loading={isLoading}
          dataSource={employees || []}
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
              render: (role: string) => (
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
                <Space>
                  <Button
                    type="link"
                    icon={<EditOutlined />}
                    onClick={() => openEdit(record)}
                  >
                    Edit
                  </Button>
                  <Popconfirm
                    title="Delete employee"
                    description={`Are you sure you want to delete ${record.firstName} ${record.lastName}? This action cannot be undone.`}
                    onConfirm={() => onDeleteEmployee(record)}
                    okText="Delete"
                    okType="danger"
                    cancelText="Cancel"
                  >
                    <Button
                      type="link"
                      danger
                      icon={<DeleteOutlined />}
                      loading={deleteLoading === record.id}
                    >
                      Delete
                    </Button>
                  </Popconfirm>
                </Space>
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
        <Form
          form={form}
          layout="vertical"
          initialValues={{ role: 'employee', isActive: true }}
        >
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
              disabled={!!editingEmployee}
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
          <Form.Item name="dob" label="Date of birth">
            <DatePicker className="w-full" />
          </Form.Item>
          <Form.Item
            name="role"
            label="Role"
            rules={[{ required: true, message: 'Select a role.' }]}
          >
            <Select options={roleOptions} aria-label="Role" />
          </Form.Item>
          <Form.Item name="isActive" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </AdminLayout>
  )
}

export default AdminEmployeesPage
