import { App, Button, Dropdown, Select, Table, Tag, Tooltip } from 'antd'
import type { MenuProps } from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  EllipsisOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import AdminLayout from '../../layouts/AdminLayout'
import { listCompanies, listEmployees } from '../../services/admin'
import { deleteEmployee, sendInvitation } from '../../services/manager'
import type { Company, Employee, InvitationStatus, UserRole } from '../../types'
import UserModal from '../../components/molecules/UserModal'

const roleColors: Record<string, string> = {
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

const AdminEmployeesPage = () => {
  const { message, modal } = App.useApp()
  const [open, setOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [companyId, setCompanyId] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const { data: companies } = useQuery({
    queryKey: ['admin', 'companies'],
    queryFn: async () => {
      setLoading(true)
      const response = await listCompanies()
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to load companies')
      }
      if (response.data.length === 1) {
        setCompanyId(response.data[0].id)
      }
      setLoading(false)
      return response.data
    },
  })

  const { data: employees, refetch } = useQuery({
    queryKey: ['admin', 'employees', companyId],
    queryFn: async () => {
      setLoading(true)
      if (!companyId) return [] as Employee[]
      const response = await listEmployees(companyId)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to load employees')
      }
      setLoading(false)
      return response.data
    },
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

    if (record.invitationStatus !== 'accepted' && record.email) {
      items.push({
        key: 'invite',
        label:
          record.invitationStatus === 'pending' ? 'Resend invitation' : 'Send invitation',
        onClick: (e) => {
          e.domEvent.stopPropagation()
          onSendInvitation(record)
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

  const onSendInvitation = async (employee: Employee) => {
    if (!companyId || !employee.email) return

    try {
      const response = await sendInvitation(employee.id, {
        companyId,
        invitedEmail: employee.email,
      })
      if (!response.success) {
        message.error(response.error || 'Failed to send invitation')
        return
      }
      message.success(`Invitation sent to ${employee.email}`)
      refetch()
    } catch {
      message.error('Failed to send invitation')
    }
  }

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 w-full">
        <div className="flex items-center justify-between gap-4">
          <div className="w-fit">
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
          </div>
          <Button type="primary" onClick={openCreate} disabled={!companyId}>
            Add Employee
          </Button>
        </div>
        <Table
          loading={loading}
          dataSource={employees || []}
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
        companies={companies}
        canEditRole={true}
        canSendInvitation={true}
        showDateOfBirth={true}
        isAdmin={true}
      />
    </AdminLayout>
  )
}

export default AdminEmployeesPage
