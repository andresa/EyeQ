import { App, Button, Card, Input, Modal, Radio, Spin, Tag, Tabs, Typography } from 'antd'
import { useMemo, useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import ManagerLayout from '../../layouts/ManagerLayout'
import StandardPageHeading from '../../components/molecules/StandardPageHeading'
import {
  fetchTestInstanceResults,
  listEmployees,
  markTestInstance,
} from '../../services/manager'
import type { Employee, TestComponent } from '../../types'
import { useSession } from '../../hooks/useSession'
import {
  buildResponseMap,
  formatCorrectAnswer,
  isAnswerCorrect,
  type MarkState,
  resolveAnswer,
} from './submission-utils'
import StatusBadge from '../../components/atoms/StatusBadge'

const TAB_VIEW = 'view'
const TAB_MARK = 'mark'
type TabKey = typeof TAB_VIEW | typeof TAB_MARK

const SubmissionDetailPage = () => {
  const { instanceId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { message } = App.useApp()
  const { userProfile } = useSession()
  const companyId = userProfile?.companyId

  const tabFromUrl = (searchParams.get('tab') as TabKey) || TAB_VIEW
  const activeTab: TabKey = tabFromUrl === TAB_MARK ? TAB_MARK : TAB_VIEW

  const [marksOverrides, setMarksOverrides] = useState<Record<string, MarkState>>({})
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false)
  const [submitConfirmLoading, setSubmitConfirmLoading] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['manager', 'testInstanceResults', instanceId],
    queryFn: async () => {
      if (!instanceId) return null
      const response = await fetchTestInstanceResults(instanceId)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Unable to load submission')
      }
      return response.data
    },
    enabled: Boolean(instanceId),
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
    enabled: Boolean(companyId),
  })

  const responseMap = useMemo(() => buildResponseMap(data?.responses || []), [data])
  const componentMap = useMemo(() => {
    if (!data) return new Map<string, TestComponent>()
    return data.test.sections.reduce((map, section) => {
      section.components.forEach((component) => {
        map.set(component.id, component)
      })
      return map
    }, new Map<string, TestComponent>())
  }, [data])

  const employeeMap = useMemo(
    () =>
      (employees || []).reduce<Record<string, string>>((map, employee) => {
        map[employee.id] = `${employee.firstName} ${employee.lastName}`
        return map
      }, {}),
    [employees],
  )

  const initialMarks = useMemo(() => {
    if (!data) return {}
    const initial: Record<string, MarkState> = {}
    data.test.sections.forEach((section) => {
      section.components.forEach((component) => {
        if (component.type === 'info') return
        const response = responseMap.get(component.id)
        const presetCorrectAnswer =
          response?.correctAnswer ?? component.correctAnswer ?? null
        const presetIsCorrect =
          response?.isCorrect ??
          (presetCorrectAnswer
            ? isAnswerCorrect(component, response, presetCorrectAnswer)
            : null)
        initial[component.id] = {
          correctAnswer:
            presetCorrectAnswer ?? (component.type === 'multiple_choice' ? [] : null),
          isCorrect: presetIsCorrect,
          note: response?.note ?? '',
        }
      })
    })
    return initial
  }, [data, responseMap])

  const marks = useMemo(
    () => ({
      ...initialMarks,
      ...marksOverrides,
    }),
    [initialMarks, marksOverrides],
  )

  const unmarkedCount = useMemo(
    () =>
      Object.values(marks).filter(
        (m) => m.isCorrect === undefined || m.isCorrect === null,
      ).length,
    [marks],
  )

  const updateMark = (questionId: string, updates: Partial<MarkState>) => {
    setMarksOverrides((prev) => ({
      ...prev,
      [questionId]: {
        ...(initialMarks[questionId] || {}),
        ...prev[questionId],
        ...updates,
      },
    }))
  }

  const scrollToTop = () => {
    const mainScroll = document.querySelector('[data-main-scroll]')
    if (mainScroll) {
      mainScroll.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  useEffect(() => {
    scrollToTop()
  }, [activeTab])

  const handleTabChange = (key: string) => {
    setSearchParams({ tab: key })
  }

  const doSubmitMarks = async () => {
    if (!instanceId || !data) return
    setSubmitConfirmLoading(true)
    try {
      const marksPayload = Object.entries(marks).map(([questionId, mark]) => {
        const component = componentMap.get(questionId)
        const response = responseMap.get(questionId)
        const correctAnswer = mark.correctAnswer ?? component?.correctAnswer ?? null
        const isCorrect =
          mark.isCorrect ??
          (component && component.type !== 'text'
            ? isAnswerCorrect(component, response, correctAnswer)
            : null)
        return {
          questionId,
          isCorrect,
          note: mark.note?.trim() || null,
          correctAnswer,
        }
      })
      const response = await markTestInstance(instanceId, {
        marks: marksPayload,
        markedByManagerId:
          userProfile?.userType === 'manager' ? userProfile.id : undefined,
      })
      if (!response.success) {
        message.error(response.error || 'Unable to submit marks')
        return
      }
      setSubmitConfirmOpen(false)
      message.success('Marks saved')
      navigate('/manager/test-submissions')
    } finally {
      setSubmitConfirmLoading(false)
    }
  }

  const handleSubmit = () => {
    if (unmarkedCount > 0) {
      setSubmitConfirmOpen(true)
    } else {
      doSubmitMarks()
    }
  }

  const testSubmissionsPath = '/manager/test-submissions'

  if (isLoading || !data) {
    return (
      <ManagerLayout
        pageHeading={
          <StandardPageHeading
            title={
              <Typography.Title type="secondary" level={4}>
                Loading...
              </Typography.Title>
            }
            backTo={testSubmissionsPath}
          />
        }
      >
        <div className="flex justify-center items-center h-full">
          <Spin />
        </div>
      </ManagerLayout>
    )
  }

  const tabItems = [
    {
      key: TAB_VIEW,
      label: 'View answers',
      children: (
        <div className="flex flex-col gap-6 w-full">
          {data.test.sections.map((section) => (
            <Card key={section.id} title={section.title}>
              <div className="flex flex-col gap-4 w-full">
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
              </div>
            </Card>
          ))}
          <div className="flex gap-4 justify-end">
            <Button type="primary" onClick={() => handleTabChange(TAB_MARK)}>
              Mark Answers
            </Button>
          </div>
        </div>
      ),
    },
    {
      key: TAB_MARK,
      label: 'Mark answers',
      children: (
        <div className="flex flex-col gap-6 w-full">
          {data.test.sections.map((section) => (
            <Card key={section.id} title={section.title}>
              <div className="flex flex-col gap-4 w-full">
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
                  const mark = marks[component.id]
                  const correctAnswer = mark?.correctAnswer ?? null
                  const isCorrectValue = mark?.isCorrect ?? false
                  const correctAnswerLabel = formatCorrectAnswer(component, correctAnswer)

                  return (
                    <Card key={component.id} type="inner">
                      <div className="flex flex-col gap-4 w-full">
                        <Typography.Text strong>{component.title}</Typography.Text>
                        <Typography.Paragraph type="secondary">
                          {component.description}
                        </Typography.Paragraph>
                        <Typography.Text>
                          Employee answer: {resolveAnswer(component, response)}
                        </Typography.Text>
                        {correctAnswerLabel ? (
                          <Typography.Text type="secondary">
                            Correct answer: {correctAnswerLabel}
                          </Typography.Text>
                        ) : null}
                        <div className="flex gap-4">
                          {isCorrectValue ? (
                            <Tag color="green">Correct</Tag>
                          ) : (
                            <Tag color="red">Incorrect</Tag>
                          )}
                        </div>
                        <Radio.Group
                          value={mark?.isCorrect ?? undefined}
                          onChange={(event) =>
                            updateMark(component.id, {
                              isCorrect: event.target.value,
                            })
                          }
                        >
                          <div className="flex gap-4">
                            <Radio value={true}>Correct</Radio>
                            <Radio value={false}>Incorrect</Radio>
                          </div>
                        </Radio.Group>
                        <Input.TextArea
                          rows={2}
                          placeholder="Add note (optional)"
                          value={mark?.note}
                          onChange={(event) =>
                            updateMark(component.id, {
                              note: event.target.value,
                            })
                          }
                        />
                      </div>
                    </Card>
                  )
                })}
              </div>
            </Card>
          ))}
          <div className="flex gap-4 justify-end">
            <Button type="primary" onClick={handleSubmit}>
              Submit Marks
            </Button>
          </div>
        </div>
      ),
    },
  ]

  return (
    <ManagerLayout
      pageHeading={
        <StandardPageHeading title={data.test.name} backTo={testSubmissionsPath} />
      }
    >
      <div className="flex flex-col gap-6 w-full">
        <Card>
          <div className="flex justify-between">
            <div className="flex items-center gap-1">
              <Typography.Text strong>Employee:</Typography.Text>
              <Typography.Text>
                {employeeMap[data.instance.employeeId] || data.instance.employeeId}
              </Typography.Text>
            </div>
            <div className="flex items-center gap-1">
              <Typography.Text strong>Status:</Typography.Text>
              <StatusBadge status={data.instance.status} />
            </div>
          </div>
        </Card>
        <Tabs activeKey={activeTab} onChange={handleTabChange} items={tabItems} />
        <Modal
          title="Unmarked questions"
          open={submitConfirmOpen}
          onOk={() => doSubmitMarks()}
          onCancel={() => setSubmitConfirmOpen(false)}
          okText="Submit anyway"
          cancelText="Cancel"
          confirmLoading={submitConfirmLoading}
        >
          <Typography.Paragraph>
            {unmarkedCount} question{unmarkedCount === 1 ? '' : 's'} have not been marked
            yet. Are you sure you want to submit?
          </Typography.Paragraph>
        </Modal>
      </div>
    </ManagerLayout>
  )
}

export default SubmissionDetailPage
