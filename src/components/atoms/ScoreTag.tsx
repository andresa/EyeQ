import { Tag } from 'antd'
import type { TestInstance } from '../../types'

interface ScoreTagProps {
  instance: Pick<TestInstance, 'status' | 'score'>
}

const ScoreTag = ({ instance }: ScoreTagProps) => {
  const { status, score } = instance
  if (status === 'marked' && score != null) {
    let color: string
    if (score >= 70) color = 'green'
    else if (score >= 50) color = 'orange'
    else color = 'red'
    return (
      <Tag className="w-[40px] text-center" color={color}>
        {score}
      </Tag>
    )
  }
  return (
    <Tag className="w-[40px] text-center" color="blue">
      -
    </Tag>
  )
}

export default ScoreTag
