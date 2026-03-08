import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TestCard from '../../../src/components/molecules/TestCard'
import { mockTestInstance, mockTestTemplate } from '../../helpers/fixtures'

describe('TestCard', () => {
  it('renders test name from template', () => {
    const instance = mockTestInstance()
    const test = mockTestTemplate({ name: 'Fire Safety' })
    render(<TestCard instance={instance} test={test} />)

    expect(screen.getByText('Fire Safety')).toBeInTheDocument()
  })

  it('renders testName from instance when no template', () => {
    const instance = mockTestInstance({ testName: 'Quick Quiz' })
    render(<TestCard instance={instance} />)

    expect(screen.getByText('Quick Quiz')).toBeInTheDocument()
  })

  it('renders assigned date', () => {
    const instance = mockTestInstance({ assignedAt: '2025-06-15T10:30:00.000Z' })
    render(<TestCard instance={instance} />)

    expect(screen.getByText(/Assigned Jun/)).toBeInTheDocument()
  })

  it('renders status badge', () => {
    const instance = mockTestInstance({ status: 'completed' })
    render(<TestCard instance={instance} />)

    expect(screen.getByText('Completed')).toBeInTheDocument()
  })

  it('calls onOpen when clicked', () => {
    const onOpen = vi.fn()
    const instance = mockTestInstance()
    render(<TestCard instance={instance} onOpen={onOpen} />)

    fireEvent.click(screen.getByText(instance.testName!))
    expect(onOpen).toHaveBeenCalledOnce()
  })

  it('renders due date when expiresAt is set', () => {
    const instance = mockTestInstance({ expiresAt: '2025-12-31T23:59:59.000Z' })
    render(<TestCard instance={instance} />)

    expect(screen.getByText(/Due/)).toBeInTheDocument()
  })

  it('does not render due date when expiresAt is missing', () => {
    const instance = mockTestInstance({ expiresAt: undefined })
    render(<TestCard instance={instance} />)

    expect(screen.queryByText(/Due/)).not.toBeInTheDocument()
  })
})
