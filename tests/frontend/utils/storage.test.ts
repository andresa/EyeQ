import { describe, it, expect, beforeEach } from 'vitest'
import { readStorage, writeStorage } from '../../../src/utils/storage'

describe('utils/storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('readStorage', () => {
    it('returns fallback when key not found', () => {
      expect(readStorage('missing', 'default')).toBe('default')
    })

    it('reads and parses stored value', () => {
      localStorage.setItem('key', JSON.stringify({ a: 1 }))
      expect(readStorage('key', {})).toEqual({ a: 1 })
    })

    it('returns fallback when stored value is invalid JSON', () => {
      localStorage.setItem('key', 'not-json')
      expect(readStorage('key', 'fallback')).toBe('fallback')
    })
  })

  describe('writeStorage', () => {
    it('writes serialized value to localStorage', () => {
      writeStorage('key', { a: 1 })
      expect(localStorage.getItem('key')).toBe('{"a":1}')
    })

    it('writes string value', () => {
      writeStorage('key', 'hello')
      expect(localStorage.getItem('key')).toBe('"hello"')
    })

    it('writes array value', () => {
      writeStorage('key', [1, 2, 3])
      expect(localStorage.getItem('key')).toBe('[1,2,3]')
    })
  })
})
