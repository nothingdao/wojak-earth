import type { Handler } from '@netlify/functions'
import { StoryDeleteRequestSchema } from '../../src/lib/game-logic/types'
import { STORY_HEADERS, ensureStoryAdmin, parseBody, getTableName } from './story-shared'
import supabaseAdmin from '../../src/utils/supabase-admin'

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: STORY_HEADERS, body: '' }
  }

  if (event.httpMethod !== 'DELETE' && event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: STORY_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  const admin = ensureStoryAdmin(event)
  if (!admin.ok) {
    return {
      statusCode: 401,
      headers: STORY_HEADERS,
      body: JSON.stringify({ error: admin.message }),
    }
  }

  const payload = StoryDeleteRequestSchema.safeParse(parseBody(event))
  if (!payload.success) {
    return {
      statusCode: 400,
      headers: STORY_HEADERS,
      body: JSON.stringify({ error: payload.error.flatten() }),
    }
  }

  const { error } = await supabaseAdmin
    .from(getTableName(payload.data.entity))
    .delete()
    .eq('id', payload.data.id)

  if (error) {
    return {
      statusCode: 500,
      headers: STORY_HEADERS,
      body: JSON.stringify({ error }),
    }
  }

  return {
    statusCode: 200,
    headers: STORY_HEADERS,
    body: JSON.stringify({ success: true }),
  }
}
