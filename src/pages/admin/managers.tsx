import { Button, Card, Popconfirm, Select, Table, Tag, Tooltip, message } from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  MailOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import AdminLayout from '../../layouts/AdminLayout'
import {
  deleteManager,
  listCompanies,
  listManagers,
  sendManagerInvitation,
} from '../../services/admin'
import type { Company, Manager, InvitationStatus, UserRole } from '../../types'
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

const AdminManagersPage = () => {
  const [open, setOpen] = useState(false)
  const [editingManager, setEditingManager] = useState<Manager | null>(null)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [inviteLoading, setInviteLoading] = useState<string | null>(null)
  const [companyId, setCompanyId] = useState<string>('')

  const { data: companies } = useQuery({
    queryKey: ['admin', 'companies'],
    queryFn: async () => {
      const response = await listCompanies()
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to load companies')
      }
      if (response.data.length === 1) {
        setCompanyId(response.data[0].id)
      }
      return response.data
    },
  })

  const {
    data: managers,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'managers', companyId],
    queryFn: async () => {
      if (!companyId) return [] as Manager[]
      const response = await listManagers(companyId)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to load managers')
      }
      return response.data
    },
  })

  const openCreate = () => {
    setEditingManager(null)
    setOpen(true)
  }

  const openEdit = (manager: Manager) => {
    setEditingManager(manager)
    setOpen(true)
  }

  const closeModal = () => {
    setOpen(false)
    setEditingManager(null)
  }

  const onDeleteManager = async (manager: Manager) => {
    if (!companyId) return

    setDeleteLoading(manager.id)
    try {
      const response = await deleteManager(manager.id, companyId)
      if (!response.success) {
        message.error(response.error || 'Failed to delete manager')
        return
      }
      message.success(`${manager.firstName} ${manager.lastName} has been deleted`)
      refetch()
    } catch {
      message.error('Failed to delete manager')
    } finally {
      setDeleteLoading(null)
    }
  }

  const onSendInvitation = async (manager: Manager) => {
    if (!companyId || !manager.email) return

    setInviteLoading(manager.id)
    try {
      const response = await sendManagerInvitation(manager.id, {
        companyId,
        invitedEmail: manager.email,
      })
      if (!response.success) {
        message.error(response.error || 'Failed to send invitation')
        return
      }
      message.success(`Invitation sent to ${manager.email}`)
      refetch()
    } catch {
      message.error('Failed to send invitation')
    } finally {
      setInviteLoading(null)
    }
  }

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 w-full">
        <Card>
          <div className="flex flex-col gap-4 w-full">
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
              Add manager
            </Button>
          </div>
        </Card>
        <Table
          loading={isLoading}
          dataSource={managers || []}
          rowKey="id"
          columns={[
            {
              title: 'Name',
              render: (_, record) => `${record.firstName} ${record.lastName}`,
            },
            {
              title: 'Email',
              dataIndex: 'email',
              render: (email: string | undefined, record: Manager) => {
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
            { title: 'Phone', dataIndex: 'phone' },
            {
              title: 'Role',
              dataIndex: 'role',
              render: (role: UserRole) => (
                <Tag color={roleColors[role] || 'blue'}>{role || 'manager'}</Tag>
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
                <div className="flex gap-4">
                  <Button
                    type="link"
                    icon={<EditOutlined />}
                    onClick={() => openEdit(record)}
                  >
                    Edit
                  </Button>
                  {record.invitationStatus !== 'accepted' && record.email && (
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
                        onClick={() => onSendInvitation(record)}
                        loading={inviteLoading === record.id}
                      >
                        {record.invitationStatus === 'pending' ? 'Resend' : 'Invite'}
                      </Button>
                    </Tooltip>
                  )}
                  <Popconfirm
                    title="Delete manager"
                    description={`Are you sure you want to delete ${record.firstName} ${record.lastName}? This action cannot be undone.`}
                    onConfirm={() => onDeleteManager(record)}
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
        userType="manager"
        editingUser={editingManager}
        companyId={companyId}
        companies={companies}
        canEditRole={true}
        canSendInvitation={true}
        showDateOfBirth={false}
        isAdmin={true}
      />
    </AdminLayout>
  )
}

export default AdminManagersPage
