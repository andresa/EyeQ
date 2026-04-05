import {
  App,
  Button,
  Card,
  Drawer,
  Grid,
  Input,
  Modal,
  Segmented,
  Spin,
  Tabs,
  Tooltip,
  Typography,
} from 'antd'
import { useMemo, useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Circle, CircleCheck, CircleX, History, Info, MessageSquare } from 'lucide-react'
import ManagerLayout from '../../layouts/ManagerLayout'
import RichText from '../../components/atoms/RichText'
import StandardPageHeading from '../../components/molecules/StandardPageHeading'
import SubmissionHistoryColumn from '../../components/molecules/SubmissionHistoryColumn'
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
import QuestionImage from '../../components/atoms/QuestionImage'
import { formatUserName } from '../../utils/formatUserName'

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
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false)
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md

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
        map[employee.id] = formatUserName(employee)
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

  useEffect(() => {
    const withNotes = new Set<string>()
    for (const [id, mark] of Object.entries(initialMarks)) {
      if (mark.note) withNotes.add(id)
    }
    if (withNotes.size > 0) {
      setExpandedNotes((prev) => {
        const next = new Set(prev)
        for (const id of withNotes) next.add(id)
        return next
      })
    }
  }, [initialMarks])

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

  const liveScore = useMemo(() => {
    const entries = Object.values(marks)
    const total = entries.length
    const correct = entries.filter((m) => m.isCorrect === true).length
    const incorrect = entries.filter((m) => m.isCorrect === false).length
    const marked = correct + incorrect
    const percent = marked > 0 ? Math.round((correct / marked) * 100) : 0
    return { total, correct, incorrect, marked, percent }
  }, [marks])

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
                        <div className="flex flex-col gap-1">
                          <Typography.Text strong>
                            <RichText content={component.title} />
                          </Typography.Text>
                          <Typography.Paragraph>
                            <RichText content={component.description} />
                          </Typography.Paragraph>
                        </div>
                        <div className="max-w-[400px]">
                          <QuestionImage imageId={component.imageId} />
                        </div>
                      </Card>
                    )
                  }
                  const response = responseMap.get(component.id)
                  return (
                    <Card key={component.id} type="inner">
                      <div className="flex flex-col gap-4 w-full">
                        <div className="flex flex-col gap-1">
                          <Typography.Text strong>
                            <RichText content={component.title} />
                          </Typography.Text>
                          <Typography.Paragraph type="secondary">
                            <RichText content={component.description} />
                          </Typography.Paragraph>
                        </div>
                        <div className="max-w-[400px]">
                          <QuestionImage imageId={component.imageId} />
                        </div>
                        <div className="flex flex-col gap-1">
                          <Typography.Text strong>Employee answer</Typography.Text>
                          <Typography.Text>
                            {resolveAnswer(component, response)}
                          </Typography.Text>
                        </div>
                      </div>
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
                        <div className="flex flex-col gap-4 w-full">
                          <div className="flex flex-col gap-1">
                            <Typography.Text strong>
                              <RichText content={component.title} />
                            </Typography.Text>
                            <Typography.Paragraph>
                              <RichText content={component.description} />
                            </Typography.Paragraph>
                          </div>
                          <div className="max-w-[400px]">
                            <QuestionImage imageId={component.imageId} />
                          </div>
                        </div>
                      </Card>
                    )
                  }

                  const response = responseMap.get(component.id)
                  const mark = marks[component.id]
                  const correctAnswer = mark?.correctAnswer ?? null
                  const correctAnswerLabel = formatCorrectAnswer(component, correctAnswer)

                  return (
                    <Card
                      key={component.id}
                      type="inner"
                      style={{
                        borderLeft:
                          mark?.isCorrect === true
                            ? '3px solid #52c41a'
                            : mark?.isCorrect === false
                              ? '3px solid #ff4d4f'
                              : '3px solid #faad14',
                      }}
                    >
                      <div className="flex flex-col md:flex-row gap-6 w-full">
                        <div className="flex flex-col gap-3 flex-1 min-w-0">
                          <div className="flex flex-col gap-1">
                            <Typography.Text strong>
                              <RichText content={component.title} />
                            </Typography.Text>
                            <Typography.Paragraph type="secondary">
                              <RichText content={component.description} />
                            </Typography.Paragraph>
                            <div className="max-w-[400px]">
                              <QuestionImage imageId={component.imageId} />
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Typography.Text strong>Employee answer</Typography.Text>
                            <Typography.Text>
                              {resolveAnswer(component, response)}
                            </Typography.Text>
                          </div>
                          {correctAnswerLabel ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <Typography.Text strong>Correct answer</Typography.Text>
                                <Tooltip title="This answer was provided as the correct answer when the question was created.">
                                  <Info size={16} className="text-gray-400" />
                                </Tooltip>
                              </div>
                              <Typography.Text type="secondary">
                                {correctAnswerLabel}
                              </Typography.Text>
                            </div>
                          ) : null}
                        </div>
                        <div className="flex flex-col gap-3 shrink-0 self-start">
                          <Segmented
                            value={
                              mark?.isCorrect === true
                                ? 'correct'
                                : mark?.isCorrect === false
                                  ? 'incorrect'
                                  : 'unmarked'
                            }
                            onChange={(val) =>
                              updateMark(component.id, {
                                isCorrect:
                                  val === 'correct'
                                    ? true
                                    : val === 'incorrect'
                                      ? false
                                      : null,
                              })
                            }
                            options={[
                              {
                                label: (
                                  <div className="flex items-center gap-1.5">
                                    <CircleCheck size={14} className="text-green-500" />
                                    Correct
                                  </div>
                                ),
                                value: 'correct',
                              },
                              {
                                label: (
                                  <div className="flex items-center gap-1.5">
                                    <CircleX size={14} className="text-red-500" />
                                    Incorrect
                                  </div>
                                ),
                                value: 'incorrect',
                              },
                              {
                                label: (
                                  <div className="flex items-center gap-1.5">
                                    <Circle size={14} className="text-yellow-500" />
                                    Unmarked
                                  </div>
                                ),
                                value: 'unmarked',
                              },
                            ]}
                          />
                          {expandedNotes.has(component.id) || mark?.note ? (
                            <Input.TextArea
                              rows={2}
                              placeholder="Add note (optional)"
                              value={mark?.note}
                              // eslint-disable-next-line jsx-a11y/no-autofocus
                              autoFocus={!mark?.note}
                              onChange={(event) =>
                                updateMark(component.id, {
                                  note: event.target.value,
                                })
                              }
                            />
                          ) : (
                            <Button
                              type="link"
                              className="self-start !px-0"
                              icon={<MessageSquare size={14} />}
                              onClick={() =>
                                setExpandedNotes((prev) =>
                                  new Set(prev).add(component.id),
                                )
                              }
                            >
                              Add note
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </Card>
          ))}
          <div className="flex items-center justify-between">
            <Typography.Text type="secondary">
              {unmarkedCount > 0
                ? `${unmarkedCount} question${unmarkedCount === 1 ? '' : 's'} remaining`
                : 'All questions marked'}
            </Typography.Text>
            <Button type="primary" onClick={handleSubmit}>
              Submit Marks
            </Button>
          </div>
        </div>
      ),
    },
  ]

  const employeeName = employeeMap[data.instance.employeeId] || (
    <Typography.Text type="secondary" italic>
      Deleted user
    </Typography.Text>
  )

  const historyColumn = (
    <SubmissionHistoryColumn
      instance={data.instance}
      employeeName={employeeName}
      liveScore={liveScore}
      isMarking={activeTab === TAB_MARK}
    />
  )

  return (
    <ManagerLayout
      pageHeading={
        <StandardPageHeading
          title={data.test.name}
          backTo={testSubmissionsPath}
          actions={
            isMobile ? (
              <Button
                type="text"
                icon={<History size={18} />}
                onClick={() => setHistoryDrawerOpen(true)}
                aria-label="History"
              />
            ) : undefined
          }
        />
      }
    >
      <div className="flex flex-row h-full min-h-0 -m-6">
        <div className="flex-1 min-w-0 overflow-y-auto p-6" data-main-scroll>
          <div className="flex flex-col gap-6 w-full max-w-7xl">
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
                {unmarkedCount} question{unmarkedCount === 1 ? '' : 's'} have not been
                marked yet. Are you sure you want to submit?
              </Typography.Paragraph>
            </Modal>
          </div>
        </div>

        {isMobile ? (
          <Drawer
            title="History"
            placement="right"
            open={historyDrawerOpen}
            onClose={() => setHistoryDrawerOpen(false)}
            size={320}
            styles={{ body: { padding: '12px' } }}
          >
            {historyColumn}
          </Drawer>
        ) : (
          <div className="w-[300px] shrink-0 border-l border-gray-200 overflow-y-auto p-4">
            {historyColumn}
          </div>
        )}
      </div>
    </ManagerLayout>
  )
}

export default SubmissionDetailPage
