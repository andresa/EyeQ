import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
  listQuestionLibrary: vi.fn(),
  listQuestionCategories: vi.fn(),
  createQuestionLibraryItems: vi.fn(),
  updateQuestionLibraryItem: vi.fn(),
  deleteQuestionLibraryItem: vi.fn(),
  createFlashCards: vi.fn(),
}))

vi.mock('../../../../src/components/atoms/RichTextEditor', () => ({
  default: ({
    value,
    onChange,
    placeholder,
    ariaLabel,
  }: {
    value: string
    onChange: (v: string) => void
    placeholder?: string
    ariaLabel?: string
  }) => (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
    />
  ),
}))

vi.mock('../../../../src/components/test-builder/ImageUpload', () => ({
  default: () => <div data-testid="image-upload" />,
}))

import {
  listQuestionLibrary,
  listQuestionCategories,
  createQuestionLibraryItems,
  createFlashCards,
} from '../../../../src/services/manager'
import QuestionLibraryPage from '../../../../src/pages/manager/question-library'

function setup() {
  vi.mocked(listQuestionLibrary).mockResolvedValue({
    success: true,
    data: [],
    total: 0,
    nextCursor: null,
  })
  vi.mocked(listQuestionCategories).mockResolvedValue({
    success: true,
    data: [],
  })
  vi.mocked(createQuestionLibraryItems).mockResolvedValue({
    success: true,
    data: [],
  })
  vi.mocked(createFlashCards).mockResolvedValue({
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

async function openCreateModal() {
  await userEvent.click(screen.getByRole('button', { name: 'Create Question' }))
  await waitFor(() => {
    expect(
      screen.getByText('Create Question', { selector: '.ant-modal-title' }),
    ).toBeInTheDocument()
  })
}

async function fillTitle(title: string) {
  const input = screen.getByLabelText('Question title')
  await userEvent.clear(input)
  await userEvent.type(input, title)
}

async function fillOptions(labels: string[] = ['A', 'B']) {
  const inputs = screen.getAllByLabelText('Option label')
  for (let i = 0; i < labels.length && i < inputs.length; i++) {
    await userEvent.clear(inputs[i])
    await userEvent.type(inputs[i], labels[i])
  }
}

describe('QuestionLibraryPage – bulk add', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows "Save & Add Another" and "Save" buttons in create mode', async () => {
    setup()
    render(<QuestionLibraryPage />, { wrapper: Wrapper })
    await openCreateModal()

    expect(screen.getByRole('button', { name: 'Save & Add Another' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('queues a question and shows the count indicator', async () => {
    setup()
    render(<QuestionLibraryPage />, { wrapper: Wrapper })
    await openCreateModal()

    await fillTitle('Question 1')
    await fillOptions()
    await userEvent.click(screen.getByRole('button', { name: 'Save & Add Another' }))

    await waitFor(() => {
      expect(screen.getByText('1 question(s) queued')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /Save All/ })).toBeInTheDocument()
  })

  it('resets the form after Save & Add Another', async () => {
    setup()
    render(<QuestionLibraryPage />, { wrapper: Wrapper })
    await openCreateModal()

    await fillTitle('Question 1')
    await fillOptions()
    await userEvent.click(screen.getByRole('button', { name: 'Save & Add Another' }))

    await waitFor(() => {
      expect(screen.getByLabelText('Question title')).toHaveValue('')
    })
  })

  it('updates the Save All button label with total count', async () => {
    setup()
    render(<QuestionLibraryPage />, { wrapper: Wrapper })
    await openCreateModal()

    await fillTitle('Q1')
    await fillOptions()
    await userEvent.click(screen.getByRole('button', { name: 'Save & Add Another' }))

    await waitFor(() => {
      expect(screen.getByText('1 question(s) queued')).toBeInTheDocument()
    })

    await fillTitle('Q2')
    await fillOptions()
    await userEvent.click(screen.getByRole('button', { name: 'Save & Add Another' }))

    await waitFor(() => {
      expect(screen.getByText('2 question(s) queued')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: 'Save All (3)' })).toBeInTheDocument()
  })

  it('batch-creates all queued questions plus the current one on Save All', async () => {
    setup()
    render(<QuestionLibraryPage />, { wrapper: Wrapper })
    await openCreateModal()

    await fillTitle('Q1')
    await fillOptions()
    await userEvent.click(screen.getByRole('button', { name: 'Save & Add Another' }))
    await waitFor(() => {
      expect(screen.getByText('1 question(s) queued')).toBeInTheDocument()
    })

    await fillTitle('Q2')
    await fillOptions()
    await userEvent.click(screen.getByRole('button', { name: /Save All/ }))

    await waitFor(() => {
      expect(createQuestionLibraryItems).toHaveBeenCalledTimes(1)
    })

    const call = vi.mocked(createQuestionLibraryItems).mock.calls[0][0]
    expect(call.items).toHaveLength(2)
    expect(call.items[0].title).toBe('Q1')
    expect(call.items[1].title).toBe('Q2')
    expect(call.companyId).toBe('c1')
    expect(call.managerId).toBe('m1')
  })

  it('creates a single question via Save when queue is empty', async () => {
    setup()
    render(<QuestionLibraryPage />, { wrapper: Wrapper })
    await openCreateModal()

    await fillTitle('Solo Question')
    await fillOptions()
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(createQuestionLibraryItems).toHaveBeenCalledTimes(1)
    })

    const call = vi.mocked(createQuestionLibraryItems).mock.calls[0][0]
    expect(call.items).toHaveLength(1)
    expect(call.items[0].title).toBe('Solo Question')
  })

  it('does not queue when title is empty (validation)', async () => {
    setup()
    render(<QuestionLibraryPage />, { wrapper: Wrapper })
    await openCreateModal()

    await userEvent.click(screen.getByRole('button', { name: 'Save & Add Another' }))

    await waitFor(() => {
      expect(screen.queryByText(/question\(s\) queued/)).not.toBeInTheDocument()
    })
    expect(createQuestionLibraryItems).not.toHaveBeenCalled()
  })

  it('shows discard confirmation when cancelling with queued questions', async () => {
    setup()
    render(<QuestionLibraryPage />, { wrapper: Wrapper })
    await openCreateModal()

    await fillTitle('Q1')
    await fillOptions()
    await userEvent.click(screen.getByRole('button', { name: 'Save & Add Another' }))
    await waitFor(() => {
      expect(screen.getByText('1 question(s) queued')).toBeInTheDocument()
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    })

    expect(screen.getAllByText('Discard queued questions?').length).toBeGreaterThan(0)
  })

  it('shows Discard button in discard confirmation dialog', async () => {
    setup()
    render(<QuestionLibraryPage />, { wrapper: Wrapper })
    await openCreateModal()

    await fillTitle('Q1')
    await fillOptions()
    await userEvent.click(screen.getByRole('button', { name: 'Save & Add Another' }))
    await waitFor(() => {
      expect(screen.getByText('1 question(s) queued')).toBeInTheDocument()
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    })

    expect(screen.getAllByText('Discard queued questions?').length).toBeGreaterThan(0)
    expect(
      screen.getByText(/unsaved question\(s\) that will be lost/),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Discard' })).toBeInTheDocument()
  })

  it('does not show discard dialog when cancelling with empty queue', async () => {
    setup()
    render(<QuestionLibraryPage />, { wrapper: Wrapper })
    await openCreateModal()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(screen.queryByText('Discard queued questions?')).not.toBeInTheDocument()
  })
})

describe('QuestionLibraryPage – option label validation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects save when one of the options is missing a label', async () => {
    setup()
    render(<QuestionLibraryPage />, { wrapper: Wrapper })
    await openCreateModal()

    await fillTitle('Has blank option')
    const optionInputs = screen.getAllByLabelText('Option label')
    await userEvent.clear(optionInputs[0])
    await userEvent.type(optionInputs[0], 'A')
    await userEvent.clear(optionInputs[1])
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(screen.getByText(/every option must have a label/i)).toBeInTheDocument()
    })
    expect(createQuestionLibraryItems).not.toHaveBeenCalled()
  })

  it('allows save when every option has a label', async () => {
    setup()
    render(<QuestionLibraryPage />, { wrapper: Wrapper })
    await openCreateModal()

    await fillTitle('All labelled')
    await fillOptions(['A', 'B'])
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(createQuestionLibraryItems).toHaveBeenCalledTimes(1)
    })
  })
})
