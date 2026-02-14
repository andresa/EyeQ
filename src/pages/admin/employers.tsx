import {
  Button,
  Card,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  message,
} from 'antd'
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
  deleteEmployer,
  listCompanies,
  listEmployers,
  sendEmployerInvitation,
} from '../../services/admin'
import type { Company, Employer, InvitationStatus, UserRole } from '../../types'
import UserModal from '../../components/molecules/UserModal'

const roleColors: Record<string, string> = {
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

const AdminEmployersPage = () => {
  const [open, setOpen] = useState(false)
  const [editingEmployer, setEditingEmployer] = useState<Employer | null>(null)
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
      return response.data
    },
  })

  const {
    data: employers,
    isLoading,
    refetch,
  } = useQuery({
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
    setEditingEmployer(null)
    setOpen(true)
  }

  const openEdit = (employer: Employer) => {
    setEditingEmployer(employer)
    setOpen(true)
  }

  const closeModal = () => {
    setOpen(false)
    setEditingEmployer(null)
  }

  const onDeleteEmployer = async (employer: Employer) => {
    if (!companyId) return

    setDeleteLoading(employer.id)
    try {
      const response = await deleteEmployer(employer.id, companyId)
      if (!response.success) {
        message.error(response.error || 'Failed to delete employer')
        return
      }
      message.success(`${employer.firstName} ${employer.lastName} has been deleted`)
      refetch()
    } catch {
      message.error('Failed to delete employer')
    } finally {
      setDeleteLoading(null)
    }
  }

  const onSendInvitation = async (employer: Employer) => {
    if (!companyId || !employer.email) return

    setInviteLoading(employer.id)
    try {
      const response = await sendEmployerInvitation(employer.id, {
        companyId,
        invitedEmail: employer.email,
      })
      if (!response.success) {
        message.error(response.error || 'Failed to send invitation')
        return
      }
      message.success(`Invitation sent to ${employer.email}`)
      refetch()
    } catch {
      message.error('Failed to send invitation')
    } finally {
      setInviteLoading(null)
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
            {
              title: 'Email',
              dataIndex: 'email',
              render: (email: string | undefined, record: Employer) => {
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
                <Tag color={roleColors[role] || 'blue'}>{role || 'employer'}</Tag>
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
                    title="Delete employer"
                    description={`Are you sure you want to delete ${record.firstName} ${record.lastName}? This action cannot be undone.`}
                    onConfirm={() => onDeleteEmployer(record)}
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

      <UserModal
        open={open}
        onClose={closeModal}
        onSuccess={() => refetch()}
        userType="employer"
        editingUser={editingEmployer}
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

export default AdminEmployersPage
