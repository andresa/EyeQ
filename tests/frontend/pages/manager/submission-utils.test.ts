import { describe, it, expect } from 'vitest'
import {
  resolveAnswer,
  getAnswerOptionImageIds,
  getCorrectAnswerImageIds,
  formatCorrectAnswer,
} from '../../../../src/pages/manager/submission-utils'
import { mockTestComponent, mockResponseRecord } from '../../../helpers/fixtures'

describe('submission-utils', () => {
  describe('resolveAnswer', () => {
    it('returns label for single-choice option that has both label and imageId', () => {
      const component = mockTestComponent({
        type: 'single_choice',
        options: [
          { id: 'o1', label: 'Alpha', imageId: 'img_1' },
          { id: 'o2', label: 'Beta' },
        ],
      })
      const response = mockResponseRecord({ answer: 'o1' })

      expect(resolveAnswer(component, response)).toBe('Alpha')
    })

    it("returns '(image)' for single-choice option with only an imageId", () => {
      const component = mockTestComponent({
        type: 'single_choice',
        options: [
          { id: 'o1', label: '', imageId: 'img_1' },
          { id: 'o2', label: 'Beta' },
        ],
      })
      const response = mockResponseRecord({ answer: 'o1' })

      expect(resolveAnswer(component, response)).toBe('(image)')
    })

    it('joins multiple-choice answers mixing labels and image-only options', () => {
      const component = mockTestComponent({
        type: 'multiple_choice',
        options: [
          { id: 'o1', label: 'Alpha' },
          { id: 'o2', label: '', imageId: 'img_2' },
          { id: 'o3', label: 'Gamma' },
        ],
      })
      const response = mockResponseRecord({ answer: ['o1', 'o2'] })

      expect(resolveAnswer(component, response)).toBe('Alpha, (image)')
    })
  })

  describe('getAnswerOptionImageIds', () => {
    it('returns empty array when response is undefined', () => {
      const component = mockTestComponent({
        options: [{ id: 'o1', label: 'A', imageId: 'img_1' }],
      })

      expect(getAnswerOptionImageIds(component, undefined)).toEqual([])
    })

    it('returns empty array when component has no options', () => {
      const component = mockTestComponent({ options: undefined })
      const response = mockResponseRecord({ answer: 'o1' })

      expect(getAnswerOptionImageIds(component, response)).toEqual([])
    })

    it('returns empty array when selected options have no imageId', () => {
      const component = mockTestComponent({
        options: [
          { id: 'o1', label: 'A' },
          { id: 'o2', label: 'B' },
        ],
      })
      const response = mockResponseRecord({ answer: 'o1' })

      expect(getAnswerOptionImageIds(component, response)).toEqual([])
    })

    it('returns imageIds when single-choice answer maps to option with imageId', () => {
      const component = mockTestComponent({
        type: 'single_choice',
        options: [
          { id: 'o1', label: 'A', imageId: 'img_1' },
          { id: 'o2', label: 'B' },
        ],
      })
      const response = mockResponseRecord({ answer: 'o1' })

      expect(getAnswerOptionImageIds(component, response)).toEqual(['img_1'])
    })

    it('returns all imageIds for multiple-choice answers with images', () => {
      const component = mockTestComponent({
        type: 'multiple_choice',
        options: [
          { id: 'o1', label: 'A', imageId: 'img_1' },
          { id: 'o2', label: 'B', imageId: 'img_2' },
          { id: 'o3', label: 'C' },
        ],
      })
      const response = mockResponseRecord({ answer: ['o1', 'o2', 'o3'] })

      expect(getAnswerOptionImageIds(component, response)).toEqual(['img_1', 'img_2'])
    })

    it('excludes options whose imageId is null or undefined', () => {
      const component = mockTestComponent({
        type: 'multiple_choice',
        options: [
          { id: 'o1', label: 'A', imageId: null },
          { id: 'o2', label: 'B', imageId: 'img_2' },
          { id: 'o3', label: 'C' },
        ],
      })
      const response = mockResponseRecord({ answer: ['o1', 'o2', 'o3'] })

      expect(getAnswerOptionImageIds(component, response)).toEqual(['img_2'])
    })
  })

  describe('getCorrectAnswerImageIds', () => {
    it('returns empty array when correctAnswer is null', () => {
      const component = mockTestComponent({
        options: [{ id: 'o1', label: 'A', imageId: 'img_1' }],
      })

      expect(getCorrectAnswerImageIds(component, null)).toEqual([])
    })

    it('returns empty array when correctAnswer is undefined', () => {
      const component = mockTestComponent({
        options: [{ id: 'o1', label: 'A', imageId: 'img_1' }],
      })

      expect(getCorrectAnswerImageIds(component, undefined)).toEqual([])
    })

    it('returns imageIds for a single-choice correct answer with imageId', () => {
      const component = mockTestComponent({
        type: 'single_choice',
        options: [
          { id: 'o1', label: 'A', imageId: 'img_1' },
          { id: 'o2', label: 'B' },
        ],
      })

      expect(getCorrectAnswerImageIds(component, 'o1')).toEqual(['img_1'])
    })

    it('returns imageIds for multiple-choice correct answers, filtering out those without images', () => {
      const component = mockTestComponent({
        type: 'multiple_choice',
        options: [
          { id: 'o1', label: 'A', imageId: 'img_1' },
          { id: 'o2', label: 'B' },
          { id: 'o3', label: 'C', imageId: 'img_3' },
        ],
      })

      expect(getCorrectAnswerImageIds(component, ['o1', 'o2', 'o3'])).toEqual([
        'img_1',
        'img_3',
      ])
    })
  })

  describe('formatCorrectAnswer', () => {
    it("uses '(image)' fallback for image-only options", () => {
      const component = mockTestComponent({
        type: 'single_choice',
        options: [
          { id: 'o1', label: '', imageId: 'img_1' },
          { id: 'o2', label: 'B' },
        ],
      })

      expect(formatCorrectAnswer(component, 'o1')).toBe('(image)')
    })

    it('joins multiple correct answers mixing labels and image fallbacks', () => {
      const component = mockTestComponent({
        type: 'multiple_choice',
        options: [
          { id: 'o1', label: 'Alpha' },
          { id: 'o2', label: '', imageId: 'img_2' },
          { id: 'o3', label: 'Gamma' },
        ],
      })

      expect(formatCorrectAnswer(component, ['o1', 'o2', 'o3'])).toBe(
        'Alpha, (image), Gamma',
      )
    })
  })
})
