import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SubmissionHistoryColumn from '../../../src/components/molecules/SubmissionHistoryColumn'
import type { TestInstance } from '../../../src/types'
import { mockTestInstance } from '../../helpers/fixtures'

function setup(
  props: {
    instance?: Partial<TestInstance>
    employeeName?: string
  } = {},
) {
  const instance = mockTestInstance(props.instance)
  const employeeName = props.employeeName ?? 'Jane Doe'
  render(<SubmissionHistoryColumn instance={instance} employeeName={employeeName} />)
  return { instance, employeeName }
}

function getEventLabels() {
  const labels = ['Marked', 'Timed Out', 'Completed', 'Opened', 'Expired', 'Assigned']
  const found: { label: string; index: number }[] = []
  const list = screen.getByRole('list')
  const items = list.querySelectorAll('.ant-timeline-item')
  items.forEach((item, index) => {
    for (const label of labels) {
      if (item.textContent?.includes(label)) {
        found.push({ label, index })
        break
      }
    }
  })
  return found.map((f) => f.label)
}

describe('SubmissionHistoryColumn', () => {
  describe('top card', () => {
    it('renders the employee name', () => {
      setup({ employeeName: 'Jane Doe' })

      expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    })

    it('renders the status badge', () => {
      setup({ instance: { status: 'completed' } })

      expect(screen.getByText('Completed')).toBeInTheDocument()
    })

    it('shows expiry when status is assigned', () => {
      setup({ instance: { status: 'assigned', expiresAt: '2026-06-15T14:00:00.000Z' } })

      expect(screen.getByText(/Expires:/)).toBeInTheDocument()
    })

    it('shows expiry when status is opened', () => {
      setup({
        instance: {
          status: 'opened',
          openedAt: '2026-06-10T09:00:00.000Z',
          expiresAt: '2026-06-15T14:00:00.000Z',
        },
      })

      expect(screen.getByText(/Expires:/)).toBeInTheDocument()
    })

    it('shows expiry when status is in-progress', () => {
      setup({
        instance: {
          status: 'in-progress',
          openedAt: '2026-06-10T09:00:00.000Z',
          expiresAt: '2026-06-15T14:00:00.000Z',
        },
      })

      expect(screen.getByText(/Expires:/)).toBeInTheDocument()
    })

    it('hides expiry when status is completed', () => {
      setup({
        instance: {
          status: 'completed',
          openedAt: '2026-06-10T09:00:00.000Z',
          completedAt: '2026-06-10T10:00:00.000Z',
          expiresAt: '2026-06-15T14:00:00.000Z',
        },
      })

      expect(screen.queryByText(/Expires:/)).not.toBeInTheDocument()
    })

    it('hides expiry when status is marked', () => {
      setup({
        instance: {
          status: 'marked',
          openedAt: '2026-06-10T09:00:00.000Z',
          completedAt: '2026-06-10T10:00:00.000Z',
          markedAt: '2026-06-11T12:00:00.000Z',
          expiresAt: '2026-06-15T14:00:00.000Z',
        },
      })

      expect(screen.queryByText(/Expires:/)).not.toBeInTheDocument()
    })

    it('hides expiry when status is expired', () => {
      setup({ instance: { status: 'expired', expiresAt: '2026-06-15T14:00:00.000Z' } })

      expect(screen.queryByText(/Expires:/)).not.toBeInTheDocument()
    })

    it('hides expiry when status is timed-out', () => {
      setup({
        instance: {
          status: 'timed-out',
          openedAt: '2026-06-10T09:00:00.000Z',
          timedOutAt: '2026-06-10T09:30:00.000Z',
          expiresAt: '2026-06-15T14:00:00.000Z',
        },
      })

      expect(screen.queryByText(/Expires:/)).not.toBeInTheDocument()
    })
  })

  describe('timeline events', () => {
    it('always shows the Assigned event', () => {
      setup({ instance: { status: 'assigned' } })

      const matches = screen.getAllByText('Assigned')
      expect(matches.length).toBeGreaterThanOrEqual(2)
    })

    it('shows Opened event when openedAt is set', () => {
      setup({ instance: { status: 'opened', openedAt: '2026-03-14T15:29:00.000Z' } })

      const matches = screen.getAllByText('Opened')
      expect(matches.length).toBeGreaterThanOrEqual(2)
    })

    it('does not show Opened event when openedAt is missing', () => {
      setup({ instance: { status: 'assigned' } })

      expect(screen.queryByText('Opened')).not.toBeInTheDocument()
    })

    it('shows Completed event with duration', () => {
      setup({
        instance: {
          status: 'completed',
          openedAt: '2026-03-14T09:00:00.000Z',
          completedAt: '2026-03-14T10:30:00.000Z',
        },
      })

      const matches = screen.getAllByText('Completed')
      expect(matches.length).toBeGreaterThanOrEqual(2)
      expect(screen.getByText(/Duration: 1h 30m/)).toBeInTheDocument()
    })

    it('shows Timed Out event with duration', () => {
      setup({
        instance: {
          status: 'timed-out',
          openedAt: '2026-03-14T09:00:00.000Z',
          timedOutAt: '2026-03-14T09:45:00.000Z',
        },
      })

      const matches = screen.getAllByText('Timed Out')
      expect(matches.length).toBeGreaterThanOrEqual(2)
      expect(screen.getByText(/Duration: 45m/)).toBeInTheDocument()
    })

    it('shows Marked event when markedAt is set', () => {
      setup({
        instance: {
          status: 'marked',
          openedAt: '2026-03-14T09:00:00.000Z',
          completedAt: '2026-03-14T10:00:00.000Z',
          markedAt: '2026-03-15T12:00:00.000Z',
        },
      })

      const matches = screen.getAllByText('Marked')
      expect(matches.length).toBeGreaterThanOrEqual(2)
    })

    it('shows Expired event when status is expired', () => {
      setup({
        instance: {
          status: 'expired',
          openedAt: '2026-03-14T15:29:00.000Z',
          expiresAt: '2026-03-15T13:10:00.000Z',
        },
      })

      const matches = screen.getAllByText('Expired')
      expect(matches.length).toBeGreaterThanOrEqual(2)
    })

    it('does not show Expired event when status is not expired', () => {
      setup({ instance: { status: 'assigned', expiresAt: '2026-03-15T13:10:00.000Z' } })

      expect(screen.queryByText('Expired')).not.toBeInTheDocument()
    })
  })

  describe('event ordering', () => {
    it('orders events newest first for a completed submission', () => {
      setup({
        instance: {
          status: 'completed',
          assignedAt: '2026-03-10T09:00:00.000Z',
          openedAt: '2026-03-12T14:00:00.000Z',
          completedAt: '2026-03-12T15:30:00.000Z',
          expiresAt: '2026-03-20T00:00:00.000Z',
        },
      })

      expect(getEventLabels()).toEqual(['Completed', 'Opened', 'Assigned'])
    })

    it('orders events newest first for a marked submission', () => {
      setup({
        instance: {
          status: 'marked',
          assignedAt: '2026-03-10T09:00:00.000Z',
          openedAt: '2026-03-12T14:00:00.000Z',
          completedAt: '2026-03-12T15:30:00.000Z',
          markedAt: '2026-03-13T10:00:00.000Z',
          expiresAt: '2026-03-20T00:00:00.000Z',
        },
      })

      expect(getEventLabels()).toEqual(['Marked', 'Completed', 'Opened', 'Assigned'])
    })

    it('orders Expired correctly between Opened and Assigned', () => {
      setup({
        instance: {
          status: 'expired',
          assignedAt: '2026-03-14T13:10:00.000Z',
          openedAt: '2026-03-14T15:29:00.000Z',
          expiresAt: '2026-03-15T13:10:00.000Z',
        },
      })

      expect(getEventLabels()).toEqual(['Expired', 'Opened', 'Assigned'])
    })

    it('orders Expired before Opened when expired before opening', () => {
      setup({
        instance: {
          status: 'expired',
          assignedAt: '2026-03-10T09:00:00.000Z',
          expiresAt: '2026-03-12T09:00:00.000Z',
        },
      })

      expect(getEventLabels()).toEqual(['Expired', 'Assigned'])
    })

    it('orders Timed Out correctly', () => {
      setup({
        instance: {
          status: 'timed-out',
          assignedAt: '2026-03-10T09:00:00.000Z',
          openedAt: '2026-03-11T10:00:00.000Z',
          timedOutAt: '2026-03-11T10:30:00.000Z',
          expiresAt: '2026-03-20T00:00:00.000Z',
        },
      })

      expect(getEventLabels()).toEqual(['Timed Out', 'Opened', 'Assigned'])
    })

    it('shows only Assigned for a freshly assigned submission', () => {
      setup({
        instance: {
          status: 'assigned',
          assignedAt: '2026-03-10T09:00:00.000Z',
          expiresAt: undefined,
        },
      })

      expect(getEventLabels()).toEqual(['Assigned'])
    })
  })

  describe('duration rounding', () => {
    it('rounds up when seconds are 30 or more', () => {
      setup({
        instance: {
          status: 'completed',
          openedAt: '2026-03-14T09:00:00.000Z',
          completedAt: '2026-03-14T09:29:30.000Z',
        },
      })

      expect(screen.getByText(/Duration: 30m/)).toBeInTheDocument()
    })

    it('rounds down when seconds are below 30', () => {
      setup({
        instance: {
          status: 'completed',
          openedAt: '2026-03-14T09:00:00.000Z',
          completedAt: '2026-03-14T09:30:29.000Z',
        },
      })

      expect(screen.getByText(/Duration: 30m/)).toBeInTheDocument()
    })

    it('shows less than a minute for very short durations', () => {
      setup({
        instance: {
          status: 'completed',
          openedAt: '2026-03-14T09:00:00.000Z',
          completedAt: '2026-03-14T09:00:20.000Z',
        },
      })

      expect(screen.getByText(/Duration: <1m/)).toBeInTheDocument()
    })

    it('rounds correctly across hour boundaries', () => {
      setup({
        instance: {
          status: 'completed',
          openedAt: '2026-03-14T09:00:30.000Z',
          completedAt: '2026-03-14T10:30:00.000Z',
        },
      })

      expect(screen.getByText(/Duration: 1h 30m/)).toBeInTheDocument()
    })
  })
})
