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
  listEmployeeArticles: vi.fn(),
  listEmployeeArticleTopics: vi.fn(),
  getEmployeeArticle: vi.fn(),
  listEmployeeFlashCards: vi.fn(),
  getEmployeeLearningResourcesSettings: vi.fn(),
}))

vi.mock('../../../../src/services/shared', () => ({
  fetchLeaderboardSettings: vi.fn().mockResolvedValue({
    success: true,
    data: { boards: [] },
  }),
}))

import {
  listEmployeeArticles,
  listEmployeeArticleTopics,
  listEmployeeFlashCards,
  getEmployeeLearningResourcesSettings,
} from '../../../../src/services/employee'
import EmployeeLearningResourcesPage from '../../../../src/pages/employee/learning-resources'

function setupBothEnabled() {
  vi.mocked(getEmployeeLearningResourcesSettings).mockResolvedValue({
    success: true,
    data: { articlesEnabled: true, flashCardsEnabled: true },
  })
  vi.mocked(listEmployeeArticleTopics).mockResolvedValue({
    success: true,
    data: [
      { id: 'at_1', companyId: 'c1', name: 'Safety', createdAt: '2025-01-01T00:00:00Z' },
    ],
  })
  vi.mocked(listEmployeeArticles).mockResolvedValue({
    success: true,
    data: [
      {
        id: 'art_1',
        companyId: 'c1',
        createdBy: 'u1',
        title: 'Safety Guidelines',
        description: 'An article about safety.',
        topicIds: ['at_1'],
        createdAt: '2025-01-01T00:00:00Z',
      },
    ],
  })
  vi.mocked(listEmployeeFlashCards).mockResolvedValue({
    success: true,
    data: [
      {
        id: 'fc_1',
        companyId: 'c1',
        createdBy: 'u1',
        type: 'single_choice',
        title: 'What is the correct procedure?',
        options: [
          { id: 'o1', label: 'Option A' },
          { id: 'o2', label: 'Option B' },
        ],
        correctAnswer: 'o1',
        createdAt: '2025-01-01T00:00:00Z',
      },
    ],
  })
}

function setupArticlesOnly() {
  vi.mocked(getEmployeeLearningResourcesSettings).mockResolvedValue({
    success: true,
    data: { articlesEnabled: true, flashCardsEnabled: false },
  })
  vi.mocked(listEmployeeArticleTopics).mockResolvedValue({ success: true, data: [] })
  vi.mocked(listEmployeeArticles).mockResolvedValue({ success: true, data: [] })
  vi.mocked(listEmployeeFlashCards).mockResolvedValue({ success: true, data: [] })
}

function setupNeitherEnabled() {
  vi.mocked(getEmployeeLearningResourcesSettings).mockResolvedValue({
    success: true,
    data: { articlesEnabled: false, flashCardsEnabled: false },
  })
  vi.mocked(listEmployeeArticleTopics).mockResolvedValue({ success: true, data: [] })
  vi.mocked(listEmployeeArticles).mockResolvedValue({ success: true, data: [] })
  vi.mocked(listEmployeeFlashCards).mockResolvedValue({ success: true, data: [] })
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

describe('EmployeeLearningResourcesPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders Articles tab with article cards when both enabled', async () => {
    setupBothEnabled()
    render(<EmployeeLearningResourcesPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText('Articles')).toBeInTheDocument()
    })
    expect(screen.getByText('Flash Cards')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Safety Guidelines')).toBeInTheDocument()
    })
  })

  it('renders topic filter tags on article cards', async () => {
    setupBothEnabled()
    render(<EmployeeLearningResourcesPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText('Safety')).toBeInTheDocument()
    })
  })

  it('hides both tabs when neither is enabled', async () => {
    setupNeitherEnabled()
    render(<EmployeeLearningResourcesPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(
        screen.getByText('Learning resources are not enabled for your company yet.'),
      ).toBeInTheDocument()
    })
  })

  it('shows only Articles tab when flash cards disabled', async () => {
    setupArticlesOnly()
    render(<EmployeeLearningResourcesPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText('Articles')).toBeInTheDocument()
    })
    expect(screen.queryByText('Flash Cards')).not.toBeInTheDocument()
  })
})
