import { describe, it, expect } from 'vitest'
import { getDashboardRoute } from '../../../src/utils/auth'

describe('utils/auth', () => {
  describe('getDashboardRoute', () => {
    it('returns /admin for admin role', () => {
      expect(getDashboardRoute('admin')).toBe('/admin')
    })

    it('returns /manager for manager role', () => {
      expect(getDashboardRoute('manager')).toBe('/manager')
    })

    it('returns /employee for employee role', () => {
      expect(getDashboardRoute('employee')).toBe('/employee')
    })
  })
})
