import {
  Affix,
  Button,
  Card,
  Collapse,
  Form,
  Input,
  Progress,
  Radio,
  Checkbox,
  Space,
  Typography,
  message,
} from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import EmployeeLayout from '../../layouts/EmployeeLayout'
import { fetchTestInstanceDetails, submitTestInstance } from '../../services/employee'
import type { ResponsePayload, TestComponent } from '../../types'
import { formatDateTime } from '../../utils/date'
import { formatDistanceToNowStrict, parseISO } from 'date-fns'

const EmployeeTestPage = () => {
  const { instanceId } = useParams()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [timeRemaining, setTimeRemaining] = useState('')
  const [activeSectionId, setActiveSectionId] = useState<string | undefined>()

  const { data } = useQuery({
    queryKey: ['employee', 'testInstance', instanceId],
    queryFn: async () => {
      if (!instanceId) return null
      const response = await fetchTestInstanceDetails(instanceId)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to load test')
      }
      return response.data
    },
  })

  const components = useMemo(() => {
    if (!data) return [] as TestComponent[]
    return data.test.sections.flatMap((section) => section.components)
  }, [data])

  const watchedValues = Form.useWatch([], form)
  const questionComponents = useMemo(
    () => components.filter((component) => component.type !== 'info'),
    [components],
  )
  const totalQuestions = questionComponents.length

  const answeredCount = useMemo(() => {
    if (!watchedValues) return 0
    return questionComponents.reduce((count, component) => {
      const value = watchedValues[`q_${component.id}`]
      if (Array.isArray(value)) {
        return value.length > 0 ? count + 1 : count
      }
      if (typeof value === 'string') {
        return value.trim() ? count + 1 : count
      }
      return value ? count + 1 : count
    }, 0)
  }, [questionComponents, watchedValues])

  const progressPercent = totalQuestions
    ? Math.round((answeredCount / totalQuestions) * 100)
    : 0

  useEffect(() => {
    const expiresAt = data?.instance.expiresAt
    if (!expiresAt) return undefined

    const update = () => {
      setTimeRemaining(formatDistanceToNowStrict(parseISO(expiresAt), { addSuffix: true }))
    }

    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [data?.instance.expiresAt])

  useEffect(() => {
    if (!data) return
    setActiveSectionId(data.test.sections[0]?.id)
  }, [data])

  const getSectionIndex = (sectionId?: string) =>
    data.test.sections.findIndex((section) => section.id === sectionId)

  const validateSectionRequired = async (sectionId?: string) => {
    if (!sectionId) return true
    const section = data.test.sections.find((item) => item.id === sectionId)
    if (!section) return true
    const requiredFields = section.components
      .filter((component) => component.type !== 'info' && component.required)
      .map((component) => `q_${component.id}`)
    if (requiredFields.length === 0) return true
    try {
      await form.validateFields(requiredFields)
      return true
    } catch {
      message.error('Please answer all required questions in this section.')
      return false
    }
  }

  const handleSectionChange = async (nextSectionId?: string) => {
    if (!nextSectionId) return
    if (!activeSectionId) {
      setActiveSectionId(nextSectionId)
      return
    }
    const currentIndex = getSectionIndex(activeSectionId)
    const nextIndex = getSectionIndex(nextSectionId)
    if (nextIndex > currentIndex) {
      const isValid = await validateSectionRequired(activeSectionId)
      if (!isValid) return
    }
    setActiveSectionId(nextSectionId)
  }

  const handleSubmit = async () => {
    try {
      if (data?.instance.status === 'completed' || data?.instance.status === 'marked') {
        message.warning('This test has already been completed.')
        return
      }
      const values = await form.validateFields()
      const responses: ResponsePayload[] = components
        .filter((component) => component.type !== 'info')
        .map((component) => {
          const value = values[`q_${component.id}`]
          if (component.type === 'text') {
            return {
              questionId: component.id,
              answer: null,
              textAnswer: value || null,
            }
          }
          return {
            questionId: component.id,
            answer: value ?? null,
            textAnswer: null,
          }
        })
      if (!instanceId) return
      const response = await submitTestInstance(instanceId, {
        responses,
        completedAt: new Date().toISOString(),
      })
      if (!response.success) {
        message.error(response.error || 'Unable to submit test')
        return
      }
      message.success('Test submitted')
      navigate('/employee')
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message)
      }
    }
  }

  if (!data) {
    return (
      <EmployeeLayout>
        <Typography.Text>Loading test...</Typography.Text>
      </EmployeeLayout>
    )
  }

  if (data.instance.status === 'completed' || data.instance.status === 'marked') {
    return (
      <EmployeeLayout>
        <Card>
          <Space orientation="vertical" className="w-full">
            <Typography.Title level={4}>{data.test.name}</Typography.Title>
            <Typography.Text type="secondary">
              This test has already been completed.
            </Typography.Text>
            <Space>
              <Button
                type="primary"
                onClick={() =>
                  navigate(`/employee/test-results/${data.instance.id}`)
                }
              >
                View answers
              </Button>
              <Button onClick={() => navigate('/employee')}>
                Back to dashboard
              </Button>
            </Space>
          </Space>
        </Card>
      </EmployeeLayout>
    )
  }

  if (data.instance.status === 'expired') {
    return (
      <EmployeeLayout>
        <Card>
          <Space orientation="vertical" className="w-full">
            <Typography.Title level={4}>{data.test.name}</Typography.Title>
            <Typography.Text type="secondary">
              This test has expired and can no longer be completed.
            </Typography.Text>
            <Button onClick={() => navigate('/employee')}>
              Back to dashboard
            </Button>
          </Space>
        </Card>
      </EmployeeLayout>
    )
  }

  return (
    <EmployeeLayout>
      <Space orientation="vertical" size="large" className="w-full">
        <Affix offsetTop={0}>
          <Card>
            <Space orientation="vertical" className="w-full">
              <Typography.Title level={4}>{data.test.name}</Typography.Title>
              <Progress percent={progressPercent} />
              {data.instance.expiresAt ? (
                <Typography.Text type="secondary">
                  Due {formatDateTime(data.instance.expiresAt)} ({timeRemaining})
                </Typography.Text>
              ) : null}
            </Space>
          </Card>
        </Affix>
        <Form form={form} layout="vertical">
          <Collapse
            accordion
            activeKey={activeSectionId}
            onChange={(key) =>
              handleSectionChange(Array.isArray(key) ? key[0] : key)
            }
          >
            {data.test.sections.map((section) => (
              <Collapse.Panel key={section.id} header={section.title}>
                <Space orientation="vertical" className="w-full">
                  {section.components.map((component) => {
                    if (component.type === 'info') {
                      return (
                        <Card key={component.id}>
                          <Typography.Title level={5}>
                            {component.title}
                          </Typography.Title>
                          <Typography.Paragraph>
                            {component.description}
                          </Typography.Paragraph>
                        </Card>
                      )
                    }

                    return (
                      <Form.Item
                        key={component.id}
                        name={`q_${component.id}`}
                        label={component.title}
                        extra={component.description}
                        rules={
                          component.required
                            ? [{ required: true, message: 'This question is required.' }]
                            : []
                        }
                      >
                        {component.type === 'single_choice' ? (
                          <Radio.Group>
                            <Space orientation="vertical">
                              {(component.options || []).map((option) => (
                                <Radio key={option.id} value={option.id}>
                                  {option.label}
                                </Radio>
                              ))}
                            </Space>
                          </Radio.Group>
                        ) : component.type === 'multiple_choice' ? (
                          <Checkbox.Group>
                            <Space orientation="vertical">
                              {(component.options || []).map((option) => (
                                <Checkbox key={option.id} value={option.id}>
                                  {option.label}
                                </Checkbox>
                              ))}
                            </Space>
                          </Checkbox.Group>
                        ) : (
                          <Input.TextArea rows={4} />
                        )}
                      </Form.Item>
                    )
                  })}
                  <Space className="w-full justify-between">
                    <Button
                      onClick={() => {
                        const index = data.test.sections.findIndex(
                          (item) => item.id === section.id,
                        )
                        const prev = data.test.sections[index - 1]
                        if (prev) setActiveSectionId(prev.id)
                      }}
                      disabled={
                        data.test.sections.findIndex(
                          (item) => item.id === section.id,
                        ) === 0
                      }
                    >
                      Previous
                    </Button>
                    {data.test.sections.findIndex(
                      (item) => item.id === section.id,
                    ) === data.test.sections.length - 1 ? (
                      <Button type="primary" onClick={handleSubmit}>
                        Submit test
                      </Button>
                    ) : (
                      <Button
                        type="primary"
                        onClick={async () => {
                          const index = data.test.sections.findIndex(
                            (item) => item.id === section.id,
                          )
                          const next = data.test.sections[index + 1]
                          if (!next) return
                          const isValid = await validateSectionRequired(section.id)
                          if (!isValid) return
                          setActiveSectionId(next.id)
                        }}
                      >
                        Next
                      </Button>
                    )}
                  </Space>
                </Space>
              </Collapse.Panel>
            ))}
          </Collapse>
        </Form>
      </Space>
    </EmployeeLayout>
  )
}

export default EmployeeTestPage
