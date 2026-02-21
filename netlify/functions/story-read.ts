import type { Handler } from '@netlify/functions'
import { StoryEntitySchema } from '../../src/lib/game-logic/types'
import { addCorsHeaders, ensureStoryAdmin, getTableName } from './story-shared'
import supabaseAdmin from '../../src/utils/supabase-admin'

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: addCorsHeaders(), body: '' }
  }

  if (event.httpMethod !== 'GET') {
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

  const query = event.queryStringParameters || {}
  const parsedEntity = StoryEntitySchema.safeParse(query.entity)
  if (!parsedEntity.success || !query.id) {
    return {
      statusCode: 400,
      headers: addCorsHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        error: 'Invalid request. Required query params: entity, id',
      }),
    }
  }

  const { data, error } = await supabaseAdmin
    .from(getTableName(parsedEntity.data))
    .select('*')
    .eq('id', query.id)
    .single()

  if (error) {
    return {
      statusCode: 500,
      headers: addCorsHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ error }),
    }
  }

  return {
    statusCode: 200,
    headers: addCorsHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ data }),
  }
}
