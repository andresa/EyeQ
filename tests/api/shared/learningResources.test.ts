import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockContainer } from '../../helpers/api-helpers'

const { container: mockContainer } = createMockContainer()

vi.mock('../../../api/shared/cosmos', () => ({
  getContainer: vi.fn().mockImplementation(() => Promise.resolve(mockContainer)),
}))

import {
  getLearningResourcesSettingsDoc,
  getLearningResourcesSettings,
  DEFAULT_LEARNING_RESOURCES_SETTINGS,
} from '../../../api/shared/learningResources'

describe('shared/learningResources', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('getLearningResourcesSettingsDoc', () => {
    it('returns the doc when found', async () => {
      const doc = {
        id: 'lrs_1',
        companyId: 'c1',
        articlesEnabled: true,
        flashCardsEnabled: false,
        updatedAt: '2025-01-01T00:00:00.000Z',
        updatedBy: 'mgr_1',
      }
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [doc] }),
      })

      const result = await getLearningResourcesSettingsDoc('c1')
      expect(result).toEqual(doc)
    })

    it('returns undefined when not found', async () => {
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
      })

      const result = await getLearningResourcesSettingsDoc('c1')
      expect(result).toBeUndefined()
    })
  })

  describe('getLearningResourcesSettings', () => {
    it('returns doc values when found', async () => {
      const doc = {
        id: 'lrs_1',
        companyId: 'c1',
        articlesEnabled: true,
        flashCardsEnabled: true,
        updatedAt: '2025-01-01T00:00:00.000Z',
        updatedBy: 'mgr_1',
      }
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [doc] }),
      })

      const result = await getLearningResourcesSettings('c1')
      expect(result).toEqual({
        articlesEnabled: true,
        flashCardsEnabled: true,
      })
    })

    it('returns defaults when not found', async () => {
      mockContainer.items.query.mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
      })

      const result = await getLearningResourcesSettings('c1')
      expect(result).toEqual(DEFAULT_LEARNING_RESOURCES_SETTINGS)
    })
  })
})
