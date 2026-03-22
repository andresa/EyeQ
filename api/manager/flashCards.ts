import type { SqlParameter } from '@azure/cosmos'
import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions'
import { getContainer } from '../shared/cosmos.js'
import { jsonResponse, paginatedJsonResponse, parseJsonBody } from '../shared/http.js'
import { paginatedQuery } from '../shared/pagination.js'
import { createId, nowIso } from '../shared/utils.js'
import { getAuthenticatedUser, requireManager } from '../shared/auth.js'

const CONTAINER = 'flashCards'
const PARTITION_KEY = '/companyId'
const VALID_TYPES = ['single_choice', 'multiple_choice'] as const

type FlashCardType = (typeof VALID_TYPES)[number]

interface FlashCardOptionInput {
  id?: string
  label?: string
}

interface FlashCardInput {
  type?: string
  title?: string
  options?: FlashCardOptionInput[]
  correctAnswer?: string | string[]
  imageId?: string | null
  categoryId?: string | null
}

interface CreateBody {
  companyId?: string
  items?: FlashCardInput[]
}

type UpdateBody = FlashCardInput

interface NormalisedFlashCardInput {
  type: FlashCardType
  title: string
  options: { id: string; label: string }[]
  correctAnswer: string | string[]
  imageId: string | null
  categoryId: string | null
}

const stripRichText = (value: string) =>
  value
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*+/g, '')
    .trim()

const normaliseNullableId = (value?: string | null) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

const normaliseOptions = (options?: FlashCardOptionInput[]) =>
  (Array.isArray(options) ? options : [])
    .map((option) => ({
      id: option.id?.trim() ?? '',
      label: option.label?.trim() ?? '',
    }))
    .filter((option) => option.id && option.label)

const normaliseCorrectAnswer = (value: string) => value.trim()

const normaliseCorrectAnswers = (value: string[]) =>
  Array.from(new Set(value.map((item) => item.trim()).filter(Boolean)))

const normaliseFlashCardInput = (
  input: FlashCardInput,
): { data?: NormalisedFlashCardInput; error?: string } => {
  if (!input.type || !VALID_TYPES.includes(input.type as FlashCardType)) {
    return { error: 'Flash cards must use single-choice or multiple-choice questions.' }
  }

  const title = input.title?.trim() ?? ''
  if (!stripRichText(title)) {
    return { error: 'Flash card title is required.' }
  }

  const options = normaliseOptions(input.options)
  if (options.length < 2) {
    return { error: 'Flash cards must have at least two options.' }
  }

  if (input.correctAnswer == null) {
    return { error: 'Flash cards must include at least one correct answer.' }
  }

  const validOptionIds = new Set(options.map((option) => option.id))
  if (input.type === 'single_choice') {
    const correctAnswer =
      typeof input.correctAnswer === 'string'
        ? normaliseCorrectAnswer(input.correctAnswer)
        : ''
    if (!correctAnswer || !validOptionIds.has(correctAnswer)) {
      return {
        error: 'A valid correct answer is required for single-choice flash cards.',
      }
    }

    return {
      data: {
        type: 'single_choice',
        title,
        options,
        correctAnswer,
        imageId: normaliseNullableId(input.imageId),
        categoryId: normaliseNullableId(input.categoryId),
      },
    }
  }

  const answers = Array.isArray(input.correctAnswer)
    ? normaliseCorrectAnswers(input.correctAnswer)
    : []

  if (!answers.length || answers.some((answer) => !validOptionIds.has(answer))) {
    return {
      error: 'At least one valid correct answer is required for multiple-choice cards.',
    }
  }

  return {
    data: {
      type: 'multiple_choice',
      title,
      options,
      correctAnswer: answers,
      imageId: normaliseNullableId(input.imageId),
      categoryId: normaliseNullableId(input.categoryId),
    },
  }
}

const getFlashCardById = async (cardId: string) => {
  const container = await getContainer(CONTAINER, PARTITION_KEY)
  const { resources } = await container.items
    .query({
      query: 'SELECT * FROM c WHERE c.id = @id',
      parameters: [{ name: '@id', value: cardId }],
    })
    .fetchAll()

  return resources[0]
}

const listFlashCardsHandler = async (request: HttpRequest): Promise<HttpResponseInit> => {
  const companyId = request.query.get('companyId')
  if (!companyId) {
    return jsonResponse(400, { success: false, error: 'companyId is required.' })
  }

  const categoryFilter = request.query.get('categoryId')
  const limit = request.query.get('limit')
  const cursor = request.query.get('cursor')

  let whereClause = 'FROM c WHERE c.companyId = @companyId'
  const parameters: SqlParameter[] = [{ name: '@companyId', value: companyId }]

  if (categoryFilter) {
    if (categoryFilter === 'uncategorised') {
      whereClause += ' AND (NOT IS_DEFINED(c.categoryId) OR IS_NULL(c.categoryId))'
    } else {
      whereClause += ' AND c.categoryId = @categoryId'
      parameters.push({ name: '@categoryId', value: categoryFilter })
    }
  }

  const query = `SELECT * ${whereClause} ORDER BY c.createdAt DESC`
  const countQuery = `SELECT VALUE COUNT(1) ${whereClause}`
  const container = await getContainer(CONTAINER, PARTITION_KEY)

  if (limit) {
    const page = await paginatedQuery(
      container,
      { query, parameters },
      {
        limit,
        cursor,
        countQuery: { query: countQuery, parameters },
        partitionKey: companyId,
      },
    )

    return paginatedJsonResponse(200, page)
  }

  const { resources } = await container.items
    .query({ query, parameters }, { partitionKey: companyId })
    .fetchAll()

  return jsonResponse(200, { success: true, data: resources })
}

const createFlashCardsHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const user = await getAuthenticatedUser(request)
  const authError = requireManager(user)
  if (authError) return authError

  const body = await parseJsonBody<CreateBody>(request)
  if (!body?.companyId || !body.items?.length) {
    return jsonResponse(400, {
      success: false,
      error: 'companyId and at least one flash card item are required.',
    })
  }

  if (user!.role !== 'admin' && user!.companyId !== body.companyId) {
    return jsonResponse(403, {
      success: false,
      error: 'You can only create flash cards for your own company.',
    })
  }

  const container = await getContainer(CONTAINER, PARTITION_KEY)
  const created = []

  for (const [index, item] of body.items.entries()) {
    const { data, error } = normaliseFlashCardInput(item)
    if (!data) {
      return jsonResponse(400, {
        success: false,
        error: error || `Invalid flash card at index ${index}.`,
      })
    }

    const doc = {
      id: createId('fc'),
      companyId: body.companyId,
      createdBy: user!.id,
      type: data.type,
      title: data.title,
      options: data.options,
      correctAnswer: data.correctAnswer,
      imageId: data.imageId,
      categoryId: data.categoryId,
      createdAt: nowIso(),
    }

    await container.items.create(doc)
    created.push(doc)
  }

  return jsonResponse(201, { success: true, data: created })
}

const getFlashCardHandler = async (request: HttpRequest): Promise<HttpResponseInit> => {
  const user = await getAuthenticatedUser(request)
  const authError = requireManager(user)
  if (authError) return authError

  const cardId = request.params.cardId
  if (!cardId) {
    return jsonResponse(400, { success: false, error: 'cardId is required.' })
  }

  const flashCard = await getFlashCardById(cardId)
  if (!flashCard) {
    return jsonResponse(404, { success: false, error: 'Flash card not found.' })
  }

  if (user!.role !== 'admin' && user!.companyId !== flashCard.companyId) {
    return jsonResponse(403, {
      success: false,
      error: 'You can only view flash cards from your own company.',
    })
  }

  return jsonResponse(200, { success: true, data: flashCard })
}

const updateFlashCardHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const user = await getAuthenticatedUser(request)
  const authError = requireManager(user)
  if (authError) return authError

  const cardId = request.params.cardId
  if (!cardId) {
    return jsonResponse(400, { success: false, error: 'cardId is required.' })
  }

  const existing = await getFlashCardById(cardId)
  if (!existing) {
    return jsonResponse(404, { success: false, error: 'Flash card not found.' })
  }

  if (user!.role !== 'admin' && user!.companyId !== existing.companyId) {
    return jsonResponse(403, {
      success: false,
      error: 'You can only update flash cards in your own company.',
    })
  }

  const body = await parseJsonBody<UpdateBody>(request)
  const { data, error } = normaliseFlashCardInput({
    type: body?.type ?? existing.type,
    title: body?.title ?? existing.title,
    options: body?.options ?? existing.options,
    correctAnswer:
      body?.correctAnswer !== undefined ? body.correctAnswer : existing.correctAnswer,
    imageId: body?.imageId !== undefined ? body.imageId : existing.imageId,
    categoryId: body?.categoryId !== undefined ? body.categoryId : existing.categoryId,
  })

  if (!data) {
    return jsonResponse(400, {
      success: false,
      error: error || 'Invalid flash card data.',
    })
  }

  const updated = {
    ...existing,
    type: data.type,
    title: data.title,
    options: data.options,
    correctAnswer: data.correctAnswer,
    imageId: data.imageId,
    categoryId: data.categoryId,
    updatedAt: nowIso(),
  }

  const container = await getContainer(CONTAINER, PARTITION_KEY)
  await container.item(cardId, existing.companyId).replace(updated)
  return jsonResponse(200, { success: true, data: updated })
}

const deleteFlashCardHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const user = await getAuthenticatedUser(request)
  const authError = requireManager(user)
  if (authError) return authError

  const cardId = request.params.cardId
  if (!cardId) {
    return jsonResponse(400, { success: false, error: 'cardId is required.' })
  }

  const existing = await getFlashCardById(cardId)
  if (!existing) {
    return jsonResponse(404, { success: false, error: 'Flash card not found.' })
  }

  if (user!.role !== 'admin' && user!.companyId !== existing.companyId) {
    return jsonResponse(403, {
      success: false,
      error: 'You can only delete flash cards from your own company.',
    })
  }

  const container = await getContainer(CONTAINER, PARTITION_KEY)
  await container.item(cardId, existing.companyId).delete()
  return jsonResponse(200, { success: true, data: { id: cardId } })
}

app.http('managerFlashCards', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'manager/flash-cards',
  handler: async (request) => {
    const user = await getAuthenticatedUser(request)
    const authError = requireManager(user)
    if (authError) return authError

    if (request.method === 'GET') {
      const companyId = request.query.get('companyId')
      if (user!.role !== 'admin' && user!.companyId !== companyId) {
        return jsonResponse(403, {
          success: false,
          error: 'You can only view flash cards for your own company.',
        })
      }

      return listFlashCardsHandler(request)
    }

    return createFlashCardsHandler(request)
  },
})

app.http('managerFlashCardItem', {
  methods: ['GET', 'PUT', 'DELETE'],
  authLevel: 'anonymous',
  route: 'manager/flash-cards/{cardId}',
  handler: async (request) => {
    if (request.method === 'GET') return getFlashCardHandler(request)
    if (request.method === 'PUT') return updateFlashCardHandler(request)
    return deleteFlashCardHandler(request)
  },
})
