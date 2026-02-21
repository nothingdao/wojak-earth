import type { Handler } from '@netlify/functions'
import { StoryEntitySchema } from '../../src/lib/game-logic/types'
import { addCorsHeaders, ensureStoryAdmin, getTableName } from './story-shared'
import supabaseAdmin from '../../src/utils/supabase-admin'

export const handler: Handler = async (event) => {
  console.log(
    '[story-list] Env check:',
    process.env.SUPABASE_URL ? 'SUPABASE_URL present' : 'SUPABASE_URL missing',
    process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SUPABASE_SERVICE_ROLE_KEY present' : 'SUPABASE_SERVICE_ROLE_KEY missing'
  )

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
  const parsedEntity = StoryEntitySchema.safeParse(query.entity || 'story')
  if (!parsedEntity.success) {
    return {
      statusCode: 400,
      headers: addCorsHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ error: 'Invalid entity query param' }),
    }
  }

  let req = supabaseAdmin.from(getTableName(parsedEntity.data)).select('*')

  if (query.id) req = req.eq('id', query.id)
  if (query.story_id) req = req.eq('story_id', query.story_id)
  if (query.chapter_id) req = req.eq('chapter_id', query.chapter_id)
  if (query.event_id) req = req.eq('event_id', query.event_id)
  if (query.choice_id) req = req.eq('choice_id', query.choice_id)

  if (query.event_ids) {
    const ids = query.event_ids.split(',').filter(Boolean)
    req = req.in('event_id', ids)
  }
  if (query.choice_ids) {
    const ids = query.choice_ids.split(',').filter(Boolean)
    req = req.in('choice_id', ids)
  }

  const orderBy = query.orderBy || 'created_at'
  const ascending = query.ascending === 'true'
  req = req.order(orderBy, { ascending })

  const { data, error } = await req
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
    body: JSON.stringify({ data: data || [] }),
  }
}
