import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { App, ConfigProvider } from 'antd'
import type { PropsWithChildren } from 'react'

vi.mock('../../../src/services/shared', () => ({
  requestMagicLink: vi.fn(),
}))

import { requestMagicLink } from '../../../src/services/shared'
import MagicLinkForm from '../../../src/components/molecules/MagicLinkForm'

function Wrapper({ children }: PropsWithChildren) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
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

describe('MagicLinkForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function setup(props: { profileError?: string | null; autoFocus?: boolean } = {}) {
    return render(<MagicLinkForm {...props} />, { wrapper: Wrapper })
  }

  it('renders email input and submit button', () => {
    setup()

    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send Login Link' })).toBeInTheDocument()
  })

  it('shows error when submitting empty email', async () => {
    setup()

    await userEvent.click(screen.getByRole('button', { name: 'Send Login Link' }))

    await waitFor(() => {
      expect(screen.getByText('Please enter your email address.')).toBeInTheDocument()
    })
  })

  it('calls requestMagicLink on submit and shows success state', async () => {
    vi.mocked(requestMagicLink).mockResolvedValue({
      success: true,
      data: { message: 'Link sent.' },
    })

    setup()

    const emailInput = screen.getByPlaceholderText('you@example.com')
    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Send Login Link' }))

    await waitFor(() => {
      expect(requestMagicLink).toHaveBeenCalledWith('test@example.com', '')
      expect(screen.getByText(/We've sent a login link to/)).toBeInTheDocument()
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })
  })

  it('shows "Use a different email" reset link after success', async () => {
    vi.mocked(requestMagicLink).mockResolvedValue({
      success: true,
      data: { message: 'Link sent.' },
    })

    setup()

    await userEvent.type(
      screen.getByPlaceholderText('you@example.com'),
      'test@example.com',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Send Login Link' }))

    await waitFor(() => {
      expect(screen.getByText('Use a different email')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Use a different email'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Send Login Link' })).toBeInTheDocument()
    })
  })

  it('renders a hidden honeypot input for anti-spam', () => {
    setup()

    const honeypotInput = document.querySelector('input[name="_hp"]') as HTMLInputElement
    expect(honeypotInput).toBeInTheDocument()
    expect(honeypotInput.tabIndex).toBe(-1)
    expect(honeypotInput.autocomplete).toBe('off')
    expect(honeypotInput.closest('[aria-hidden="true"]')).toBeTruthy()
  })

  it('does not send honeypot value when field is empty', async () => {
    vi.mocked(requestMagicLink).mockResolvedValue({
      success: true,
      data: { message: 'Link sent.' },
    })

    setup()

    await userEvent.type(
      screen.getByPlaceholderText('you@example.com'),
      'test@example.com',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Send Login Link' }))

    await waitFor(() => {
      expect(requestMagicLink).toHaveBeenCalledWith('test@example.com', '')
    })
  })

  it('sends honeypot value when bot fills the hidden field', async () => {
    vi.mocked(requestMagicLink).mockResolvedValue({
      success: true,
      data: { message: 'Link sent.' },
    })

    setup()

    const honeypotInput = document.querySelector('input[name="_hp"]') as HTMLInputElement
    honeypotInput.value = 'bot-filled'

    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'bot@spam.com')
    await userEvent.click(screen.getByRole('button', { name: 'Send Login Link' }))

    await waitFor(() => {
      expect(requestMagicLink).toHaveBeenCalledWith('bot@spam.com', 'bot-filled')
    })
  })

  it('shows profileError alert when provided', () => {
    setup({ profileError: 'Your account has been deactivated.' })

    expect(screen.getByText('Your account has been deactivated.')).toBeInTheDocument()
  })

  it('hides profileError after successful submission', async () => {
    vi.mocked(requestMagicLink).mockResolvedValue({
      success: true,
      data: { message: 'Link sent.' },
    })

    setup({ profileError: 'Your account has been deactivated.' })

    expect(screen.getByText('Your account has been deactivated.')).toBeInTheDocument()

    await userEvent.type(
      screen.getByPlaceholderText('you@example.com'),
      'test@example.com',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Send Login Link' }))

    await waitFor(() => {
      expect(
        screen.queryByText('Your account has been deactivated.'),
      ).not.toBeInTheDocument()
    })
  })
})
