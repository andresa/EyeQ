import type { ComponentType } from '../types'
import { CheckCircle, CheckSquare, FileText, Info } from 'lucide-react'

export const questionTypeLabels: { value: ComponentType; label: string }[] = [
  { value: 'single_choice', label: 'Single Choice' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'text', label: 'Text Response' },
  { value: 'info', label: 'Info Block' },
]

export const questionTypeColors: Record<ComponentType, string> = {
  single_choice: 'blue',
  multiple_choice: 'purple',
  text: 'green',
  info: 'default',
}

export const getQuestionTypeLabel = (type: ComponentType) => {
  switch (type) {
    case 'single_choice':
      return questionTypeLabels[0].label
    case 'multiple_choice':
      return questionTypeLabels[1].label
    case 'text':
      return questionTypeLabels[2].label
    case 'info':
      return questionTypeLabels[3].label
    default:
      return ''
  }
}
export const getQuestionTypeIcon = (type: ComponentType, size: number = 16) => {
  switch (type) {
    case 'single_choice':
      return <CheckCircle size={size} />
    case 'multiple_choice':
      return <CheckSquare size={size} />
    case 'text':
      return <FileText size={size} />
    case 'info':
      return <Info size={size} />
  }
}
