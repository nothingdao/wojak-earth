import type { Handler } from '@netlify/functions'
import { StoryUpdateRequestSchema } from '../../src/lib/game-logic/types'
import {
  addCorsHeaders,
  ensureStoryAdmin,
  parseBody,
  updateEntity,
} from './story-shared'

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: addCorsHeaders(), body: '' }
  }

  if (event.httpMethod !== 'PATCH' && event.httpMethod !== 'POST') {
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

  const payload = StoryUpdateRequestSchema.safeParse(parseBody(event))
  if (!payload.success) {
    return {
      statusCode: 400,
      headers: addCorsHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ error: payload.error.flatten() }),
    }
  }

  const result = await updateEntity(
    payload.data.entity,
    payload.data.id,
    payload.data.updates
  )

  return {
    statusCode: result.statusCode,
    headers: addCorsHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(result),
  }
}
