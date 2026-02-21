import type { Handler } from '@netlify/functions'
import { StoryCreateRequestSchema } from '../../src/lib/game-logic/types'
import {
  addCorsHeaders,
  createEntity,
  ensureStoryAdmin,
  parseBody,
} from './story-shared'

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: addCorsHeaders(), body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: addCorsHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  const admin = ensureStoryAdmin(event)
  if (!admin.ok) {
    return {
      statusCode: 401,
      headers: addCorsHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ error: admin.message }),
    }
  }

  const payload = StoryCreateRequestSchema.safeParse(parseBody(event))
  if (!payload.success) {
    return {
      statusCode: 400,
      headers: addCorsHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ error: payload.error.flatten() }),
    }
  }

  const result = await createEntity(payload.data.entity, payload.data.data)
  return {
    statusCode: result.statusCode,
    headers: addCorsHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(result),
  }
}
