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
  listArticles: vi.fn(),
  listArticleTopics: vi.fn(),
  listFlashCards: vi.fn(),
  listQuestionCategories: vi.fn(),
  createArticle: vi.fn(),
  updateArticle: vi.fn(),
  deleteArticle: vi.fn(),
  createFlashCards: vi.fn(),
  updateFlashCard: vi.fn(),
  deleteFlashCard: vi.fn(),
}))

import {
  listArticles,
  listArticleTopics,
  listFlashCards,
  listQuestionCategories,
} from '../../../../src/services/manager'
import ManagerLearningResourcesPage from '../../../../src/pages/manager/learning-resources'

function setup() {
  vi.mocked(listArticleTopics).mockResolvedValue({
    success: true,
    data: [
      { id: 'at_1', companyId: 'c1', name: 'Safety', createdAt: '2025-01-01T00:00:00Z' },
    ],
  })
  vi.mocked(listArticles).mockResolvedValue({
    success: true,
    data: [
      {
        id: 'art_1',
        companyId: 'c1',
        createdBy: 'u1',
        title: 'Safety Guidelines',
        description: 'About safety.',
        topicIds: ['at_1'],
        createdAt: '2025-01-01T00:00:00Z',
      },
    ],
    total: 1,
    nextCursor: null,
  })
  vi.mocked(listFlashCards).mockResolvedValue({
    success: true,
    data: [
      {
        id: 'fc_1',
        companyId: 'c1',
        createdBy: 'u1',
        type: 'single_choice',
        title: 'Flash Card Q1',
        options: [
          { id: 'o1', label: 'A' },
          { id: 'o2', label: 'B' },
        ],
        correctAnswer: 'o1',
        createdAt: '2025-01-01T00:00:00Z',
      },
    ],
    total: 1,
    nextCursor: null,
  })
  vi.mocked(listQuestionCategories).mockResolvedValue({
    success: true,
    data: [],
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

describe('ManagerLearningResourcesPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders Articles tab with article table', async () => {
    setup()
    render(<ManagerLearningResourcesPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText('Safety Guidelines')).toBeInTheDocument()
    })
    expect(screen.getByText('Articles')).toBeInTheDocument()
  })

  it('renders Create Article button', async () => {
    setup()
    render(<ManagerLearningResourcesPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText('Create Article')).toBeInTheDocument()
    })
  })

  it('renders Flash Cards tab', async () => {
    setup()
    render(<ManagerLearningResourcesPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText('Flash Cards')).toBeInTheDocument()
    })
  })
})
