import type { ComponentType } from '../../types'
import { getQuestionTypeIcon, getQuestionTypeLabel } from '../../utils/questions'

export const QuestionTypeTag = ({ type }: { type: ComponentType }) => (
  <div className={`bg-black text-white rounded-[4px] py-1 px-2 w-fit`}>
    <div className="flex items-center">
      {getQuestionTypeIcon(type, 16)}
      <span className="ml-2 text-sm">{getQuestionTypeLabel(type)}</span>
    </div>
  </div>
)
