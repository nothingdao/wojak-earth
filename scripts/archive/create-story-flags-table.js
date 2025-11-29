// Script to create story_flags table for tracking thousands of player story progression flags
// Run with: node scripts/create-story-flags-table.js

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function createStoryFlagsTable() {
  console.log('Creating story_flags table for comprehensive story tracking...')

  try {
    // Create the story_flags table
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create story_flags table
        CREATE TABLE IF NOT EXISTS story_flags (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
          flag_name VARCHAR(100) NOT NULL,
          flag_value JSONB DEFAULT 'true'::jsonb,
          chapter_acquired INTEGER,
          story_id VARCHAR(50),
          acquired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          expires_at TIMESTAMP WITH TIME ZONE NULL,
          is_active BOOLEAN DEFAULT TRUE,
          metadata JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create indexes for efficient querying
        CREATE INDEX IF NOT EXISTS idx_story_flags_character_id ON story_flags(character_id);
        CREATE INDEX IF NOT EXISTS idx_story_flags_flag_name ON story_flags(flag_name);
        CREATE INDEX IF NOT EXISTS idx_story_flags_story_id ON story_flags(story_id);
        CREATE INDEX IF NOT EXISTS idx_story_flags_chapter ON story_flags(chapter_acquired);
        CREATE INDEX IF NOT EXISTS idx_story_flags_active ON story_flags(is_active) WHERE is_active = true;
        CREATE INDEX IF NOT EXISTS idx_story_flags_composite ON story_flags(character_id, flag_name, is_active);

        -- Create unique constraint to prevent duplicate active flags
        CREATE UNIQUE INDEX IF NOT EXISTS idx_story_flags_unique_active 
        ON story_flags(character_id, flag_name) 
        WHERE is_active = true;

        -- Add RLS (Row Level Security) policies
        ALTER TABLE story_flags ENABLE ROW LEVEL SECURITY;

        -- Allow users to see their own flags
        CREATE POLICY IF NOT EXISTS "Users can view own story flags"
        ON story_flags FOR SELECT
        USING (character_id IN (
          SELECT id FROM characters WHERE wallet_address = auth.jwt() ->> 'sub'
        ));

        -- Allow users to insert their own flags (via application logic)
        CREATE POLICY IF NOT EXISTS "Users can insert own story flags"
        ON story_flags FOR INSERT
        WITH CHECK (character_id IN (
          SELECT id FROM characters WHERE wallet_address = auth.jwt() ->> 'sub'
        ));

        -- Allow users to update their own flags
        CREATE POLICY IF NOT EXISTS "Users can update own story flags"
        ON story_flags FOR UPDATE
        USING (character_id IN (
          SELECT id FROM characters WHERE wallet_address = auth.jwt() ->> 'sub'
        ));

        -- Create function to automatically update updated_at timestamp
        CREATE OR REPLACE FUNCTION update_story_flags_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        -- Create trigger for automatic timestamp updates
        DROP TRIGGER IF EXISTS trigger_update_story_flags_updated_at ON story_flags;
        CREATE TRIGGER trigger_update_story_flags_updated_at
        BEFORE UPDATE ON story_flags
        FOR EACH ROW
        EXECUTE FUNCTION update_story_flags_updated_at();
      `
    })

    if (error) {
      console.error('Error creating story_flags table:', error)
      console.log('\nIf the above failed due to permissions, run this SQL in your Supabase SQL editor:')
      console.log(`
-- Create story_flags table for comprehensive story tracking
CREATE TABLE IF NOT EXISTS story_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  flag_name VARCHAR(100) NOT NULL,
  flag_value JSONB DEFAULT 'true'::jsonb,
  chapter_acquired INTEGER,
  story_id VARCHAR(50),
  acquired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NULL,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_story_flags_character_id ON story_flags(character_id);
CREATE INDEX IF NOT EXISTS idx_story_flags_flag_name ON story_flags(flag_name);
CREATE INDEX IF NOT EXISTS idx_story_flags_story_id ON story_flags(story_id);
CREATE INDEX IF NOT EXISTS idx_story_flags_chapter ON story_flags(chapter_acquired);
CREATE INDEX IF NOT EXISTS idx_story_flags_active ON story_flags(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_story_flags_composite ON story_flags(character_id, flag_name, is_active);

-- Prevent duplicate active flags
CREATE UNIQUE INDEX IF NOT EXISTS idx_story_flags_unique_active 
ON story_flags(character_id, flag_name) 
WHERE is_active = true;
      `)
    } else {
      console.log('✅ Successfully created story_flags table with indexes and security policies')
      console.log('📊 Table supports:')
      console.log('   - Thousands of unique story flags per character')
      console.log('   - JSONB flag values for complex data')
      console.log('   - Chapter and story tracking')
      console.log('   - Temporal flags with expiration')
      console.log('   - Efficient querying with optimized indexes')
      console.log('   - Row-level security for data protection')
    }

    // Create helper functions for story flag management
    console.log('\nCreating helper functions...')
    
    const { error: funcError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Function to set a story flag
        CREATE OR REPLACE FUNCTION set_story_flag(
          p_character_id UUID,
          p_flag_name VARCHAR(100),
          p_flag_value JSONB DEFAULT 'true'::jsonb,
          p_chapter INTEGER DEFAULT NULL,
          p_story_id VARCHAR(50) DEFAULT NULL,
          p_metadata JSONB DEFAULT '{}'::jsonb
        )
        RETURNS UUID AS $$
        DECLARE
          flag_id UUID;
        BEGIN
          -- Deactivate any existing flag with the same name
          UPDATE story_flags 
          SET is_active = false, updated_at = NOW()
          WHERE character_id = p_character_id 
            AND flag_name = p_flag_name 
            AND is_active = true;
          
          -- Insert new flag
          INSERT INTO story_flags (
            character_id, flag_name, flag_value, chapter_acquired, 
            story_id, metadata
          )
          VALUES (
            p_character_id, p_flag_name, p_flag_value, p_chapter,
            p_story_id, p_metadata
          )
          RETURNING id INTO flag_id;
          
          RETURN flag_id;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;

        -- Function to get character's story flags
        CREATE OR REPLACE FUNCTION get_character_flags(p_character_id UUID)
        RETURNS TABLE (
          flag_name VARCHAR(100),
          flag_value JSONB,
          chapter_acquired INTEGER,
          story_id VARCHAR(50),
          acquired_at TIMESTAMP WITH TIME ZONE,
          metadata JSONB
        ) AS $$
        BEGIN
          RETURN QUERY
          SELECT 
            sf.flag_name,
            sf.flag_value,
            sf.chapter_acquired,
            sf.story_id,
            sf.acquired_at,
            sf.metadata
          FROM story_flags sf
          WHERE sf.character_id = p_character_id 
            AND sf.is_active = true
          ORDER BY sf.acquired_at DESC;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;

        -- Function to check if character has specific flag
        CREATE OR REPLACE FUNCTION has_story_flag(
          p_character_id UUID,
          p_flag_name VARCHAR(100)
        )
        RETURNS BOOLEAN AS $$
        BEGIN
          RETURN EXISTS (
            SELECT 1 FROM story_flags 
            WHERE character_id = p_character_id 
              AND flag_name = p_flag_name 
              AND is_active = true
          );
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    })

    if (funcError) {
      console.error('Error creating helper functions:', funcError)
    } else {
      console.log('✅ Created helper functions: set_story_flag(), get_character_flags(), has_story_flag()')
    }

  } catch (err) {
    console.error('Unexpected error:', err)
    console.log('\nPlease run the SQL commands manually in your Supabase SQL editor.')
  }
}

// Run the table creation
createStoryFlagsTable()