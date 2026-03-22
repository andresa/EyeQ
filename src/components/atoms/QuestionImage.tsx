import { useState } from 'react'
import { Spin } from 'antd'
import { getSessionToken } from '../../services/api'

const QuestionImage = ({ imageId }: { imageId?: string | null }) => {
  const [loaded, setLoaded] = useState(false)

  if (!imageId) return null
  const token = getSessionToken()
  const base = `/api/images/${encodeURIComponent(imageId)}`
  const src = token ? `${base}?token=${encodeURIComponent(token)}` : base

  return (
    <div className="flex items-center justify-center">
      {!loaded && <Spin />}
      <img
        src={src}
        alt="Question graphic"
        className="max-h-[400px] max-w-full rounded-lg object-contain"
        style={loaded ? undefined : { width: 0, height: 0, overflow: 'hidden' }}
        onLoad={() => setLoaded(true)}
      />
    </div>
  )
}

export default QuestionImage
