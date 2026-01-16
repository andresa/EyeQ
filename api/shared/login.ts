import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions'
import { getContainer } from './cosmos.js'
import { jsonResponse, parseJsonBody } from './http.js'
import { createId, nowIso } from './utils.js'

interface LoginBody {
  email: string
  role?: string
}

export const loginHandler = async (
  request: HttpRequest,
): Promise<HttpResponseInit> => {
  const body = await parseJsonBody<LoginBody>(request)
  if (!body?.email) {
    return jsonResponse(400, { success: false, error: 'Email is required.' })
  }

  const container = await getContainer('users', '/email')
  const { resources } = await container.items
    .query({
      query: 'SELECT * FROM c WHERE c.email = @email',
      parameters: [{ name: '@email', value: body.email }],
    })
    .fetchAll()

  if (resources.length > 0) {
    return jsonResponse(200, { success: true, data: resources[0] })
  }

  const user = {
    id: createId('user'),
    email: body.email,
    role: body.role,
    createdAt: nowIso(),
  }

  await container.items.create(user)

  return jsonResponse(200, { success: true, data: user })
}

app.http('login', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'shared/login',
  handler: loginHandler,
})
