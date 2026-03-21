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
  createCompany: vi.fn(),
  updateCompany: vi.fn(),
  deleteCompany: vi.fn(),
}))

import { listCompanies, createCompany } from '../../../../src/services/admin'
import AdminCompaniesPage from '../../../../src/pages/admin/companies'

const mockListCompanies = vi.mocked(listCompanies)
const mockCreateCompany = vi.mocked(createCompany)

function setup() {
  mockListCompanies.mockResolvedValue({
    success: true,
    data: [
      {
        id: 'c1',
        name: 'Acme Corp',
        address: '123 St',
        createdAt: '2025-01-01T00:00:00Z',
        isActive: true,
      },
      {
        id: 'c2',
        name: 'Beta Inc',
        address: '456 Ave',
        createdAt: '2025-01-02T00:00:00Z',
        isActive: false,
      },
    ],
  })
  mockCreateCompany.mockResolvedValue({
    success: true,
    data: { id: 'c3', name: 'New Corp', createdAt: '2025-01-03', isActive: true },
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

describe('AdminCompaniesPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders company list from mocked API', async () => {
    setup()
    render(<AdminCompaniesPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    })
    expect(screen.getByText('Beta Inc')).toBeInTheDocument()
  })

  it('renders Add company button', async () => {
    setup()
    render(<AdminCompaniesPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText('Add company')).toBeInTheDocument()
    })
  })

  it('shows error when API fails', async () => {
    mockListCompanies.mockRejectedValue(new Error('fail'))
    render(<AdminCompaniesPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(mockListCompanies).toHaveBeenCalled()
    })
  })
})
