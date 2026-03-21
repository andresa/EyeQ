import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { App, ConfigProvider } from 'antd'
import type { PropsWithChildren } from 'react'

vi.mock('../../../../src/hooks/useSession', () => ({
  useSession: vi.fn().mockReturnValue({
    userProfile: {
      id: 'e1',
      email: 'e@t.com',
      firstName: 'Employee',
      lastName: 'User',
      role: 'employee',
      companyId: 'c1',
      companyName: 'Acme',
      userType: 'employee',
    },
    isLoading: false,
    isAuthenticated: true,
    profileError: null,
    login: vi.fn(),
    logout: vi.fn(),
    refetchProfile: vi.fn(),
  }),
}))

vi.mock('../../../../src/services/employee', () => ({
  listEmployeeTestInstances: vi.fn(),
  openTestInstance: vi.fn(),
  fetchTestInstanceDetails: vi.fn(),
  fetchEmployeeTestInstanceResults: vi.fn(),
}))

import { listEmployeeTestInstances } from '../../../../src/services/employee'
import EmployeeTestsPage from '../../../../src/pages/employee/tests'

function setup() {
  vi.mocked(listEmployeeTestInstances).mockResolvedValue({
    success: true,
    data: [
      {
        id: 'i1',
        testId: 't1',
        testName: 'Safety Test',
        employeeId: 'e1',
        status: 'assigned',
        assignedAt: '2025-01-01T00:00:00Z',
        expiresAt: '2099-01-01T00:00:00Z',
        assignedByManagerId: 'm1',
      },
      {
        id: 'i2',
        testId: 't2',
        testName: 'Quality Quiz',
        employeeId: 'e1',
        status: 'completed',
        assignedAt: '2025-01-02T00:00:00Z',
        expiresAt: '2099-01-01T00:00:00Z',
        assignedByManagerId: 'm1',
        completedAt: '2025-01-03T00:00:00Z',
      },
    ],
  })
}

function Wrapper({ children }: PropsWithChildren) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider>
        <App>
          <MemoryRouter>{children}</MemoryRouter>
        </App>
      </ConfigProvider>
    </QueryClientProvider>
  )
}

describe('EmployeeTestsPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders test instance list', async () => {
    setup()
    render(<EmployeeTestsPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText('Safety Test')).toBeInTheDocument()
    })
    expect(screen.getByText('Quality Quiz')).toBeInTheDocument()
  })

  it('renders status badges', async () => {
    setup()
    render(<EmployeeTestsPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText('Assigned')).toBeInTheDocument()
    })
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })
})
