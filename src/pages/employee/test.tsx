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
  Typography,
  Spin,
} from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import EmployeeLayout from '../../layouts/EmployeeLayout'
import {
  fetchTestInstanceDetails,
  openTestInstance,
  saveTestResponses,
  submitTestInstance,
} from '../../services/employee'
import type {
  ResponsePayload,
  ResponseRecord,
  TestComponent,
  TestInstanceDetails,
} from '../../types'
import { formatDistanceToNowStrict, parseISO } from 'date-fns'
import { CheckCircleOutlined } from '@ant-design/icons'

const AUTO_SAVE_DELAY_MS = 2000

const renderComponentInput = (component: TestComponent) => {
  switch (component.type) {
    case 'single_choice':
      return (
        <Radio.Group className="m-2">
          <div className="flex flex-col gap-4">
            {(component.options || []).map((option) => (
              <Radio key={option.id} value={option.id}>
                {option.label}
              </Radio>
            ))}
          </div>
        </Radio.Group>
      )
    case 'multiple_choice':
      return (
        <Checkbox.Group className="m-2">
          <div className="flex flex-col gap-4">
            {(component.options || []).map((option) => (
              <Checkbox key={option.id} value={option.id}>
                {option.label}
              </Checkbox>
            ))}
          </div>
        </Checkbox.Group>
      )
    case 'text':
      return <Input.TextArea rows={4} className="m-2" />
    default:
      return null
  }
}

const buildFormValues = (
  components: TestComponent[],
  responses: ResponseRecord[],
): Record<string, unknown> => {
  const responseMap = new Map(responses.map((r) => [r.questionId, r]))
  const values: Record<string, unknown> = {}
  for (const component of components) {
    if (component.type === 'info') continue
    const response = responseMap.get(component.id)
    if (!response) continue
    if (component.type === 'text') {
      values[`q_${component.id}`] = response.textAnswer ?? undefined
    } else {
      values[`q_${component.id}`] = response.answer ?? undefined
    }
  }
  return values
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
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef<string>('')
  const isInitializedRef = useRef(false)

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

  const buildResponses = useCallback((): ResponsePayload[] => {
    const values = form.getFieldsValue()
    return questionComponents.map((component) => {
      const value = values[`q_${component.id}`]
      if (component.type === 'text') {
        return { questionId: component.id, answer: null, textAnswer: value || null }
      }
      return { questionId: component.id, answer: value ?? null, textAnswer: null }
    })
  }, [form, questionComponents])

  // Pre-populate form with saved responses
  useEffect(() => {
    if (isInitializedRef.current) return
    if (data.responses && data.responses.length > 0) {
      const values = buildFormValues(components, data.responses)
      form.setFieldsValue(values)
    }
    isInitializedRef.current = true
  }, [components, data.responses, form])

  // Call open on mount
  useEffect(() => {
    openTestInstance(instanceId)
  }, [instanceId])

  // Auto-save on value changes
  useEffect(() => {
    if (!isInitializedRef.current || !watchedValues) return

    const serialized = JSON.stringify(watchedValues)
    if (serialized === lastSavedRef.current) return

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      const responses = buildResponses()
      const hasContent = responses.some(
        (r) => r.answer !== null || (r.textAnswer !== null && r.textAnswer !== ''),
      )
      if (!hasContent) return

      setSaveStatus('saving')
      const result = await saveTestResponses(instanceId, { responses })
      if (result.success) {
        lastSavedRef.current = serialized
        setSaveStatus('saved')
      } else {
        setSaveStatus('idle')
      }
    }, AUTO_SAVE_DELAY_MS)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [watchedValues, instanceId, buildResponses])

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

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)

      const response = await submitTestInstance(instanceId, {
        responses,
        completedAt: new Date().toISOString(),
      })
      if (!response.success) {
        message.error(response.error || 'Unable to submit test')
        return
      }
      message.success('Test submitted')
      navigate('/employee/tests')
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message)
      }
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      <Affix offsetTop={0}>
        <Card>
          <div className="flex flex-col gap-4 w-full">
            <div className="flex items-center justify-between">
              <Typography.Title level={4}>{data.test.name}</Typography.Title>
              {saveStatus === 'saving' && <Spin size="small" />}
              {saveStatus === 'saved' && <CheckCircleOutlined />}
            </div>
            <Progress percent={progressPercent} />
            <div className="flex w-full justify-between gap-4">
              {sections.length > 1 && (
                <Typography.Text type="secondary">
                  Section {currentSectionIndex + 1} of {sections.length}
                </Typography.Text>
              )}
              {data.instance.expiresAt && timeRemaining ? (
                <Typography.Text type="secondary">Due {timeRemaining}</Typography.Text>
              ) : null}
            </div>
          </div>
        </Card>
      </Affix>
      <Form form={form} layout="vertical">
        <Card>
          {sections.map((section, index) => (
            <div
              key={section.id}
              className={`test-section ${index !== currentSectionIndex ? 'test-section-hidden' : ''}`}
            >
              <div className="flex flex-col w-full gap-4">
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
                      {renderComponentInput(component)}
                    </Form.Item>
                  )
                })}
              </div>
            </div>
          ))}
          <div className="flex w-full justify-between gap-4 mt-4">
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
          </div>
        </Card>
      </Form>
    </div>
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
          <div className="flex flex-col gap-4 w-full">
            <Typography.Title level={4}>{data.test.name}</Typography.Title>
            <Typography.Text type="secondary">
              This test has already been completed.
            </Typography.Text>
            <div className="flex gap-4">
              <Button
                type="primary"
                onClick={() => navigate(`/employee/test-results/${data.instance.id}`)}
              >
                View answers
              </Button>
              <Button onClick={() => navigate('/employee/tests')}>
                Back to My tests
              </Button>
            </div>
          </div>
        </Card>
      </EmployeeLayout>
    )
  }

  if (data.instance.status === 'expired') {
    return (
      <EmployeeLayout>
        <Card>
          <div className="flex flex-col gap-4 w-full">
            <Typography.Title level={4}>{data.test.name}</Typography.Title>
            <Typography.Text type="secondary">
              This test has expired and can no longer be completed.
            </Typography.Text>
            <Button onClick={() => navigate('/employee/tests')}>Back to My tests</Button>
          </div>
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
