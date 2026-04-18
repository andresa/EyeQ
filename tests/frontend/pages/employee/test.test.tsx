import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { App, ConfigProvider } from 'antd'
import type { PropsWithChildren } from 'react'
import type {
  TestComponent,
  TestInstanceDetails,
  ResponseRecord,
} from '../../../../src/types'

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
  openTestInstance: vi.fn().mockResolvedValue({ success: true, data: {} }),
  fetchTestInstanceDetails: vi.fn(),
  fetchEmployeeTestInstanceResults: vi.fn(),
  saveTestResponses: vi.fn().mockResolvedValue({ success: true }),
  submitTestInstance: vi.fn(),
  timeoutTestInstance: vi.fn(),
}))

vi.mock('../../../../src/components/atoms/QuestionImage', () => ({
  default: () => null,
}))

vi.mock('../../../../src/components/atoms/RichText', () => ({
  default: ({ content }: { content?: string }) => <span>{content ?? ''}</span>,
}))

vi.mock('../../../../src/layouts/EmployeeLayout', () => ({
  default: ({ children }: PropsWithChildren) => <div data-main-scroll>{children}</div>,
}))

vi.mock('../../../../src/components/molecules/StandardPageHeading', () => ({
  default: () => null,
}))

if (typeof Element.prototype.scrollTo !== 'function') {
  Element.prototype.scrollTo = vi.fn()
}

import { saveTestResponses } from '../../../../src/services/employee'
import { buildFormValues } from '../../../../src/pages/employee/test-utils'
import { TestForm } from '../../../../src/pages/employee/test'

function Wrapper({ children }: PropsWithChildren) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
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

function makeResponse(
  questionId: string,
  answer: string | string[] | null,
  textAnswer?: string | null,
): ResponseRecord {
  return {
    id: `r-${questionId}`,
    testInstanceId: 'i1',
    questionId,
    answer,
    textAnswer: textAnswer ?? null,
    createdAt: '2025-01-01T00:00:00Z',
  }
}

function makeTestData(overrides?: {
  components?: TestComponent[]
  responses?: ResponseRecord[]
}): TestInstanceDetails {
  const components: TestComponent[] = overrides?.components ?? [
    {
      id: 'q1',
      type: 'single_choice',
      title: 'Single choice question',
      options: [
        { id: 'a', label: 'Option A' },
        { id: 'b', label: 'Option B' },
      ],
    },
    {
      id: 'q2',
      type: 'multiple_choice',
      title: 'Multi choice question',
      options: [
        { id: 'x', label: 'Option X' },
        { id: 'y', label: 'Option Y' },
        { id: 'z', label: 'Option Z' },
      ],
    },
    {
      id: 'q3',
      type: 'text',
      title: 'Text question',
    },
  ]

  return {
    instance: {
      id: 'i1',
      testId: 't1',
      employeeId: 'e1',
      assignedByManagerId: 'm1',
      status: 'in-progress',
      assignedAt: '2025-01-01T00:00:00Z',
    },
    test: {
      id: 't1',
      companyId: 'c1',
      managerId: 'm1',
      name: 'Test',
      sections: [{ id: 's1', title: 'Section 1', components }],
      settings: { allowBackNavigation: false },
      createdAt: '2025-01-01T00:00:00Z',
      isActive: true,
    },
    responses: overrides?.responses ?? [],
  }
}

// ---------------------------------------------------------------------------
// Test #1 – buildFormValues unit tests
// ---------------------------------------------------------------------------
describe('buildFormValues', () => {
  it('maps a single_choice response', () => {
    const components: TestComponent[] = [
      {
        id: 'q1',
        type: 'single_choice',
        options: [
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
        ],
      },
    ]
    const responses = [makeResponse('q1', 'b')]
    expect(buildFormValues(components, responses)).toEqual({ q_q1: 'b' })
  })

  it('maps a multiple_choice response', () => {
    const components: TestComponent[] = [
      {
        id: 'q2',
        type: 'multiple_choice',
        options: [
          { id: 'x', label: 'X' },
          { id: 'y', label: 'Y' },
        ],
      },
    ]
    const responses = [makeResponse('q2', ['x', 'y'])]
    expect(buildFormValues(components, responses)).toEqual({ q_q2: ['x', 'y'] })
  })

  it('maps a text response', () => {
    const components: TestComponent[] = [{ id: 'q3', type: 'text' }]
    const responses = [makeResponse('q3', null, 'hello')]
    expect(buildFormValues(components, responses)).toEqual({ q_q3: 'hello' })
  })

  it('skips info components', () => {
    const components: TestComponent[] = [
      { id: 'info1', type: 'info', title: 'Read this' },
    ]
    const responses = [makeResponse('info1', null)]
    expect(buildFormValues(components, responses)).toEqual({})
  })

  it('skips components without a matching response', () => {
    const components: TestComponent[] = [
      { id: 'q1', type: 'single_choice', options: [{ id: 'a', label: 'A' }] },
    ]
    expect(buildFormValues(components, [])).toEqual({})
  })

  it('maps multiple components at once', () => {
    const components: TestComponent[] = [
      { id: 'q1', type: 'single_choice', options: [{ id: 'a', label: 'A' }] },
      { id: 'q2', type: 'text' },
    ]
    const responses = [makeResponse('q1', 'a'), makeResponse('q2', null, 'answer')]
    expect(buildFormValues(components, responses)).toEqual({
      q_q1: 'a',
      q_q2: 'answer',
    })
  })
})

// ---------------------------------------------------------------------------
// Test #2 – Form displays pre-populated values
// ---------------------------------------------------------------------------
describe('TestForm – displays saved responses', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows saved single choice selection', async () => {
    const data = makeTestData({
      responses: [
        makeResponse('q1', 'b'),
        makeResponse('q2', ['x'], null),
        makeResponse('q3', null, ''),
      ],
    })

    render(<TestForm instanceId="i1" data={data} onExpired={vi.fn()} />, {
      wrapper: Wrapper,
    })

    await waitFor(() => {
      expect(screen.getByRole('radio', { name: 'Option B' })).toBeChecked()
    })
    expect(screen.getByRole('radio', { name: 'Option A' })).not.toBeChecked()
  })

  it('shows saved multiple choice selections', async () => {
    const data = makeTestData({
      responses: [
        makeResponse('q1', null),
        makeResponse('q2', ['x', 'z'], null),
        makeResponse('q3', null, ''),
      ],
    })

    render(<TestForm instanceId="i1" data={data} onExpired={vi.fn()} />, {
      wrapper: Wrapper,
    })

    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: 'Option X' })).toBeChecked()
    })
    expect(screen.getByRole('checkbox', { name: 'Option Z' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Option Y' })).not.toBeChecked()
  })

  it('shows saved text response', async () => {
    const data = makeTestData({
      responses: [
        makeResponse('q1', null),
        makeResponse('q2', [], null),
        makeResponse('q3', null, 'my answer'),
      ],
    })

    render(<TestForm instanceId="i1" data={data} onExpired={vi.fn()} />, {
      wrapper: Wrapper,
    })

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toHaveValue('my answer')
    })
  })
})

// ---------------------------------------------------------------------------
// Test #3 – Auto-save does not fire on initial load with existing responses
// ---------------------------------------------------------------------------
describe('TestForm – auto-save on init', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not auto-save when form is pre-populated with existing responses', async () => {
    const data = makeTestData({
      responses: [
        makeResponse('q1', 'a'),
        makeResponse('q2', ['x'], null),
        makeResponse('q3', null, 'text'),
      ],
    })

    render(<TestForm instanceId="i1" data={data} onExpired={vi.fn()} />, {
      wrapper: Wrapper,
    })

    // Advance well past AUTO_SAVE_DELAY_MS (2000ms)
    await vi.advanceTimersByTimeAsync(5000)

    expect(saveTestResponses).not.toHaveBeenCalled()
  })

  it('auto-saves when user changes a value after init', async () => {
    vi.useRealTimers()
    const user = userEvent.setup()

    const data = makeTestData({
      responses: [
        makeResponse('q1', 'a'),
        makeResponse('q2', ['x'], null),
        makeResponse('q3', null, ''),
      ],
    })

    render(<TestForm instanceId="i1" data={data} onExpired={vi.fn()} />, {
      wrapper: Wrapper,
    })

    await waitFor(() => {
      expect(screen.getByRole('radio', { name: 'Option A' })).toBeChecked()
    })

    await user.click(screen.getByRole('radio', { name: 'Option B' }))

    await waitFor(
      () => {
        expect(saveTestResponses).toHaveBeenCalled()
      },
      { timeout: 5000 },
    )
  })
})
