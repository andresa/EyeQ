import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions'
import { getContainer } from '../shared/cosmos.js'
import { getAuthenticatedUser, requireManager } from '../shared/auth.js'
import { jsonResponse, parseJsonBody } from '../shared/http.js'
import {
  LEARNING_RESOURCES_SETTINGS_CONTAINER,
  LEARNING_RESOURCES_SETTINGS_PARTITION_KEY,
  type LearningResourcesSettingsDoc,
  getLearningResourcesSettings,
  getLearningResourcesSettingsDoc,
} from '../shared/learningResources.js'
import { createId, nowIso } from '../shared/utils.js'

interface UpdateSettingsBody {
  companyId?: string
  articlesEnabled?: boolean
  flashCardsEnabled?: boolean
}

export const getLearningResourcesSettingsHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const companyId = request.query.get('companyId')
  if (!companyId) {
    return jsonResponse(400, { success: false, error: 'companyId is required.' })
  }

  const settings = await getLearningResourcesSettings(companyId)
  return jsonResponse(200, { success: true, data: settings })
}

export const updateLearningResourcesSettingsHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const user = await getAuthenticatedUser(request)
  const authError = requireManager(user)
  if (authError) return authError

  const body = await parseJsonBody<UpdateSettingsBody>(request)
  if (
    !body?.companyId ||
    typeof body.articlesEnabled !== 'boolean' ||
    typeof body.flashCardsEnabled !== 'boolean'
  ) {
    return jsonResponse(400, {
      success: false,
      error: 'companyId, articlesEnabled, and flashCardsEnabled are required.',
    })
  }

  if (user!.role !== 'admin' && user!.companyId !== body.companyId) {
    return jsonResponse(403, {
      success: false,
      error: 'You can only update settings for your own company.',
    })
  }

  const container = await getContainer(
    LEARNING_RESOURCES_SETTINGS_CONTAINER,
    LEARNING_RESOURCES_SETTINGS_PARTITION_KEY,
  )
  const existing = await getLearningResourcesSettingsDoc(body.companyId)

  if (existing) {
    const updated: LearningResourcesSettingsDoc = {
      ...existing,
      articlesEnabled: body.articlesEnabled,
      flashCardsEnabled: body.flashCardsEnabled,
      updatedAt: nowIso(),
      updatedBy: user!.id,
    }
    await container.item(existing.id, body.companyId).replace(updated)
    return jsonResponse(200, {
      success: true,
      data: {
        articlesEnabled: updated.articlesEnabled,
        flashCardsEnabled: updated.flashCardsEnabled,
      },
    })
  }

  const doc: LearningResourcesSettingsDoc = {
    id: createId('lrs'),
    companyId: body.companyId,
    articlesEnabled: body.articlesEnabled,
    flashCardsEnabled: body.flashCardsEnabled,
    updatedAt: nowIso(),
    updatedBy: user!.id,
  }

  await container.items.create(doc)
  return jsonResponse(200, {
    success: true,
    data: {
      articlesEnabled: doc.articlesEnabled,
      flashCardsEnabled: doc.flashCardsEnabled,
    },
  })
}

app.http('managerLearningResourcesSettings', {
  methods: ['GET', 'PUT'],
  authLevel: 'anonymous',
  route: 'manager/learning-resources-settings',
  handler: async (request) => {
    const user = await getAuthenticatedUser(request)
    const authError = requireManager(user)
    if (authError) return authError

    if (request.method === 'GET') {
      const companyId = request.query.get('companyId')
      if (user!.role !== 'admin' && user!.companyId !== companyId) {
        return jsonResponse(403, {
          success: false,
          error: 'You can only view settings for your own company.',
        })
      }

      return getLearningResourcesSettingsHandler(request)
    }

    return updateLearningResourcesSettingsHandler(request)
  },
})
