import { render, type RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { App, ConfigProvider } from 'antd'
import type { PropsWithChildren, ReactElement } from 'react'
import type { UserProfile } from '../../src/types'

interface WrapperOptions {
  session?: {
    userProfile?: UserProfile | null
    isLoading?: boolean
    isAuthenticated?: boolean
    profileError?: string | null
  }
  route?: string
}

const defaultSession = {
  userProfile: null,
  isLoading: false,
  isAuthenticated: false,
  profileError: null,
}

vi.mock('../../src/hooks/useSession', () => {
  let current = { ...defaultSession }
  return {
    useSession: () => ({
      ...current,
      login: vi.fn(),
      logout: vi.fn(),
      refetchProfile: vi.fn(),
    }),
    SessionProvider: ({ children }: PropsWithChildren) => children,
    __setSession: (s: typeof current) => {
      current = s
    },
    __resetSession: () => {
      current = { ...defaultSession }
    },
  }
})

export function createWrapper(options: WrapperOptions = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })

  if (options.session) {
    const mod = vi.mocked(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../../src/hooks/useSession'),
    )
    ;(mod as Record<string, unknown>).__setSession({
      ...defaultSession,
      ...options.session,
    })
  }

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        <ConfigProvider>
          <App>
            <MemoryRouter initialEntries={[options.route ?? '/']}>
              {children}
            </MemoryRouter>
          </App>
        </ConfigProvider>
      </QueryClientProvider>
    )
  }

  return Wrapper
}

export function renderWithProviders(
  ui: ReactElement,
  options: WrapperOptions & Omit<RenderOptions, 'wrapper'> = {},
) {
  const { session, route, ...renderOptions } = options
  return render(ui, { wrapper: createWrapper({ session, route }), ...renderOptions })
}
