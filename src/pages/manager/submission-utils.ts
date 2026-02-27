import type { ResponseRecord, TestComponent } from '../../types'

export const buildResponseMap = (responses: ResponseRecord[]) =>
  responses.reduce((map, response) => {
    map.set(response.questionId, response)
    return map
  }, new Map<string, ResponseRecord>())

export const resolveAnswer = (
  component: TestComponent,
  response?: ResponseRecord,
): string => {
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

export const isAnswerCorrect = (
  component: TestComponent,
  response?: ResponseRecord,
  correctAnswer?: string | string[] | null,
): boolean => {
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

export const formatCorrectAnswer = (
  component: TestComponent,
  correctAnswer?: string | string[] | null,
): string | null => {
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

export interface MarkState {
  correctAnswer?: string | string[] | null
  isCorrect?: boolean | null
  note?: string
}
