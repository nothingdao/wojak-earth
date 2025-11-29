#!/usr/bin/env node

/**
 * Update all Supabase storage URLs from old project to new project
 *
 * This script updates:
 * - characters.current_image_url
 * - characters.birth_image_url
 * - character_images.image_url
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const OLD_PROJECT_REF = 'sudufmmkfuawomvlrkha';
const NEW_PROJECT_REF = 'jnqmbveckrymyyoddsuw';

const OLD_BASE_URL = `https://${OLD_PROJECT_REF}.supabase.co/storage/v1/object/public/`;
const NEW_BASE_URL = `https://${NEW_PROJECT_REF}.supabase.co/storage/v1/object/public/`;

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateCharacterImages() {
  console.log('\n📸 Updating character image URLs...\n');

  // Update current_image_url
  const { data: characters, error: fetchError } = await supabase
    .from('characters')
    .select('id, name, current_image_url, birth_image_url')
    .or(`current_image_url.like.%${OLD_PROJECT_REF}%,birth_image_url.like.%${OLD_PROJECT_REF}%`);

  if (fetchError) {
    console.error('❌ Error fetching characters:', fetchError);
    return;
  }

  console.log(`Found ${characters.length} characters with old image URLs\n`);

  let updatedCount = 0;

  for (const char of characters) {
    const updates = {};

    if (char.current_image_url?.includes(OLD_PROJECT_REF)) {
      updates.current_image_url = char.current_image_url.replace(OLD_BASE_URL, NEW_BASE_URL);
    }

    if (char.birth_image_url?.includes(OLD_PROJECT_REF)) {
      updates.birth_image_url = char.birth_image_url.replace(OLD_BASE_URL, NEW_BASE_URL);
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from('characters')
        .update(updates)
        .eq('id', char.id);

      if (error) {
        console.error(`❌ Failed to update ${char.name}:`, error.message);
      } else {
        console.log(`✅ Updated ${char.name}`);
        updatedCount++;
      }
    }
  }

  console.log(`\n✅ Updated ${updatedCount} character records\n`);
}

async function updateCharacterImageVersions() {
  console.log('📸 Updating character_images table URLs...\n');

  const { data: images, error: fetchError } = await supabase
    .from('character_images')
    .select('id, character_id, version, image_url')
    .like('image_url', `%${OLD_PROJECT_REF}%`);

  if (fetchError) {
    console.error('❌ Error fetching character_images:', fetchError);
    return;
  }

  console.log(`Found ${images?.length || 0} character image versions with old URLs\n`);

  let updatedCount = 0;

  for (const img of images || []) {
    const newUrl = img.image_url.replace(OLD_BASE_URL, NEW_BASE_URL);

    const { error } = await supabase
      .from('character_images')
      .update({ image_url: newUrl })
      .eq('id', img.id);

    if (error) {
      console.error(`❌ Failed to update image ${img.id}:`, error.message);
    } else {
      console.log(`✅ Updated character_id ${img.character_id} version ${img.version}`);
      updatedCount++;
    }
  }

  console.log(`\n✅ Updated ${updatedCount} character_images records\n`);
}

async function main() {
  console.log('🔄 Starting image URL migration...');
  console.log(`   Old: ${OLD_BASE_URL}`);
  console.log(`   New: ${NEW_BASE_URL}\n`);

  try {
    await updateCharacterImages();
    await updateCharacterImageVersions();

    console.log('✅ Migration complete!\n');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
