import { getContainer } from './cosmos.js'

export interface LearningResourcesSettingsDoc {
  id: string
  companyId: string
  articlesEnabled: boolean
  flashCardsEnabled: boolean
  updatedAt: string
  updatedBy: string
}

export const LEARNING_RESOURCES_SETTINGS_CONTAINER = 'learningResourcesSettings'
export const LEARNING_RESOURCES_SETTINGS_PARTITION_KEY = '/companyId'

export interface LearningResourcesSettingsData {
  articlesEnabled: boolean
  flashCardsEnabled: boolean
}

export const DEFAULT_LEARNING_RESOURCES_SETTINGS: LearningResourcesSettingsData = {
  articlesEnabled: false,
  flashCardsEnabled: false,
}

export const getLearningResourcesSettingsDoc = async (
  companyId: string,
): Promise<LearningResourcesSettingsDoc | undefined> => {
  const container = await getContainer(
    LEARNING_RESOURCES_SETTINGS_CONTAINER,
    LEARNING_RESOURCES_SETTINGS_PARTITION_KEY,
  )
  const { resources } = await container.items
    .query({
      query: 'SELECT * FROM c WHERE c.companyId = @companyId',
      parameters: [{ name: '@companyId', value: companyId }],
    })
    .fetchAll()

  return resources[0] as LearningResourcesSettingsDoc | undefined
}

export const getLearningResourcesSettings = async (
  companyId: string,
): Promise<LearningResourcesSettingsData> => {
  const doc = await getLearningResourcesSettingsDoc(companyId)
  return {
    articlesEnabled:
      doc?.articlesEnabled ?? DEFAULT_LEARNING_RESOURCES_SETTINGS.articlesEnabled,
    flashCardsEnabled:
      doc?.flashCardsEnabled ?? DEFAULT_LEARNING_RESOURCES_SETTINGS.flashCardsEnabled,
  }
}
