import { getSessionToken } from '../../services/api'

const QuestionImage = ({ imageId }: { imageId?: string | null }) => {
  if (!imageId) return null
  const token = getSessionToken()
  const base = `/api/images/${encodeURIComponent(imageId)}`
  const src = token ? `${base}?token=${encodeURIComponent(token)}` : base
  return (
    <img
      src={src}
      alt="Question graphic"
      className="max-w-full max-h-[400px] object-contain rounded-lg"
    />
  )
}

export default QuestionImage
