import { describe, it, expect } from 'vitest'
import { formatUserName } from '../../../src/utils/formatUserName'

describe('formatUserName', () => {
  it('returns first and last name when no middle name', () => {
    expect(formatUserName({ firstName: 'John', lastName: 'Smith' })).toBe('John Smith')
  })

  it('includes middle name when provided', () => {
    expect(
      formatUserName({ firstName: 'John', middleName: 'Michael', lastName: 'Smith' }),
    ).toBe('John Michael Smith')
  })

  it('treats undefined middle name same as absent', () => {
    expect(
      formatUserName({ firstName: 'John', middleName: undefined, lastName: 'Smith' }),
    ).toBe('John Smith')
  })

  it('treats empty string middle name same as absent', () => {
    expect(formatUserName({ firstName: 'John', middleName: '', lastName: 'Smith' })).toBe(
      'John Smith',
    )
  })
})
