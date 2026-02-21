import type { HandlerEvent } from '@netlify/functions'
import { ADMIN_WALLETS } from '../../src/config/admins'
import supabaseAdmin from '../../src/utils/supabase-admin'
import {
  StoryCreateSchemas,
  StoryUpdateSchemas,
  type StoryEntity,
} from '../../src/lib/game-logic/types'

export const STORY_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-admin-wallet, x-admin-token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS,PATCH',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json',
}

export function addCorsHeaders(headers: Record<string, string> = {}): Record<string, string> {
  return {
    ...headers,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS,PATCH',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-wallet, x-admin-token',
    'Access-Control-Max-Age': '86400',
  }
}

const TABLE_MAP: Record<StoryEntity, string> = {
  story: 'stories',
  chapter: 'chapters',
  event: 'events',
  choice: 'choices',
  consequence: 'consequences',
}

export function getTableName(entity: StoryEntity): string {
  return TABLE_MAP[entity]
}

export function parseBody<T>(event: HandlerEvent): T {
  return JSON.parse(event.body || '{}') as T
}

export function ensureStoryAdmin(event: HandlerEvent): { ok: true } | { ok: false; message: string } {
  const wallet =
    event.headers['x-admin-wallet'] ||
    event.headers['X-Admin-Wallet'] ||
    event.headers['x-admin-address']
  const token =
    event.headers['x-admin-token'] || event.headers['X-Admin-Token']

  const configuredToken = process.env.ADMIN_API_TOKEN
  if (configuredToken && token === configuredToken) {
    return { ok: true }
  }

  if (wallet && ADMIN_WALLETS.includes(wallet)) {
    return { ok: true }
  }

  return {
    ok: false,
    message: 'Admin authorization required. Provide x-admin-wallet or x-admin-token.',
  }
}

export async function createEntity(entity: StoryEntity, data: Record<string, unknown>) {
  const parsed = StoryCreateSchemas[entity].safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.flatten(), statusCode: 400 }
  }

  const { data: created, error } = await supabaseAdmin
    .from(getTableName(entity))
    .insert(parsed.data)
    .select('*')
    .single()

  if (error) {
    return { error, statusCode: 500 }
  }

  return { data: created, statusCode: 200 }
}

export async function updateEntity(
  entity: StoryEntity,
  id: string,
  updates: Record<string, unknown>
) {
  const parsed = StoryUpdateSchemas[entity].safeParse(updates)
  if (!parsed.success) {
    return { error: parsed.error.flatten(), statusCode: 400 }
  }

  const { data: updated, error } = await supabaseAdmin
    .from(getTableName(entity))
    .update(parsed.data)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    return { error, statusCode: 500 }
  }

  return { data: updated, statusCode: 200 }
}
