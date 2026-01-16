import {
  Button,
  Card,
  DatePicker,
  Dropdown,
  Modal,
  Select,
  Space,
  Table,
  Typography,
  message,
} from 'antd'
import type { MenuProps } from 'antd'
import { EllipsisOutlined } from '@ant-design/icons'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import EmployerLayout from '../../layouts/EmployerLayout'
import CompanyEmployerSelector from '../../components/molecules/CompanyEmployerSelector'
import {
  assignTest,
  deleteTestTemplate,
  duplicateTestTemplate,
  listEmployees,
  listTestInstances,
  listTests,
} from '../../services/employer'
import type { Employee, TestInstance, TestTemplate } from '../../types'
import { useSession } from '../../hooks/useSession'
import { formatDateTime } from '../../utils/date'

const EmployerTestsPage = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { session } = useSession()
  const companyId = session?.companyId

  const [assignOpen, setAssignOpen] = useState(false)
  const [assignTestId, setAssignTestId] = useState<string>('')
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [expiry, setExpiry] = useState<string | undefined>()

  const { data: tests } = useQuery({
    queryKey: ['employer', 'tests', companyId],
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
    queryKey: ['employer', 'employees', companyId],
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
    queryKey: ['employer', 'testInstances', companyId],
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

  const openAssign = (testId: string) => {
    setAssignTestId(testId)
    setSelectedEmployees([])
    setExpiry(undefined)
    setAssignOpen(true)
  }

  const handleAssign = async () => {
    if (!assignTestId) return
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
    setAssignOpen(false)
  }

  const handleDuplicate = async (testId: string) => {
    const response = await duplicateTestTemplate(testId)
    if (!response.success) {
      message.error(response.error || 'Unable to duplicate test')
      return
    }
    message.success('Test duplicated')
    queryClient.invalidateQueries({ queryKey: ['employer', 'tests'] })
  }

  const handleDelete = (record: TestTemplate) => {
    Modal.confirm({
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
        queryClient.invalidateQueries({ queryKey: ['employer', 'tests'] })
        queryClient.invalidateQueries({ queryKey: ['employer', 'testInstances'] })
      },
    })
  }

  const getMenuItems = (record: TestTemplate): MenuProps['items'] => [
    {
      key: 'edit',
      label: 'Edit',
      onClick: (event) => {
        event?.domEvent?.stopPropagation()
        navigate(`/employer/test-builder/${record.id}`)
      },
    },
    {
      key: 'results',
      label: 'Submissions',
      onClick: (event) => {
        event?.domEvent?.stopPropagation()
        navigate(`/employer/test-submissions/${record.id}`)
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
    <EmployerLayout>
      <Space orientation="vertical" size="large" className="w-full">
        <Typography.Title level={3}>Tests</Typography.Title>
        <Card>
          <Space orientation="vertical" className="w-full">
            <CompanyEmployerSelector />
            <Button type="primary" onClick={() => navigate('/employer/test-builder')}>
              Create Test
            </Button>
          </Space>
        </Card>
        <Table
          dataSource={sortedTests}
          rowKey="id"
          onRow={(record) => ({
            onClick: () => navigate(`/employer/test-builder/${record.id}`),
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
      </Space>
      <Modal
        title="Assign Test"
        open={assignOpen}
        onOk={handleAssign}
        onCancel={() => setAssignOpen(false)}
        okText="Assign"
      >
        <Space orientation="horizontal" className="flex justify-between w-full">
          <Select
            mode="multiple"
            className="min-w-[260px]"
            value={selectedEmployees}
            onChange={(values) => setSelectedEmployees(values)}
            placeholder="Select employees"
            options={(employees || []).map((employee) => ({
              label: `${employee.firstName} ${employee.lastName}`,
              value: employee.id,
            }))}
          />
          <DatePicker
            showTime
            className="w-full"
            onChange={(value) => setExpiry(value?.toISOString())}
            placeholder="Expiry date"
          />
        </Space>
      </Modal>
    </EmployerLayout>
  )
}

export default EmployerTestsPage
