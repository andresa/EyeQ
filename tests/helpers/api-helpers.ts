import { vi } from 'vitest'
import type { HttpRequest } from '@azure/functions'

export function createMockContainer() {
  const store: Record<string, unknown>[] = []

  const container = {
    items: {
      create: vi.fn(async (doc: Record<string, unknown>) => {
        store.push(doc)
        return { resource: doc }
      }),
      query: vi.fn().mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
      }),
    },
    item: vi.fn().mockReturnValue({
      read: vi.fn().mockResolvedValue({ resource: null }),
      replace: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    }),
  }

  return { container, store }
}

export function mockRequest(overrides: {
  method?: string
  body?: unknown
  query?: Record<string, string>
  params?: Record<string, string>
  headers?: Record<string, string>
}): HttpRequest {
  const query = new URLSearchParams(overrides.query ?? {})
  const headers = new Map(Object.entries(overrides.headers ?? {}))

  return {
    method: overrides.method ?? 'GET',
    url: 'http://localhost/api/test',
    params: overrides.params ?? {},
    query: {
      get: (key: string) => query.get(key),
      has: (key: string) => query.has(key),
    },
    headers: {
      get: (key: string) => headers.get(key.toLowerCase()) ?? null,
    },
    json: async () => overrides.body ?? null,
    text: async () => JSON.stringify(overrides.body ?? null),
  } as unknown as HttpRequest
}
