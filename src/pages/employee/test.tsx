import {
  Affix,
  App,
  Button,
  Card,
  Form,
  Input,
  Progress,
  Radio,
  Checkbox,
  Space,
  Typography,
  Spin,
} from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import EmployeeLayout from '../../layouts/EmployeeLayout'
import { fetchTestInstanceDetails, submitTestInstance } from '../../services/employee'
import type { ResponsePayload, TestComponent, TestInstanceDetails } from '../../types'
import { formatDistanceToNowStrict, parseISO } from 'date-fns'

const renderComponentInput = (component: TestComponent) => {
  switch (component.type) {
    case 'single_choice':
      return (
        <Radio.Group>
          <Space orientation="vertical">
            {(component.options || []).map((option) => (
              <Radio key={option.id} value={option.id}>
                {option.label}
              </Radio>
            ))}
          </Space>
        </Radio.Group>
      )
    case 'multiple_choice':
      return (
        <Checkbox.Group>
          <Space orientation="vertical">
            {(component.options || []).map((option) => (
              <Checkbox key={option.id} value={option.id}>
                {option.label}
              </Checkbox>
            ))}
          </Space>
        </Checkbox.Group>
      )
    case 'text':
      return <Input.TextArea rows={4} />
    default:
      return null
  }
}

interface TestFormProps {
  instanceId: string
  data: TestInstanceDetails
}

const TestForm = ({ instanceId, data }: TestFormProps) => {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [timeRemaining, setTimeRemaining] = useState('')
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)

  const sections = data.test.sections
  const isLastSection = currentSectionIndex === sections.length - 1
  const allowBack = data.test.settings?.allowBackNavigation ?? false

  const components = useMemo(() => {
    return sections.flatMap((section) => section.components)
  }, [sections])

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
    const expiresAt = data.instance.expiresAt
    if (!expiresAt) return undefined

    const update = () => {
      setTimeRemaining(
        formatDistanceToNowStrict(parseISO(expiresAt), { addSuffix: true }),
      )
    }

    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [data.instance.expiresAt])

  const validateSectionRequired = async (sectionIndex: number) => {
    const section = sections[sectionIndex]
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

  const handleNext = async () => {
    const isValid = await validateSectionRequired(currentSectionIndex)
    if (!isValid) return
    setCurrentSectionIndex((prev) => Math.min(prev + 1, sections.length - 1))
  }

  const handlePrevious = () => {
    setCurrentSectionIndex((prev) => Math.max(prev - 1, 0))
  }

  const handleSubmit = async () => {
    try {
      if (data.instance.status === 'completed' || data.instance.status === 'marked') {
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

  return (
    <Space orientation="vertical" size="large" className="w-full">
      <Affix offsetTop={0}>
        <Card>
          <Space orientation="vertical" className="w-full">
            <Typography.Title level={4}>{data.test.name}</Typography.Title>
            <Progress percent={progressPercent} />
            <Space className="w-full justify-between">
              {sections.length > 1 && (
                <Typography.Text type="secondary">
                  Section {currentSectionIndex + 1} of {sections.length}
                </Typography.Text>
              )}
              {data.instance.expiresAt && timeRemaining ? (
                <Typography.Text type="secondary">Due {timeRemaining}</Typography.Text>
              ) : null}
            </Space>
          </Space>
        </Card>
      </Affix>
      <Form form={form} layout="vertical">
        <Card>
          {sections.map((section, index) => (
            <div
              key={section.id}
              className={`test-section ${index !== currentSectionIndex ? 'test-section-hidden' : ''}`}
            >
              <Space orientation="vertical" className="w-full gap-4">
                <Typography.Title level={5}>{section.title}</Typography.Title>
                {section.components.map((component) => {
                  if (component.type === 'info') {
                    return (
                      <Card key={component.id} styles={{ body: { padding: '16px' } }}>
                        <div className="flex flex-col gap-2">
                          <Typography.Text strong>{component.title}</Typography.Text>
                          <Typography.Text>{component.description}</Typography.Text>
                        </div>
                      </Card>
                    )
                  }

                  return (
                    <Form.Item
                      key={component.id}
                      name={`q_${component.id}`}
                      label={
                        <div className="flex flex-col">
                          <Typography.Text strong>{component.title}</Typography.Text>
                          {component.description && (
                            <Typography.Text
                              type="secondary"
                              className="block font-normal"
                            >
                              {component.description}
                            </Typography.Text>
                          )}
                        </div>
                      }
                      rules={
                        component.required
                          ? [{ required: true, message: 'This question is required.' }]
                          : []
                      }
                    >
                      <div className="m-2">{renderComponentInput(component)}</div>
                    </Form.Item>
                  )
                })}
              </Space>
            </div>
          ))}
          <Space className="w-full justify-between mt-4">
            {allowBack && currentSectionIndex > 0 ? (
              <Button onClick={handlePrevious}>Previous</Button>
            ) : (
              <div />
            )}
            {isLastSection ? (
              <Button type="primary" onClick={handleSubmit}>
                Submit test
              </Button>
            ) : (
              <Button type="primary" onClick={handleNext}>
                Next
              </Button>
            )}
          </Space>
        </Card>
      </Form>
    </Space>
  )
}

const EmployeeTestPage = () => {
  const { instanceId } = useParams()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
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

  if (isLoading || !data) {
    return (
      <EmployeeLayout>
        <div className="flex justify-center items-center h-full">
          <Spin />
        </div>
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
                onClick={() => navigate(`/employee/test-results/${data.instance.id}`)}
              >
                View answers
              </Button>
              <Button onClick={() => navigate('/employee')}>Back to dashboard</Button>
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
            <Button onClick={() => navigate('/employee')}>Back to dashboard</Button>
          </Space>
        </Card>
      </EmployeeLayout>
    )
  }

  return (
    <EmployeeLayout>
      <TestForm key={instanceId} instanceId={instanceId!} data={data} />
    </EmployeeLayout>
  )
}

export default EmployeeTestPage
