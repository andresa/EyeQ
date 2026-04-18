import { describe, it, expect } from 'vitest'
import { normaliseOptions } from '../../../api/shared/normalise'

describe('normaliseOptions', () => {
  it('trims id, label, and imageId', () => {
    const result = normaliseOptions([
      { id: ' o1 ', label: ' Alpha ', imageId: ' img_1 ' },
    ])

    expect(result.data).toEqual([{ id: 'o1', label: 'Alpha', imageId: 'img_1' }])
    expect(result.error).toBeUndefined()
  })

  it('omits imageId when falsy or whitespace-only', () => {
    const result = normaliseOptions([
      { id: 'o1', label: 'A', imageId: null },
      { id: 'o2', label: 'B', imageId: '' },
      { id: 'o3', label: 'C', imageId: '   ' },
    ])

    expect(result.data).toHaveLength(3)
    for (const option of result.data!) {
      expect(option).not.toHaveProperty('imageId')
    }
  })

  it('filters out options missing both id and label', () => {
    const result = normaliseOptions([
      { id: 'o1', label: 'A' },
      { id: '', label: '' },
    ])

    expect(result.data).toEqual([{ id: 'o1', label: 'A' }])
  })

  it('returns error when an option has id but no label', () => {
    const result = normaliseOptions([
      { id: 'o1', label: 'A' },
      { id: 'o2', label: '' },
    ])

    expect(result.error).toBe('Every option must have a label.')
    expect(result.data).toBeUndefined()
  })

  it('returns empty data array for undefined input', () => {
    const result = normaliseOptions(undefined)

    expect(result.data).toEqual([])
    expect(result.error).toBeUndefined()
  })

  it('returns empty data array for empty array input', () => {
    const result = normaliseOptions([])

    expect(result.data).toEqual([])
    expect(result.error).toBeUndefined()
  })
})
