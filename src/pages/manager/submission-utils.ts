import { IMAGE_ONLY_LABEL, type ResponseRecord, type TestComponent } from '../../types'

const getOptionLabel = (option: { label: string; imageId?: string | null }) =>
  option.label || (option.imageId ? IMAGE_ONLY_LABEL : '')

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
      .map((optionId) => {
        const option = component.options?.find((o) => o.id === optionId)
        return option ? getOptionLabel(option) : undefined
      })
      .filter(Boolean)
      .join(', ')
  }
  if (typeof rawAnswer === 'string') {
    if (!component.options) return rawAnswer
    const option = component.options.find((o) => o.id === rawAnswer)
    return option ? getOptionLabel(option) : rawAnswer
  }
  return 'No response'
}

export const getAnswerOptionImageIds = (
  component: TestComponent,
  response?: ResponseRecord,
): string[] => {
  if (!response || !component.options) return []
  const rawAnswer = response.answer
  const answerIds = Array.isArray(rawAnswer)
    ? rawAnswer
    : typeof rawAnswer === 'string'
      ? [rawAnswer]
      : []
  return answerIds
    .map((id) => component.options?.find((o) => o.id === id)?.imageId)
    .filter((imageId): imageId is string => !!imageId)
}

export const getCorrectAnswerImageIds = (
  component: TestComponent,
  correctAnswer?: string | string[] | null,
): string[] => {
  if (!correctAnswer || !component.options) return []
  const answerIds = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer]
  return answerIds
    .map((id) => component.options?.find((o) => o.id === id)?.imageId)
    .filter((imageId): imageId is string => !!imageId)
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
      .map((optionId) => {
        const option = component.options?.find((o) => o.id === optionId)
        return option ? getOptionLabel(option) : undefined
      })
      .filter(Boolean)
      .join(', ')
  }
  const option = component.options.find((o) => o.id === correctAnswer)
  return option ? getOptionLabel(option) : correctAnswer
}

export interface MarkState {
  correctAnswer?: string | string[] | null
  isCorrect?: boolean | null
  note?: string
}
