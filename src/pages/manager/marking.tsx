import { App, Button, Card, Input, Radio, Tag, Typography } from 'antd'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import ManagerLayout from '../../layouts/ManagerLayout'
import { fetchTestInstanceResults, markTestInstance } from '../../services/manager'
import type { ResponseRecord, TestComponent } from '../../types'
import { useSession } from '../../hooks/useSession'

interface MarkState {
  correctAnswer?: string | string[] | null
  isCorrect?: boolean | null
  note?: string
}

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

const isAnswerCorrect = (
  component: TestComponent,
  response?: ResponseRecord,
  correctAnswer?: string | string[] | null,
) => {
  if (!response) return false
  if (component.type === 'text') {
    return response.isCorrect ?? false
  }
  if (!correctAnswer) return false
  const employeeAnswer = response.answer
  if (component.type === 'single_choice') {
    return employeeAnswer === correctAnswer
  }
  if (component.type === 'multiple_choice') {
    if (!Array.isArray(employeeAnswer) || !Array.isArray(correctAnswer)) return false
    const left = [...employeeAnswer].sort()
    const right = [...correctAnswer].sort()
    return (
      left.length === right.length && left.every((value, index) => value === right[index])
    )
  }
  return false
}

const formatCorrectAnswer = (
  component: TestComponent,
  correctAnswer?: string | string[] | null,
) => {
  if (!correctAnswer) return null
  if (!component.options)
    return Array.isArray(correctAnswer) ? correctAnswer.join(', ') : correctAnswer
  if (Array.isArray(correctAnswer)) {
    return correctAnswer
      .map(
        (optionId) => component.options?.find((option) => option.id === optionId)?.label,
      )
      .filter(Boolean)
      .join(', ')
  }
  return (
    component.options.find((option) => option.id === correctAnswer)?.label ||
    correctAnswer
  )
}

const MarkingPage = () => {
  const { instanceId } = useParams()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const { userProfile } = useSession()
  const [marksOverrides, setMarksOverrides] = useState<Record<string, MarkState>>({})

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

  const handleSubmit = async () => {
    if (!instanceId) return
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
      markedByManagerId: userProfile?.userType === 'manager' ? userProfile.id : undefined,
    })
    if (!response.success) {
      message.error(response.error || 'Unable to submit marks')
      return
    }
    message.success('Marks saved')
    navigate(`/manager/test-submissions/${data?.test.id}`)
  }

  if (isLoading || !data) {
    return (
      <ManagerLayout>
        <Typography.Text>Loading submission...</Typography.Text>
      </ManagerLayout>
    )
  }

  return (
    <ManagerLayout>
      <div className="flex flex-col gap-6 w-full">
        <Typography.Title level={3}>Mark submission</Typography.Title>
        <Card>
          <div className="flex flex-col gap-4">
            <Typography.Text strong>{data.test.name}</Typography.Text>
            <Typography.Text type="secondary">
              Submission: {data.instance.id}
            </Typography.Text>
          </div>
        </Card>
        {data.test.sections.map((section) => (
          <Card key={section.id} title={section.title}>
            <div className="flex flex-col gap-4 w-full">
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
                          updateMark(component.id, { note: event.target.value })
                        }
                      />
                    </div>
                  </Card>
                )
              })}
            </div>
          </Card>
        ))}
        <div className="flex gap-4">
          <Button onClick={() => navigate(`/manager/test-submissions/${data.test.id}`)}>
            Cancel
          </Button>
          <Button type="primary" onClick={handleSubmit}>
            Submit marks
          </Button>
        </div>
      </div>
    </ManagerLayout>
  )
}

export default MarkingPage
