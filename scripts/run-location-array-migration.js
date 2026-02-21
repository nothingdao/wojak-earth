#!/usr/bin/env node

/**
 * Update story location system to support multiple locations per story
 */

import { createClient } from '@supabase/supabase-js'
import postgres from 'postgres'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

async function main() {
  console.log('🔄 Updating story location system to support multiple locations...\n')

  console.log('⚠️  This migration will:')
  console.log('  1. Convert location_id (single) → location_ids (array)')
  console.log('  2. Preserve existing location data')
  console.log('  3. Update get_available_stories() function')
  console.log('  4. Update indexes for better performance\n')

  // Use postgres client for direct SQL execution
  const sql = postgres(process.env.SUPABASE_DATABASE_URL)

  try {
    console.log('🔍 Checking current schema...')

    // Check if location_id column exists
    const columns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'stories'
      AND column_name IN ('location_id', 'location_ids')
    `

    const hasLocationId = columns.some(c => c.column_name === 'location_id')
    const hasLocationIds = columns.some(c => c.column_name === 'location_ids')

    if (hasLocationIds) {
      console.log('✅ Migration already applied - location_ids column exists')
      await sql.end()
      return
    }

    if (!hasLocationId) {
      console.log('❌ Unexpected state - neither location_id nor location_ids exists')
      await sql.end()
      return
    }

    console.log('📝 Adding location_ids array column...')
    await sql`ALTER TABLE stories ADD COLUMN IF NOT EXISTS location_ids text[] DEFAULT '{}'`

    console.log('📋 Migrating existing location data...')
    await sql`
      UPDATE stories
      SET location_ids = ARRAY[location_id]::text[]
      WHERE location_id IS NOT NULL
    `

    console.log('🗑️  Dropping old location_id column...')
    await sql`ALTER TABLE stories DROP COLUMN IF EXISTS location_id`

    console.log('💬 Adding column comment...')
    await sql`
      COMMENT ON COLUMN stories.location_ids IS
      'Array of location IDs where this story is available (empty array = available everywhere)'
    `

    console.log('🔧 Updating get_available_stories function...')
    await sql`
      CREATE OR REPLACE FUNCTION get_available_stories(
        p_character_id text,
        p_location_id text,
        p_character_level integer DEFAULT 1,
        p_character_gender text DEFAULT 'MALE'
      )
      RETURNS TABLE (
        story_id uuid,
        story_title text,
        story_description text,
        min_level integer,
        first_event_id uuid,
        is_started boolean,
        is_completed boolean
      ) AS $BODY$
      BEGIN
        RETURN QUERY
        SELECT
          s.id,
          s.title,
          s.description,
          s.min_level,
          s.first_event_id,
          sp.id IS NOT NULL AND sp.is_completed = false AS is_started,
          COALESCE(sp.is_completed, false) AS is_completed
        FROM stories s
        LEFT JOIN story_progress sp ON (sp.story_id = s.id AND sp.character_id = p_character_id)
        WHERE
          s.is_active = true
          AND (
            array_length(s.location_ids, 1) IS NULL
            OR array_length(s.location_ids, 1) = 0
            OR p_location_id = ANY(s.location_ids)
          )
          AND s.min_level <= p_character_level
          AND (s.max_level IS NULL OR s.max_level >= p_character_level)
          AND (s.character_path = LOWER(p_character_gender) OR s.character_path = 'both')
          AND (sp.is_completed IS NULL OR sp.is_completed = false)
          AND (sp.is_abandoned IS NULL OR sp.is_abandoned = false)
          AND s.first_event_id IS NOT NULL
        ORDER BY s.display_order, s.created_at;
      END;
      $BODY$ LANGUAGE plpgsql
    `

    console.log('📊 Updating indexes...')
    await sql`DROP INDEX IF EXISTS idx_stories_location`
    await sql`
      CREATE INDEX IF NOT EXISTS idx_stories_location_ids
      ON stories USING GIN(location_ids)
      WHERE is_active = true
    `

    console.log('\n✅ Migration completed successfully!\n')
    console.log('💡 Story locations now support:')
    console.log('  • Empty array [] = story available everywhere')
    console.log('  • ["solana-beach"] = story only at Solana Beach')
    console.log('  • ["solana-beach", "crystal-caves"] = story at multiple locations\n')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await sql.end()
  }
}

main()
