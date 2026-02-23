import {
  App,
  Button,
  Dropdown,
  Form,
  Input,
  Modal,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { MenuProps } from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  EllipsisOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import ManagerLayout from '../../layouts/ManagerLayout'
import { deleteEmployee, listEmployees, sendInvitation } from '../../services/manager'
import type { Employee, InvitationStatus, UserRole } from '../../types'
import { useSession } from '../../hooks/useSession'
import UserModal from '../../components/molecules/UserModal'

const roleColors: Record<UserRole, string> = {
  admin: 'red',
  manager: 'blue',
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

const ManagerEmployeesPage = () => {
  const { message, modal } = App.useApp()
  const { userProfile } = useSession()
  const companyId = userProfile?.companyId || ''

  const [open, setOpen] = useState(false)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [invitingEmployee, setInvitingEmployee] = useState<Employee | null>(null)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteForm] = Form.useForm()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['manager', 'employees', companyId],
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
    setOpen(true)
  }

  const openEdit = (employee: Employee) => {
    setEditingEmployee(employee)
    setOpen(true)
  }

  const closeModal = () => {
    setOpen(false)
    setEditingEmployee(null)
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

  const onDeleteEmployee = (employee: Employee) => {
    if (!companyId) return

    modal.confirm({
      title: 'Delete employee',
      content: `Are you sure you want to delete ${employee.firstName} ${employee.lastName}? This action cannot be undone.`,
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        const response = await deleteEmployee(employee.id, companyId)
        if (!response.success) {
          message.error(response.error || 'Failed to delete employee')
          return
        }
        message.success(`${employee.firstName} ${employee.lastName} has been deleted`)
        refetch()
      },
    })
  }

  const getMenuItems = (record: Employee): MenuProps['items'] => {
    const items: MenuProps['items'] = [
      {
        key: 'edit',
        label: 'Edit',
        onClick: (e) => {
          e.domEvent.stopPropagation()
          openEdit(record)
        },
      },
    ]

    if (record.invitationStatus !== 'accepted') {
      items.push({
        key: 'invite',
        label:
          record.invitationStatus === 'pending' ? 'Resend invitation' : 'Send invitation',
        onClick: (e) => {
          e.domEvent.stopPropagation()
          openInviteModal(record)
        },
      })
    }

    items.push({
      key: 'delete',
      danger: true,
      label: 'Delete',
      onClick: (e) => {
        e.domEvent.stopPropagation()
        onDeleteEmployee(record)
      },
    })

    return items
  }

  return (
    <ManagerLayout>
      <div className="flex flex-col gap-6 w-full">
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
          onRow={(record) => ({
            onClick: () => openEdit(record),
            style: { cursor: 'pointer' },
          })}
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
                        {email || record.invitedEmail}{' '}
                        <span className="text-xs italic">(pending)</span>
                      </span>
                    </Tooltip>
                  )
                }
                return email || <span className="text-gray-400 italic">No email</span>
              },
            },
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
              width: 100,
              render: (_, record) => (
                <div className="flex items-center justify-center">
                  <Dropdown menu={{ items: getMenuItems(record) }} trigger={['click']}>
                    <Button
                      type="text"
                      icon={<EllipsisOutlined />}
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Employee actions"
                    />
                  </Dropdown>
                </div>
              ),
            },
          ]}
        />
      </div>

      <UserModal
        open={open}
        onClose={closeModal}
        onSuccess={() => refetch()}
        userType="employee"
        editingUser={editingEmployee}
        companyId={companyId}
        canEditRole={false}
        canSendInvitation={true}
        showDateOfBirth={true}
        isAdmin={false}
      />

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
    </ManagerLayout>
  )
}

export default ManagerEmployeesPage
