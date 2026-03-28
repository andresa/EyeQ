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
  listManagers: vi.fn(),
  deleteManager: vi.fn(),
  sendManagerInvitation: vi.fn(),
  createManager: vi.fn(),
  updateManager: vi.fn(),
}))

import { listCompanies, listManagers } from '../../../../src/services/admin'
import AdminManagersPage from '../../../../src/pages/admin/managers'

function setup() {
  vi.mocked(listCompanies).mockResolvedValue({
    success: true,
    data: [
      { id: 'c1', name: 'Acme Corp', createdAt: '2025-01-01T00:00:00Z', isActive: true },
    ],
  })
  vi.mocked(listManagers).mockResolvedValue({
    success: true,
    data: [
      {
        id: 'm1',
        companyId: 'c1',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@t.com',
        role: 'manager',
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

describe('AdminManagersPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders manager list', async () => {
    setup()
    render(<AdminManagersPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    })
  })

  it('renders manager with middle name', async () => {
    vi.mocked(listCompanies).mockResolvedValue({
      success: true,
      data: [
        {
          id: 'c1',
          name: 'Acme Corp',
          createdAt: '2025-01-01T00:00:00Z',
          isActive: true,
        },
      ],
    })
    vi.mocked(listManagers).mockResolvedValue({
      success: true,
      data: [
        {
          id: 'm2',
          companyId: 'c1',
          firstName: 'Bob',
          middleName: 'Lee',
          lastName: 'Taylor',
          email: 'bob@t.com',
          role: 'manager',
          createdAt: '2025-01-01T00:00:00Z',
          isActive: true,
          invitationStatus: 'accepted' as const,
        },
      ],
    })

    render(<AdminManagersPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText('Bob Lee Taylor')).toBeInTheDocument()
    })
  })

  it('renders Add manager button', async () => {
    setup()
    render(<AdminManagersPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText('Add manager')).toBeInTheDocument()
    })
  })

  it('renders company selector', async () => {
    setup()
    render(<AdminManagersPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(listCompanies).toHaveBeenCalled()
    })
  })
})
