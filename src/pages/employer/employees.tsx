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
  Tooltip,
  Typography,
  message,
} from 'antd'
import {
  EditOutlined,
  MailOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import EmployerLayout from '../../layouts/EmployerLayout'
import {
  createEmployees,
  updateEmployee,
  listEmployees,
  sendInvitation,
} from '../../services/employer'
import type { Employee, InvitationStatus, UserRole } from '../../types'
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

const invitationStatusConfig: Record<
  InvitationStatus,
  { color: string; icon: React.ReactNode; label: string }
> = {
  none: { color: 'default', icon: <MinusCircleOutlined />, label: 'Not invited' },
  pending: { color: 'processing', icon: <ClockCircleOutlined />, label: 'Pending' },
  accepted: { color: 'success', icon: <CheckCircleOutlined />, label: 'Accepted' },
}

const EmployerEmployeesPage = () => {
  const { userProfile } = useSession()
  const companyId = userProfile?.companyId
  // const isAdmin = userProfile?.role === 'admin'
  console.log(userProfile)
  const [open, setOpen] = useState(false)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [invitingEmployee, setInvitingEmployee] = useState<Employee | null>(null)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [inviteLoading, setInviteLoading] = useState(false)
  // const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [form] = Form.useForm()
  const [inviteForm] = Form.useForm()

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
    form.setFieldsValue({ sendInvitation: true }) // Default to sending invitation
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

  const openInviteModal = (employee: Employee) => {
    setInvitingEmployee(employee)
    inviteForm.setFieldsValue({
      invitedEmail: employee.email || employee.invitedEmail || '',
    })
    setInviteModalOpen(true)
  }

  const closeInviteModal = () => {
    setInviteModalOpen(false)
    setInvitingEmployee(null)
    inviteForm.resetFields()
  }

  const onSendInvitation = async () => {
    if (!invitingEmployee || !companyId) return

    const values = await inviteForm.validateFields()
    setInviteLoading(true)

    try {
      const response = await sendInvitation(invitingEmployee.id, {
        companyId,
        invitedEmail: values.invitedEmail,
      })

      if (!response.success) {
        message.error(response.error || 'Failed to send invitation')
        return
      }

      message.success(`Invitation sent to ${values.invitedEmail}`)
      closeInviteModal()
      refetch()
    } catch {
      message.error('Failed to send invitation')
    } finally {
      setInviteLoading(false)
    }
  }

  // const onDeleteEmployee = async (employee: Employee) => {
  //   if (!companyId) return

  //   setDeleteLoading(employee.id)
  //   try {
  //     const response = await deleteEmployee(employee.id, companyId)
  //     if (!response.success) {
  //       message.error(response.error || 'Failed to delete employee')
  //       return
  //     }
  //     message.success(`${employee.firstName} ${employee.lastName} has been deleted`)
  //     refetch()
  //   } catch {
  //     message.error('Failed to delete employee')
  //   } finally {
  //     setDeleteLoading(null)
  //   }
  // }

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
            sendInvitation: values.sendInvitation,
          },
        ],
      })
      if (!response.success) {
        message.error(response.error || 'Unable to create employee')
        return
      }
      message.success(
        values.sendInvitation
          ? 'Employee created and invitation sent'
          : 'Employee created',
      )
    }

    closeModal()
    refetch()
  }

  return (
    <EmployerLayout>
      <Space orientation="vertical" size="large" className="w-full">
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
            {
              title: 'Email',
              dataIndex: 'email',
              render: (email: string | undefined, record: Employee) => {
                if (record.invitationStatus === 'pending') {
                  return (
                    <Tooltip title="Invitation sent - awaiting acceptance">
                      <span className="text-gray-500">
                        {email} <span className="text-xs italic">(pending)</span>
                      </span>
                    </Tooltip>
                  )
                }
                return email || <span className="text-gray-400 italic">No email</span>
              },
            },
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
              title: 'Invitation',
              dataIndex: 'invitationStatus',
              render: (status: InvitationStatus | undefined) => {
                const s = status || 'none'
                const config = invitationStatusConfig[s]
                return (
                  <Tag icon={config.icon} color={config.color}>
                    {config.label}
                  </Tag>
                )
              },
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
                  {record.invitationStatus !== 'accepted' && (
                    <Tooltip
                      title={
                        record.invitationStatus === 'pending'
                          ? 'Resend invitation'
                          : 'Send invitation'
                      }
                    >
                      <Button
                        type="link"
                        icon={<MailOutlined />}
                        onClick={() => openInviteModal(record)}
                      >
                        {record.invitationStatus === 'pending' ? 'Resend' : 'Invite'}
                      </Button>
                    </Tooltip>
                  )}
                  {/* {isAdmin && (
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
                  )} */}
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
              { required: !editingEmployee, message: 'Enter email address.' },
              { type: 'email', message: 'Enter a valid email.' },
            ]}
          >
            <Input aria-label="Email" placeholder="employee@example.com" />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <PhoneInput />
          </Form.Item>
          <Form.Item name="dob" label="Date of birth">
            <DatePicker className="w-full" />
          </Form.Item>
          {!editingEmployee && (
            <Form.Item
              name="sendInvitation"
              valuePropName="checked"
              extra="When checked, an invitation email will be sent to the employee so they can verify their email and log in."
            >
              <Switch
                checkedChildren="Send invitation"
                unCheckedChildren="No invitation"
                defaultChecked
              />
            </Form.Item>
          )}
          {editingEmployee && (
            <>
              <Form.Item name="role" label="Role">
                <Select options={roleOptions} aria-label="Role" disabled />
              </Form.Item>
              <Form.Item name="isActive" valuePropName="checked">
                <Switch
                  checkedChildren="Active"
                  unCheckedChildren="Inactive"
                  defaultChecked
                />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>

      {/* Send Invitation Modal */}
      <Modal
        title={`Send invitation to ${invitingEmployee?.firstName} ${invitingEmployee?.lastName}`}
        open={inviteModalOpen}
        onOk={onSendInvitation}
        onCancel={closeInviteModal}
        okText="Send Invitation"
        confirmLoading={inviteLoading}
      >
        <Form form={inviteForm} layout="vertical">
          <Form.Item
            name="invitedEmail"
            label="Email address to send invitation"
            rules={[
              { required: true, message: 'Enter email address.' },
              { type: 'email', message: 'Enter a valid email.' },
            ]}
            extra="The employee will receive an email with a link to accept the invitation and set up their account."
          >
            <Input aria-label="Invitation email" placeholder="employee@example.com" />
          </Form.Item>
        </Form>
        {invitingEmployee?.invitationStatus === 'pending' && (
          <Typography.Text type="warning" className="block mt-2">
            Note: A previous invitation was sent to {invitingEmployee.invitedEmail}.
            Sending a new invitation will invalidate the previous one.
          </Typography.Text>
        )}
      </Modal>
    </EmployerLayout>
  )
}

export default EmployerEmployeesPage
