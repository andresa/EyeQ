import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatusBadge from '../../../src/components/atoms/StatusBadge'
import type { TestInstanceStatus } from '../../../src/types'

const statuses: { status: TestInstanceStatus; label: string }[] = [
  { status: 'assigned', label: 'Assigned' },
  { status: 'opened', label: 'Opened' },
  { status: 'in-progress', label: 'In Progress' },
  { status: 'completed', label: 'Completed' },
  { status: 'marked', label: 'Marked' },
  { status: 'expired', label: 'Expired' },
  { status: 'timed-out', label: 'Timed Out' },
]

describe('StatusBadge', () => {
  statuses.forEach(({ status, label }) => {
    it(`renders "${label}" for status "${status}"`, () => {
      render(<StatusBadge status={status} />)
      expect(screen.getByText(label)).toBeInTheDocument()
    })
  })
})
