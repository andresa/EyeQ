import { Button, Card, Space, Tag, Typography } from 'antd'
import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import EmployeeLayout from '../../layouts/EmployeeLayout'
import { fetchEmployeeTestInstanceResults } from '../../services/employee'
import type { ResponseRecord, TestComponent } from '../../types'
import { formatDateTime } from '../../utils/date'

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

const EmployeeTestResultsPage = () => {
  const { instanceId } = useParams()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['employee', 'testInstanceResults', instanceId],
    queryFn: async () => {
      if (!instanceId) return null
      const response = await fetchEmployeeTestInstanceResults(instanceId)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to load results')
      }
      return response.data
    },
  })

  const responseMap = useMemo(() => buildResponseMap(data?.responses || []), [data])

  if (isLoading || !data) {
    return (
      <EmployeeLayout>
        <Typography.Text>Loading results...</Typography.Text>
      </EmployeeLayout>
    )
  }

  const isMarked = data.instance.status === 'marked'

  return (
    <EmployeeLayout>
      <Space orientation="vertical" size="large" className="w-full">
        <Typography.Title level={3}>{data.test.name}</Typography.Title>
        <Card>
          <Space orientation="vertical">
            <Typography.Text type="secondary">
              Status: {data.instance.status}
            </Typography.Text>
            {!isMarked ? (
              <Typography.Text type="secondary">
                Awaiting manager marking.
              </Typography.Text>
            ) : null}
            {data.instance.completedAt ? (
              <Typography.Text type="secondary">
                Completed {formatDateTime(data.instance.completedAt)}
              </Typography.Text>
            ) : null}
          </Space>
        </Card>
        {data.test.sections.map((section) => (
          <Card key={section.id} title={section.title}>
            <Space orientation="vertical" className="w-full">
              {section.components.map((component) => {
                if (component.type === 'info') {
                  return (
                    <Card key={component.id} type="inner">
                      <Typography.Text strong>{component.title}</Typography.Text>
                      <Typography.Paragraph>{component.description}</Typography.Paragraph>
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
                    {isMarked ? (
                      <Space className="mt-2">
                        {response?.isCorrect ? (
                          <Tag color="green">Correct</Tag>
                        ) : (
                          <Tag color="red">Incorrect</Tag>
                        )}
                        {response?.note ? (
                          <Typography.Text type="secondary">
                            Note: {response.note}
                          </Typography.Text>
                        ) : null}
                      </Space>
                    ) : null}
                  </Card>
                )
              })}
            </Space>
          </Card>
        ))}
        <Button onClick={() => navigate('/employee')}>Back to dashboard</Button>
      </Space>
    </EmployeeLayout>
  )
}

export default EmployeeTestResultsPage
