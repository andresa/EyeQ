import { DatePicker, Form, Input, Modal, Select, Switch, message } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import type { Company, Employee, Manager, UserRole } from '../../types'
import PhoneInput from '../atoms/PhoneInput'

// Services - we'll call the appropriate ones based on context
import {
  createEmployee as adminCreateEmployee,
  updateEmployee as adminUpdateEmployee,
  createManager,
  updateManager,
  sendManagerInvitation,
} from '../../services/admin'
import {
  createEmployees as managerCreateEmployees,
  updateEmployee as managerUpdateEmployee,
  sendInvitation as sendEmployeeInvitation,
} from '../../services/manager'

type UserType = 'employee' | 'manager'

const roleOptions: { label: string; value: UserRole }[] = [
  { label: 'Employee', value: 'employee' },
  { label: 'Manager', value: 'manager' },
]

interface UserModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void

  // Mode
  userType: UserType
  editingUser: Employee | Manager | null // null = create mode

  // Context
  companyId: string
  companies?: Company[] // For admin to select company (optional)

  // Permissions
  canEditRole: boolean // Admin only - can change roles
  canSendInvitation: boolean // Show "Send invitation" toggle
  showDateOfBirth: boolean // Employees have DOB, managers don't

  // Caller context - determines which API to use
  isAdmin: boolean
}

interface FormValues {
  companyId: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  dob?: dayjs.Dayjs
  role?: UserRole
  isActive?: boolean
  sendInvitation?: boolean
}

const UserModal = ({
  open,
  onClose,
  onSuccess,
  userType,
  editingUser,
  companyId,
  companies,
  canEditRole,
  canSendInvitation,
  showDateOfBirth,
  isAdmin,
}: UserModalProps) => {
  const [form] = Form.useForm<FormValues>()
  const [loading, setLoading] = useState(false)

  const isEditing = !!editingUser
  const title = isEditing
    ? `Edit ${userType === 'manager' ? 'manager' : 'employee'}`
    : `Add ${userType === 'manager' ? 'manager' : 'employee'}`

  // Reset form when modal opens/closes or when editingUser changes
  useEffect(() => {
    if (open) {
      if (editingUser) {
        // Edit mode - populate form with existing data
        const dob =
          'dob' in editingUser && editingUser.dob ? dayjs(editingUser.dob) : undefined
        form.setFieldsValue({
          companyId: editingUser.companyId,
          firstName: editingUser.firstName,
          lastName: editingUser.lastName,
          email: editingUser.email,
          phone: editingUser.phone,
          dob,
          role: editingUser.role || (userType === 'manager' ? 'manager' : 'employee'),
          isActive: editingUser.isActive,
        })
      } else {
        // Create mode - set defaults
        form.resetFields()
        form.setFieldsValue({
          companyId,
          role: userType === 'manager' ? 'manager' : 'employee',
          isActive: true,
          sendInvitation: true,
        })
      }
    }
  }, [open, editingUser, companyId, userType, form])

  const handleClose = () => {
    form.resetFields()
    onClose()
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      // Use the companyId from the form if available (admin with selector),
      // otherwise use the prop (manager without selector)
      const effectiveCompanyId = values.companyId || companyId

      if (isEditing && editingUser) {
        // Update existing user
        if (userType === 'manager') {
          const response = await updateManager(editingUser.id, editingUser.companyId, {
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email,
            phone: values.phone,
            role: canEditRole ? values.role : undefined,
            isActive: values.isActive,
          })
          if (!response.success) {
            message.error(response.error || 'Unable to update manager')
            return
          }
          message.success('Manager updated')
        } else {
          // Employee - use admin or manager API based on context
          const updateFn = isAdmin ? adminUpdateEmployee : managerUpdateEmployee
          const response = await updateFn(editingUser.id, editingUser.companyId, {
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email,
            phone: values.phone,
            dob: values.dob?.format('YYYY-MM-DD'),
            role: canEditRole ? values.role : undefined,
            isActive: values.isActive,
          })
          if (!response.success) {
            message.error(response.error || 'Unable to update employee')
            return
          }
          message.success('Employee updated')
        }
      } else {
        // Create new user
        if (userType === 'manager') {
          // Create manager (admin only)
          const response = await createManager({
            companyId: effectiveCompanyId,
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email,
            phone: values.phone,
            role: values.role,
          })
          if (!response.success) {
            message.error(response.error || 'Unable to create manager')
            return
          }

          // Send invitation if requested
          if (values.sendInvitation && response.data) {
            try {
              await sendManagerInvitation(response.data.id, {
                companyId: effectiveCompanyId,
                invitedEmail: values.email,
              })
              message.success('Manager created and invitation sent')
            } catch {
              message.success('Manager created (invitation failed to send)')
            }
          } else {
            message.success('Manager created')
          }
        } else {
          // Employee
          if (isAdmin) {
            // Admin creates employee via management API
            const response = await adminCreateEmployee({
              companyId: effectiveCompanyId,
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

            // Send invitation if requested
            if (values.sendInvitation && response.data) {
              try {
                await sendEmployeeInvitation(response.data.id, {
                  companyId: effectiveCompanyId,
                  invitedEmail: values.email,
                })
                message.success('Employee created and invitation sent')
              } catch {
                message.success('Employee created (invitation failed to send)')
              }
            } else {
              message.success('Employee created')
            }
          } else {
            // Manager creates employee via manager API (with built-in invitation)
            const response = await managerCreateEmployees({
              companyId: effectiveCompanyId,
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
        }
      }

      handleClose()
      onSuccess()
    } catch {
      // Form validation failed
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title={title}
      open={open}
      onOk={handleSubmit}
      onCancel={handleClose}
      okText={isEditing ? 'Save changes' : `Create ${userType}`}
      confirmLoading={loading}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          role: userType === 'manager' ? 'manager' : 'employee',
          isActive: true,
          sendInvitation: true,
        }}
      >
        {/* Company selector - only for admin when creating and companies provided */}
        {companies && companies.length > 0 && (
          <Form.Item
            name="companyId"
            label="Company"
            rules={[{ required: true, message: 'Select a company.' }]}
          >
            <Select
              options={companies.map((company) => ({
                label: company.name,
                value: company.id,
              }))}
              disabled={isEditing}
            />
          </Form.Item>
        )}

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
            { required: !isEditing, message: 'Enter email address.' },
            { type: 'email', message: 'Enter a valid email.' },
          ]}
        >
          <Input aria-label="Email" placeholder="user@example.com" />
        </Form.Item>

        <Form.Item name="phone" label="Phone">
          <PhoneInput />
        </Form.Item>

        {/* Date of birth - only for employees */}
        {showDateOfBirth && (
          <Form.Item name="dob" label="Date of birth">
            <DatePicker className="w-full" />
          </Form.Item>
        )}

        {/* Send invitation toggle - only for creation */}
        {!isEditing && canSendInvitation && (
          <Form.Item
            name="sendInvitation"
            valuePropName="checked"
            extra="When checked, an invitation email will be sent so they can verify their email and log in."
          >
            <Switch
              checkedChildren="Send invitation"
              unCheckedChildren="No invitation"
              defaultChecked
            />
          </Form.Item>
        )}

        {/* Role selector - only when editing and user can edit roles */}
        {isEditing && (
          <Form.Item name="role" label="Role">
            <Select options={roleOptions} aria-label="Role" disabled={!canEditRole} />
          </Form.Item>
        )}

        {/* Active toggle - only when editing */}
        {isEditing && (
          <Form.Item name="isActive" valuePropName="checked">
            <Switch
              checkedChildren="Active"
              unCheckedChildren="Inactive"
              defaultChecked
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  )
}

export default UserModal
