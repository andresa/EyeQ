import { Button, Card, Drawer, Dropdown, Select, Space, Table, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { EllipsisOutlined } from '@ant-design/icons'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import ManagerLayout from '../../layouts/ManagerLayout'
import {
  fetchTestInstanceResults,
  listEmployees,
  listTestInstances,
  listTests,
} from '../../services/manager'
import type { Employee, ResponseRecord, TestComponent, TestTemplate } from '../../types'
import { formatDateTime } from '../../utils/date'
import { useSession } from '../../hooks/useSession'

const buildResponseMap = (responses: ResponseRecord[]) =>
  responses.reduce((map, response) => {
    map.set(response.questionId, response)
    return map
  }, new Map<string, ResponseRecord>())

const resolveAnswer = (component: TestComponent, response?: ResponseRecord) => {
  if (!response) return 'No response'
  if (component.type === 'text') {
    return response.textAnswer || 'No response'
  }
  const rawAnswer = response.answer
  if (Array.isArray(rawAnswer)) {
    if (!component.options) return rawAnswer.join(', ')
    return rawAnswer
      .map(
        (optionId) => component.options?.find((option) => option.id === optionId)?.label,
      )
      .filter(Boolean)
      .join(', ')
  }
  if (typeof rawAnswer === 'string') {
    if (!component.options) return rawAnswer
    return component.options.find((option) => option.id === rawAnswer)?.label || rawAnswer
  }
  return 'No response'
}

const TestSubmissionsPage = () => {
  const { testId } = useParams()
  const navigate = useNavigate()
  const { userProfile } = useSession()
  const companyId = userProfile?.companyId

  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null)

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

  const { data: instances, isLoading } = useQuery({
    queryKey: ['manager', 'testInstances', testId, companyId],
    queryFn: async () => {
      const response = await listTestInstances({
        testId: testId || undefined,
        companyId: testId ? undefined : companyId,
      })
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to load test instances')
      }
      return response.data
    },
    enabled: Boolean(companyId),
  })

  const { data: results, isFetching: isLoadingResults } = useQuery({
    queryKey: ['manager', 'testInstanceResults', selectedInstanceId],
    enabled: Boolean(selectedInstanceId),
    queryFn: async () => {
      if (!selectedInstanceId) return null
      const response = await fetchTestInstanceResults(selectedInstanceId)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to load submissions')
      }
      return response.data
    },
  })

  const testName = useMemo(() => {
    if (!testId) return 'All test submissions'
    return tests?.find((test) => test.id === testId)?.name || 'Test submissions'
  }, [testId, tests])

  const employeeMap = useMemo(
    () =>
      (employees || []).reduce<Record<string, string>>((map, employee) => {
        map[employee.id] = `${employee.firstName} ${employee.lastName}`
        return map
      }, {}),
    [employees],
  )

  const responseMap = useMemo(() => buildResponseMap(results?.responses || []), [results])

  const sortedInstances = useMemo(() => {
    return (instances || []).slice().sort((a, b) => {
      const aDate = a.completedAt || a.assignedAt
      const bDate = b.completedAt || b.assignedAt
      return new Date(bDate).getTime() - new Date(aDate).getTime()
    })
  }, [instances])

  const handleViewAnswers = (instanceId: string) => {
    setSelectedInstanceId(instanceId)
  }

  const closeDrawer = () => setSelectedInstanceId(null)

  const getMenuItems = (instanceId: string): MenuProps['items'] => [
    {
      key: 'view',
      label: 'View answers',
      onClick: (event) => {
        event?.domEvent?.stopPropagation()
        handleViewAnswers(instanceId)
      },
    },
    {
      key: 'mark',
      label: 'Mark answers',
      onClick: (event) => {
        event?.domEvent?.stopPropagation()
        navigate(`/manager/marking/${instanceId}`)
      },
    },
  ]

  return (
    <ManagerLayout>
      <Space orientation="vertical" size="large" className="w-full">
        <Typography.Title level={3}>{testName}</Typography.Title>
        <Card>
          <Space orientation="vertical" className="w-full">
            <Select
              placeholder="Select a test"
              value={testId || 'all'}
              onChange={(value) =>
                value === 'all'
                  ? navigate('/manager/test-submissions')
                  : navigate(`/manager/test-submissions/${value}`)
              }
              options={[
                { label: 'All tests', value: 'all' },
                ...(tests || []).map((test) => ({
                  label: test.name,
                  value: test.id,
                })),
              ]}
              aria-label="Select test"
            />
            <Button onClick={() => navigate('/manager/tests')}>Back to tests</Button>
          </Space>
        </Card>
        <Table
          loading={isLoading}
          dataSource={sortedInstances}
          rowKey="id"
          onRow={(record) => ({
            onClick: () => navigate(`/manager/marking/${record.id}`),
            style: { cursor: 'pointer' },
          })}
          locale={{
            emptyText: testId
              ? 'No submissions found for this test.'
              : 'No submissions found yet.',
          }}
          columns={[
            {
              title: 'Employee',
              dataIndex: 'employeeId',
              render: (value: string) => employeeMap[value] || value,
            },
            { title: 'Status', dataIndex: 'status' },
            {
              title: 'Assigned',
              dataIndex: 'assignedAt',
              render: (value: string) => formatDateTime(value),
            },
            {
              title: 'Completed',
              dataIndex: 'completedAt',
              render: (value: string) => (value ? formatDateTime(value) : '-'),
            },
            {
              title: 'Actions',
              render: (_, record) => (
                <Dropdown menu={{ items: getMenuItems(record.id) }} trigger={['click']}>
                  <Button
                    type="text"
                    icon={<EllipsisOutlined />}
                    onClick={(event) => event.stopPropagation()}
                    aria-label="Submission actions"
                  />
                </Dropdown>
              ),
            },
          ]}
        />
      </Space>
      <Drawer
        title="Test answers"
        size={520}
        open={Boolean(selectedInstanceId)}
        onClose={closeDrawer}
      >
        {isLoadingResults ? (
          <Typography.Text>Loading answers...</Typography.Text>
        ) : results ? (
          <Space orientation="vertical" size="large" className="w-full">
            <Card>
              <Space orientation="vertical">
                <Typography.Text strong>{results.test.name}</Typography.Text>
                <Typography.Text type="secondary">
                  Employee:{' '}
                  {employeeMap[results.instance.employeeId] ||
                    results.instance.employeeId}
                </Typography.Text>
                <Typography.Text type="secondary">
                  Status: {results.instance.status}
                </Typography.Text>
                <Button
                  type="primary"
                  onClick={() => navigate(`/manager/marking/${results.instance.id}`)}
                >
                  Mark submission
                </Button>
              </Space>
            </Card>
            {results.test.sections.map((section) => (
              <Card key={section.id} title={section.title}>
                <Space orientation="vertical" className="w-full">
                  {section.components.map((component) => {
                    if (component.type === 'info') {
                      return (
                        <Card key={component.id} type="inner">
                          <Typography.Text strong>{component.title}</Typography.Text>
                          <Typography.Paragraph>
                            {component.description}
                          </Typography.Paragraph>
                        </Card>
                      )
                    }
                    const response = responseMap.get(component.id)
                    return (
                      <Card key={component.id} type="inner">
                        <Typography.Text strong>{component.title}</Typography.Text>
                        <Typography.Paragraph type="secondary">
                          {component.description}
                        </Typography.Paragraph>
                        <Typography.Text>
                          {resolveAnswer(component, response)}
                        </Typography.Text>
                      </Card>
                    )
                  })}
                </Space>
              </Card>
            ))}
          </Space>
        ) : (
          <Typography.Text>No answers available.</Typography.Text>
        )}
      </Drawer>
    </ManagerLayout>
  )
}

export default TestSubmissionsPage
