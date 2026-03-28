import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { App, ConfigProvider } from 'antd'
import type { PropsWithChildren } from 'react'

vi.mock('../../../../src/hooks/useSession', () => ({
  useSession: vi.fn().mockReturnValue({
    userProfile: {
      id: 'm1',
      email: 'm@t.com',
      firstName: 'Manager',
      lastName: 'User',
      role: 'manager',
      companyId: 'c1',
      companyName: 'Acme',
      userType: 'manager',
    },
    isLoading: false,
    isAuthenticated: true,
    profileError: null,
    login: vi.fn(),
    logout: vi.fn(),
    refetchProfile: vi.fn(),
  }),
}))

vi.mock('../../../../src/services/manager', () => ({
  listEmployees: vi.fn(),
  createEmployees: vi.fn(),
  updateEmployee: vi.fn(),
  deleteEmployee: vi.fn(),
  sendInvitation: vi.fn(),
}))

vi.mock('../../../../src/services/admin', () => ({
  createEmployee: vi.fn(),
  updateEmployee: vi.fn(),
  createManager: vi.fn(),
  updateManager: vi.fn(),
  sendManagerInvitation: vi.fn(),
}))

import { listEmployees } from '../../../../src/services/manager'
import ManagerEmployeesPage from '../../../../src/pages/manager/employees'

function setup() {
  vi.mocked(listEmployees).mockResolvedValue({
    success: true,
    data: [
      {
        id: 'e1',
        companyId: 'c1',
        firstName: 'John',
        lastName: 'Smith',
        email: 'john@t.com',
        role: 'employee',
        createdAt: '2025-01-01T00:00:00Z',
        isActive: true,
        invitationStatus: 'accepted' as const,
      },
      {
        id: 'e2',
        companyId: 'c1',
        firstName: 'Alice',
        lastName: 'Jones',
        email: 'alice@t.com',
        role: 'employee',
        createdAt: '2025-01-02T00:00:00Z',
        isActive: true,
        invitationStatus: 'pending' as const,
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

describe('ManagerEmployeesPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders employee list scoped to company', async () => {
    setup()
    render(<ManagerEmployeesPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument()
    })
    expect(screen.getByText('Alice Jones')).toBeInTheDocument()
  })

  it('renders employee with middle name', async () => {
    vi.mocked(listEmployees).mockResolvedValue({
      success: true,
      data: [
        {
          id: 'e3',
          companyId: 'c1',
          firstName: 'Bob',
          middleName: 'Lee',
          lastName: 'Taylor',
          email: 'bob@t.com',
          role: 'employee',
          createdAt: '2025-01-01T00:00:00Z',
          isActive: true,
          invitationStatus: 'accepted' as const,
        },
      ],
    })

    render(<ManagerEmployeesPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText('Bob Lee Taylor')).toBeInTheDocument()
    })
  })

  it('renders Add Employee button', async () => {
    setup()
    render(<ManagerEmployeesPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText('Add Employee')).toBeInTheDocument()
    })
  })

  it('renders name filter', async () => {
    setup()
    render(<ManagerEmployeesPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Filter by name')).toBeInTheDocument()
    })
  })
})
