import type { Container, FeedOptions, SqlQuerySpec } from '@azure/cosmos'

export const DEFAULT_PAGE_LIMIT = 10
export const MAX_PAGE_LIMIT = 100

export interface PaginatedResult<T> {
  items: T[]
  nextCursor: string | null
  total?: number
}

export interface PaginateOptions {
  limit?: number | string | null
  cursor?: string | null
  countQuery?: string | SqlQuerySpec
  partitionKey?: string
  defaultLimit?: number
}

const normaliseLimit = (
  limit: number | string | null | undefined,
  defaultLimit: number = DEFAULT_PAGE_LIMIT,
) => {
  const parsed = typeof limit === 'string' ? parseInt(limit, 10) : limit
  if (!parsed || Number.isNaN(parsed) || parsed < 1) {
    return defaultLimit
  }
  return Math.min(parsed, MAX_PAGE_LIMIT)
}

const encodeCursor = (value?: string | null) =>
  value ? Buffer.from(value, 'utf8').toString('base64url') : null

const decodeCursor = (value?: string | null) => {
  if (!value) return undefined
  return Buffer.from(value, 'base64url').toString('utf8')
}

const buildFeedOptions = (
  limit: number,
  cursor?: string | null,
  partitionKey?: string,
): FeedOptions => {
  const options: FeedOptions = { maxItemCount: limit }
  const continuationToken = decodeCursor(cursor)
  if (continuationToken) {
    options.continuationToken = continuationToken
  }
  if (partitionKey !== undefined) {
    options.partitionKey = partitionKey
  }
  return options
}

const buildCountOptions = (partitionKey?: string): FeedOptions => {
  const options: FeedOptions = {}
  if (partitionKey !== undefined) {
    options.partitionKey = partitionKey
  }
  return options
}

export const paginatedQuery = async <T>(
  container: Container,
  query: string | SqlQuerySpec,
  options: PaginateOptions = {},
): Promise<PaginatedResult<T>> => {
  const limit = normaliseLimit(options.limit, options.defaultLimit)
  const feedOptions = buildFeedOptions(limit, options.cursor, options.partitionKey)

  const pagePromise = container.items.query<T>(query, feedOptions).fetchNext()
  const countPromise =
    !options.cursor && options.countQuery
      ? container.items
          .query<number>(options.countQuery, buildCountOptions(options.partitionKey))
          .fetchAll()
      : null

  const [page, countResult] = await Promise.all([pagePromise, countPromise])
  const total = countResult?.resources?.[0]
  const nextCursor = encodeCursor(page.continuationToken)

  return {
    items: page.resources ?? [],
    nextCursor,
    total: typeof total === 'number' ? total : undefined,
  }
}
