import { useState, useCallback, useRef, useEffect } from 'react'
import { App, Button, Spin } from 'antd'
import { ImagePlus, Trash2 } from 'lucide-react'
import imageCompression from 'browser-image-compression'
import { getImageUploadUrl, uploadImageToBlob } from '../../services/manager'
import { getSessionToken } from '../../services/api'

const MAX_FILE_SIZE_MB = 5
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

interface ImageUploadProps {
  imageId: string | null | undefined
  companyId?: string
  onChange: (imageId: string | null) => void
  disabled?: boolean
}

const ImageUpload = ({ imageId, companyId, onChange, disabled }: ImageUploadProps) => {
  const { message } = App.useApp()
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setImageLoaded(false)
  }, [imageId])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!companyId) {
        message.error('Company context is missing')
        return
      }

      if (!ACCEPTED_TYPES.includes(file.type)) {
        message.error('Only PNG, JPEG, and WebP images are supported.')
        return
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        message.error(`File is too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`)
        return
      }

      const preview = URL.createObjectURL(file)
      setPreviewUrl(preview)
      setUploading(true)

      try {
        const compressed = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        })

        const contentType = compressed.type || 'image/webp'
        const res = await getImageUploadUrl({ companyId, contentType })
        if (!res.success || !res.data) {
          throw new Error(res.error || 'Failed to get upload URL')
        }

        await uploadImageToBlob(res.data.uploadUrl, compressed, contentType)
        onChange(res.data.imageId)
      } catch (err) {
        message.error(err instanceof Error ? err.message : 'Image upload failed')
        onChange(null)
      } finally {
        URL.revokeObjectURL(preview)
        setPreviewUrl(null)
        setUploading(false)
      }
    },
    [companyId, message, onChange],
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleRemove = () => {
    onChange(null)
    setPreviewUrl(null)
  }

  const buildImageUrl = (id: string) => {
    const token = getSessionToken()
    const base = `/api/images/${encodeURIComponent(id)}`
    return token ? `${base}?token=${encodeURIComponent(token)}` : base
  }

  const displayUrl = previewUrl || (imageId ? buildImageUrl(imageId) : null)

  if (displayUrl) {
    return (
      <div className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
        <div className="flex items-center justify-center min-h-[120px]">
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
              <Spin description="Uploading..." />
            </div>
          )}
          {!imageLoaded && !previewUrl && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Spin size="small" />
            </div>
          )}
          <img
            src={displayUrl}
            alt="Question graphic"
            className="max-w-full max-h-[300px] object-contain"
            onLoad={() => setImageLoaded(true)}
          />
        </div>
        {!uploading && !disabled && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="small"
              danger
              icon={<Trash2 size={14} />}
              onClick={handleRemove}
              aria-label="Remove image"
            >
              Remove
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="hidden"
        onChange={handleInputChange}
      />
      <div
        role="button"
        tabIndex={0}
        onClick={() => !disabled && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
        }}
        className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors text-gray-500 text-sm"
      >
        <ImagePlus size={16} />
        <span>Add image (max {MAX_FILE_SIZE_MB} MB)</span>
      </div>
    </>
  )
}

export default ImageUpload
