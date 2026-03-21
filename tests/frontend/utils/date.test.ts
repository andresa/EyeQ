import { describe, it, expect } from 'vitest'
import { formatDate, formatDateTime, isExpired } from '../../../src/utils/date'

describe('utils/date', () => {
  describe('formatDate', () => {
    it('formats ISO string to MMM d, yyyy', () => {
      expect(formatDate('2025-06-15T10:30:00.000Z')).toBe('Jun 15, 2025')
    })

    it('returns empty string for null', () => {
      expect(formatDate(null)).toBe('')
    })

    it('returns empty string for undefined', () => {
      expect(formatDate(undefined)).toBe('')
    })
  })

  describe('formatDateTime', () => {
    it('formats ISO string to MMM d, yyyy HH:mm', () => {
      const result = formatDateTime('2025-06-15T10:30:00.000Z')
      expect(result).toContain('Jun 15, 2025')
    })

    it('returns empty string for null', () => {
      expect(formatDateTime(null)).toBe('')
    })
  })

  describe('isExpired', () => {
    it('returns true for past date', () => {
      expect(isExpired('2020-01-01T00:00:00.000Z')).toBe(true)
    })

    it('returns false for future date', () => {
      expect(isExpired('2099-01-01T00:00:00.000Z')).toBe(false)
    })

    it('returns false for null', () => {
      expect(isExpired(null)).toBe(false)
    })

    it('returns false for undefined', () => {
      expect(isExpired(undefined)).toBe(false)
    })
  })
})
