import { fireEvent, render, screen } from '@testing-library/react'
import { jest } from '@jest/globals'
import TestCard from './TestCard'
import type { TestInstance, TestTemplate } from '../../types'

const instance: TestInstance = {
  id: 'instance_1',
  testId: 'test_1',
  employeeId: 'employee_1',
  assignedByManagerId: 'manager_1',
  status: 'assigned',
  assignedAt: '2026-01-01T00:00:00Z',
}

const testTemplate: TestTemplate = {
  id: 'test_1',
  companyId: 'company_1',
  managerId: 'manager_1',
  name: 'Safety Induction',
  sections: [],
  createdAt: '2026-01-01T00:00:00Z',
  isActive: true,
}

describe('TestCard', () => {
  it('renders test name and responds to click', () => {
    const handleOpen = jest.fn()
    render(<TestCard instance={instance} test={testTemplate} onOpen={handleOpen} />)

    expect(screen.getByText('Safety Induction')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Safety Induction'))
    expect(handleOpen).toHaveBeenCalled()
  })
})
