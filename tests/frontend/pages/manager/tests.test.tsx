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
  listTests: vi.fn(),
  createTestTemplate: vi.fn(),
  updateTestTemplate: vi.fn(),
  deleteTestTemplate: vi.fn(),
  duplicateTestTemplate: vi.fn(),
  assignTest: vi.fn(),
  listEmployees: vi.fn(),
  listTestInstances: vi.fn(),
  listQuestionLibrary: vi.fn(),
}))

vi.mock('../../../../src/services/shared', () => ({
  listEmployeesShared: vi.fn(),
}))

import { listTests } from '../../../../src/services/manager'
import ManagerTestsPage from '../../../../src/pages/manager/tests'

function setup() {
  vi.mocked(listTests).mockResolvedValue({
    success: true,
    data: [
      {
        id: 't1',
        companyId: 'c1',
        managerId: 'm1',
        name: 'Safety Test',
        sections: [],
        settings: {},
        createdAt: '2025-01-01T00:00:00Z',
        isActive: true,
      },
      {
        id: 't2',
        companyId: 'c1',
        managerId: 'm1',
        name: 'Quality Quiz',
        sections: [],
        settings: {},
        createdAt: '2025-01-02T00:00:00Z',
        isActive: true,
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

describe('ManagerTestsPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders test list', async () => {
    setup()
    render(<ManagerTestsPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText('Safety Test')).toBeInTheDocument()
    })
    expect(screen.getByText('Quality Quiz')).toBeInTheDocument()
  })

  it('renders Create test button', async () => {
    setup()
    render(<ManagerTestsPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText('Create Test')).toBeInTheDocument()
    })
  })
})
