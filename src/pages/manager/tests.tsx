import { App, Button, DatePicker, Dropdown, Modal, Select, Table, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { EllipsisOutlined } from '@ant-design/icons'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import ManagerLayout from '../../layouts/ManagerLayout'
import {
  assignTest,
  deleteTestTemplate,
  duplicateTestTemplate,
  listEmployees,
  listTestInstances,
  listTests,
} from '../../services/manager'
import type { Employee, TestInstance, TestTemplate } from '../../types'
import { useSession } from '../../hooks/useSession'
import { formatDateTime } from '../../utils/date'
import dayjs from 'dayjs'

const ManagerTestsPage = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { message, modal } = App.useApp()
  const { userProfile } = useSession()
  const companyId = userProfile?.companyId

  const [assignOpen, setAssignOpen] = useState(false)
  const [assignTestId, setAssignTestId] = useState<string>('')
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [expiry, setExpiry] = useState<string | undefined>()

  const { data: tests } = useQuery({
    queryKey: ['manager', 'tests', companyId],
    queryFn: async () => {
      if (!companyId) return [] as TestTemplate[]
      const response = await listTests(companyId)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to load tests')
      }
      return response.data
    },
  })

  const { data: employees } = useQuery({
    queryKey: ['manager', 'employees', companyId],
    queryFn: async () => {
      if (!companyId) return [] as Employee[]
      const response = await listEmployees(companyId)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to load employees')
      }
      return response.data
    },
  })

  const { data: testInstances } = useQuery({
    queryKey: ['manager', 'testInstances', companyId],
    queryFn: async () => {
      if (!companyId) return [] as TestInstance[]
      const response = await listTestInstances({ companyId })
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to load test instances')
      }
      return response.data
    },
    enabled: Boolean(companyId),
  })

  const completionMap = useMemo(() => {
    return (testInstances || []).reduce<Record<string, number>>((map, instance) => {
      if (instance.status === 'completed' || instance.status === 'marked') {
        map[instance.testId] = (map[instance.testId] || 0) + 1
      }
      return map
    }, {})
  }, [testInstances])

  const sortedTests = useMemo(() => {
    return (tests || []).slice().sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [tests])

  const openAssign = (testId?: string) => {
    setAssignTestId(testId ?? '')
    setSelectedEmployees([])
    setExpiry(undefined)
    setAssignOpen(true)
  }

  const closeAssign = () => {
    setAssignOpen(false)
    setAssignTestId('')
    setSelectedEmployees([])
    setExpiry(undefined)
  }

  const handleAssign = async () => {
    if (!assignTestId) {
      message.error('Select a test.')
      return
    }
    if (selectedEmployees.length === 0) {
      message.error('Select at least one employee.')
      return
    }
    const response = await assignTest(assignTestId, {
      employeeIds: selectedEmployees,
      expiresAt: expiry,
    })
    if (!response.success) {
      message.error(response.error || 'Unable to assign test')
      return
    }
    message.success('Test assigned')
    closeAssign()
  }

  const handleDuplicate = async (testId: string) => {
    const response = await duplicateTestTemplate(testId)
    if (!response.success) {
      message.error(response.error || 'Unable to duplicate test')
      return
    }
    message.success('Test duplicated')
    queryClient.invalidateQueries({ queryKey: ['manager', 'tests'] })
  }

  const handleDelete = (record: TestTemplate) => {
    modal.confirm({
      title: 'Delete test',
      content: `Are you sure you want to delete "${record.name}"?`,
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        const response = await deleteTestTemplate(record.id)
        if (!response.success) {
          message.error(response.error || 'Unable to delete test')
          return
        }
        message.success('Test deleted')
        queryClient.invalidateQueries({ queryKey: ['manager', 'tests'] })
        queryClient.invalidateQueries({ queryKey: ['manager', 'testInstances'] })
      },
    })
  }

  const getMenuItems = (record: TestTemplate): MenuProps['items'] => [
    {
      key: 'edit',
      label: 'Edit',
      onClick: (event) => {
        event?.domEvent?.stopPropagation()
        navigate(`/manager/test-builder/${record.id}`)
      },
    },
    {
      key: 'results',
      label: 'Submissions',
      onClick: (event) => {
        event?.domEvent?.stopPropagation()
        navigate(`/manager/test-submissions/${record.id}`)
      },
    },
    {
      key: 'assign',
      label: 'Assign',
      onClick: (event) => {
        event?.domEvent?.stopPropagation()
        openAssign(record.id)
      },
    },
    {
      key: 'duplicate',
      label: 'Duplicate',
      onClick: (event) => {
        event?.domEvent?.stopPropagation()
        handleDuplicate(record.id)
      },
    },
    {
      key: 'delete',
      danger: true,
      label: 'Delete',
      onClick: (event) => {
        event?.domEvent?.stopPropagation()
        handleDelete(record)
      },
    },
  ]

  return (
    <ManagerLayout>
      <div className="flex flex-col gap-6 w-full">
        <div className="flex items-center justify-between">
          <Typography.Title level={3} className="m-0">
            Tests
          </Typography.Title>
          <div className="flex items-center gap-2">
            <Button onClick={() => openAssign('')}>Assign Test</Button>
            <Button type="primary" onClick={() => navigate('/manager/test-builder')}>
              Create Test
            </Button>
          </div>
        </div>
        <Table
          dataSource={sortedTests}
          rowKey="id"
          onRow={(record) => ({
            onClick: () => navigate(`/manager/test-builder/${record.id}`),
            style: { cursor: 'pointer' },
          })}
          columns={[
            { title: 'Name', dataIndex: 'name' },
            { title: 'Sections', render: (_, record) => record.sections.length },
            {
              title: 'Created on',
              dataIndex: 'createdAt',
              render: (value: string) => formatDateTime(value),
            },
            {
              title: 'Completions',
              render: (_, record) => completionMap[record.id] || 0,
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
                      onClick={(event) => event.stopPropagation()}
                      aria-label="Test actions"
                    />
                  </Dropdown>
                </div>
              ),
            },
          ]}
        />
      </div>
      <Modal
        title="Assign Test"
        open={assignOpen}
        onOk={handleAssign}
        onCancel={closeAssign}
        okText="Assign"
      >
        <div className="flex w-full flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Typography.Text strong>Test</Typography.Text>
            <Select
              value={assignTestId || undefined}
              onChange={(id) => setAssignTestId(id || '')}
              placeholder="Select test"
              allowClear
              showSearch
              optionFilterProp="label"
              options={sortedTests.map((test) => ({
                label: test.name,
                value: test.id,
              }))}
              filterOption={(input, option) =>
                (option?.label ?? '')
                  .toString()
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              className="w-full"
            />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <Typography.Text strong>Employees</Typography.Text>
              <Button
                type="link"
                size="small"
                className="p-0 h-auto"
                onClick={() => setSelectedEmployees((employees || []).map((e) => e.id))}
                disabled={!employees?.length}
              >
                Select all
              </Button>
            </div>
            <Select
              mode="multiple"
              value={selectedEmployees}
              onChange={(values) => setSelectedEmployees(values)}
              placeholder="Select employees"
              showSearch
              optionFilterProp="label"
              options={(employees || []).map((employee) => ({
                label: `${employee.firstName} ${employee.lastName}`,
                value: employee.id,
              }))}
              filterOption={(input, option) =>
                (option?.label ?? '')
                  .toString()
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              className="w-full"
              allowClear
            />
          </div>
          <div className="flex flex-col gap-1">
            <Typography.Text strong>Expiry (optional)</Typography.Text>
            <DatePicker
              showTime={{ format: 'HH:mm' }}
              format="YYYY-MM-DD HH:mm"
              className="w-full"
              value={expiry ? dayjs(expiry) : null}
              onChange={(value) => setExpiry(value?.toISOString())}
              placeholder="Expiry date"
              showNow={false}
            />
            <div className="flex gap-2 flex-wrap">
              <Button
                size="small"
                onClick={() =>
                  setExpiry(dayjs().add(1, 'day').second(0).millisecond(0).toISOString())
                }
              >
                In 1 day
              </Button>
              <Button
                size="small"
                onClick={() =>
                  setExpiry(dayjs().add(1, 'week').second(0).millisecond(0).toISOString())
                }
              >
                In 1 week
              </Button>
              <Button
                size="small"
                onClick={() =>
                  setExpiry(
                    dayjs().add(1, 'month').second(0).millisecond(0).toISOString(),
                  )
                }
              >
                In 1 month
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </ManagerLayout>
  )
}

export default ManagerTestsPage
