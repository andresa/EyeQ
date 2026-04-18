import { useState } from 'react'
import { Spin } from 'antd'
import { getSessionToken } from '../../services/api'

interface QuestionImageProps {
  imageId?: string | null
  compact?: boolean
}

const QuestionImage = ({ imageId, compact }: QuestionImageProps) => {
  const [loaded, setLoaded] = useState(false)

  if (!imageId) return null
  const token = getSessionToken()
  const base = `/api/images/${encodeURIComponent(imageId)}`
  const src = token ? `${base}?token=${encodeURIComponent(token)}` : base

  return (
    <div className={compact ? 'flex items-center' : 'flex items-center justify-center'}>
      {!loaded && <Spin size={compact ? 'small' : 'default'} />}
      <img
        src={src}
        alt={compact ? 'Option graphic' : 'Question graphic'}
        className={`max-w-full rounded-lg object-contain ${compact ? 'max-h-[100px]' : 'max-h-[400px]'}`}
        style={loaded ? undefined : { width: 0, height: 0, overflow: 'hidden' }}
        onLoad={() => setLoaded(true)}
      />
    </div>
  )
}

export default QuestionImage
