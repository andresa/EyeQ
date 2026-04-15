import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions'
import { generateUploadSas, generateReadSas } from '../shared/blob.js'
import { jsonResponse, parseJsonBody } from '../shared/http.js'
import { createId } from '../shared/utils.js'
import {
  getAuthenticatedUser,
  requireManager,
  authenticateByToken,
} from '../shared/auth.js'

const ALLOWED_CONTENT_TYPES = ['image/png', 'image/jpeg', 'image/webp']

interface UploadUrlBody {
  companyId?: string
  contentType?: string
}

export const uploadUrlHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const user = await getAuthenticatedUser(request)
  const authError = requireManager(user)
  if (authError) return authError

  const body = await parseJsonBody<UploadUrlBody>(request)
  if (!body?.companyId || !body.contentType) {
    return jsonResponse(400, {
      success: false,
      error: 'companyId and contentType are required.',
    })
  }

  if (!ALLOWED_CONTENT_TYPES.includes(body.contentType)) {
    return jsonResponse(400, {
      success: false,
      error: `Invalid content type. Allowed: ${ALLOWED_CONTENT_TYPES.join(', ')}`,
    })
  }

  if (user!.role !== 'admin' && user!.companyId !== body.companyId) {
    return jsonResponse(403, {
      success: false,
      error: 'You can only upload images for your own company.',
    })
  }

  const ext =
    body.contentType === 'image/png'
      ? 'png'
      : body.contentType === 'image/webp'
        ? 'webp'
        : 'jpg'
  const blobName = `${body.companyId}--${createId('img')}.${ext}`
  const { url } = generateUploadSas(blobName, body.contentType)

  return jsonResponse(200, {
    success: true,
    data: { imageId: blobName, uploadUrl: url },
  })
}

export const readImageHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const queryToken = request.query.get('token')
  const user = queryToken
    ? await authenticateByToken(queryToken)
    : await getAuthenticatedUser(request)
  if (!user) {
    return jsonResponse(401, { success: false, error: 'Authentication required.' })
  }

  const imageId = request.params.imageId
  if (!imageId) {
    return jsonResponse(400, { success: false, error: 'imageId is required.' })
  }

  const decoded = decodeURIComponent(imageId)
  const companyId = decoded.split('--')[0]
  if (!companyId) {
    return jsonResponse(400, { success: false, error: 'Invalid imageId format.' })
  }

  if (user.role !== 'admin' && user.companyId !== companyId) {
    return jsonResponse(403, {
      success: false,
      error: 'You do not have access to this image.',
    })
  }

  const { url } = generateReadSas(decoded)

  return {
    status: 302,
    headers: { Location: url },
  }
}

app.http('managerImageUploadUrl', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'manager/images/upload-url',
  handler: uploadUrlHandler,
})

app.http('imageRead', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'images/{imageId}',
  handler: readImageHandler,
})
