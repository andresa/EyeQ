import type { ComponentType } from '../../types'
import { getQuestionTypeIcon, getQuestionTypeLabel } from '../../utils/questions'

const sizeMap = {
  small: 14,
  medium: 16,
  large: 20,
}

const paddingMap = {
  small: 'py-[2px] px-2',
  medium: 'py-[4px] px-2',
  large: 'py-[6px] px-2',
}
export const QuestionTypeTag = ({
  type,
  size = 'medium',
}: {
  type: ComponentType
  size?: 'small' | 'medium' | 'large'
}) => (
  <div className={`bg-black text-white rounded-[4px] ${paddingMap[size]} w-fit`}>
    <div className="flex items-center">
      {getQuestionTypeIcon(type, sizeMap[size])}
      <span className="ml-2 text-sm">{getQuestionTypeLabel(type)}</span>
    </div>
  </div>
)
