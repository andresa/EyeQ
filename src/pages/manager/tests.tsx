import {
  App,
  Button,
  DatePicker,
  Dropdown,
  Input,
  Modal,
  Select,
  Table,
  Typography,
} from 'antd'
import type { MenuProps } from 'antd'
import { EllipsisOutlined } from '@ant-design/icons'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import ManagerLayout from '../../layouts/ManagerLayout'
import PageHeading from '../../components/atoms/PageHeading'
import {
  assignTest,
  deleteTestTemplate,
  duplicateTestTemplate,
  listEmployees,
  listTests,
} from '../../services/manager'
import type { Employee, TestTemplate } from '../../types'
import { useSession } from '../../hooks/useSession'
import { formatDateTime } from '../../utils/date'
import dayjs from 'dayjs'
import { FlaskConical } from 'lucide-react'

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
  const [nameFilter, setNameFilter] = useState('')
  const [loading, setLoading] = useState(false)

  const { data: tests } = useQuery({
    queryKey: ['manager', 'tests', companyId],
    queryFn: async () => {
      setLoading(true)
      if (!companyId) return [] as TestTemplate[]
      const response = await listTests(companyId)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to load tests')
      }
      setLoading(false)
      return response.data
    },
  })

  const { data: employees } = useQuery({
    queryKey: ['manager', 'employees', companyId],
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

  const sortedTests = useMemo(() => {
    return (tests || []).slice().sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [tests])

  const filteredTests = useMemo(() => {
    if (!nameFilter.trim()) return sortedTests
    const q = nameFilter.trim().toLowerCase()
    return sortedTests.filter((test) => test.name.toLowerCase().includes(q))
  }, [sortedTests, nameFilter])

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
    <ManagerLayout
      pageHeading={
        <PageHeading>
          <div className="flex items-center gap-2">
            <FlaskConical />
            <Typography.Title level={4}>Tests</Typography.Title>
          </div>
        </PageHeading>
      }
    >
      <div className="flex flex-col gap-6 w-full">
        <div className="flex items-center justify-between">
          <Input
            placeholder="Filter by name"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            allowClear
            className="max-w-xs"
          />
          <div className="flex items-center gap-2">
            <Button onClick={() => openAssign('')}>Assign Test</Button>
            <Button type="primary" onClick={() => navigate('/manager/test-builder')}>
              Create Test
            </Button>
          </div>
        </div>
        <Table
          dataSource={filteredTests}
          rowKey="id"
          loading={loading}
          onRow={(record) => ({
            onClick: () => navigate(`/manager/test-builder/${record.id}`),
            style: { cursor: 'pointer' },
          })}
          columns={[
            { title: 'Name', dataIndex: 'name' },
            {
              title: 'Sections',
              width: 100,
              align: 'center',
              render: (_, record) => record.sections.length,
            },
            {
              title: 'Created on',
              dataIndex: 'createdAt',
              width: 180,
              render: (value: string) => formatDateTime(value),
            },
            {
              title: 'Actions',
              width: 100,
              align: 'center',
              render: (_, record) => (
                <Dropdown menu={{ items: getMenuItems(record) }} trigger={['click']}>
                  <Button
                    type="text"
                    icon={<EllipsisOutlined />}
                    onClick={(event) => event.stopPropagation()}
                    aria-label="Test actions"
                  />
                </Dropdown>
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
              showSearch={{
                optionFilterProp: 'label',
                filterOption: (input, option) =>
                  (option?.label ?? '')
                    .toString()
                    .toLowerCase()
                    .includes(input.toLowerCase()),
              }}
              options={(employees || []).map((employee) => ({
                label: `${employee.firstName} ${employee.lastName}`,
                value: employee.id,
              }))}
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
