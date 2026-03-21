import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { App, ConfigProvider } from 'antd'
import type { PropsWithChildren } from 'react'

vi.mock('../../../../src/hooks/useSession', () => ({
  useSession: vi.fn().mockReturnValue({
    userProfile: {
      id: 'a1',
      email: 'a@t.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      companyId: '',
      userType: 'admin',
    },
    isLoading: false,
    isAuthenticated: true,
    profileError: null,
    login: vi.fn(),
    logout: vi.fn(),
    refetchProfile: vi.fn(),
  }),
}))

vi.mock('../../../../src/services/admin', () => ({
  listCompanies: vi.fn(),
  listEmployees: vi.fn(),
  createEmployee: vi.fn(),
  updateEmployee: vi.fn(),
  createManager: vi.fn(),
  updateManager: vi.fn(),
  sendManagerInvitation: vi.fn(),
}))

vi.mock('../../../../src/services/manager', () => ({
  createEmployees: vi.fn(),
  updateEmployee: vi.fn(),
  sendInvitation: vi.fn(),
}))

import { listCompanies, listEmployees } from '../../../../src/services/admin'
import AdminEmployeesPage from '../../../../src/pages/admin/employees'

function setup() {
  vi.mocked(listCompanies).mockResolvedValue({
    success: true,
    data: [
      { id: 'c1', name: 'Acme Corp', createdAt: '2025-01-01T00:00:00Z', isActive: true },
    ],
  })
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

describe('AdminEmployeesPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders employee list', async () => {
    setup()
    render(<AdminEmployeesPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument()
    })
  })

  it('calls listCompanies and listEmployees', async () => {
    setup()
    render(<AdminEmployeesPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(listCompanies).toHaveBeenCalled()
    })
  })
})
