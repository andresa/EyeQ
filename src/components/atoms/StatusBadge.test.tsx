import { render, screen } from '@testing-library/react'
import StatusBadge from './StatusBadge'

describe('StatusBadge', () => {
  it('renders the assigned label', () => {
    render(<StatusBadge status="assigned" />)
    expect(screen.getByText('Assigned')).toBeInTheDocument()
  })
})
