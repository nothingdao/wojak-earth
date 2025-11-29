#!/usr/bin/env node

/**
 * Migration script to upload storage bucket files to new Supabase project
 *
 * This script:
 * 1. Creates storage buckets if they don't exist
 * 2. Uploads all files from the backup directory to the new buckets
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const BACKUP_DIR = path.join(__dirname, '..', 'earth_supabase_backup', 'sudufmmkfuawomvlrkha');

async function createBucketIfNotExists(bucketName, isPublic = true) {
  console.log(`\n📦 Checking bucket: ${bucketName}`);

  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(b => b.name === bucketName);

  if (bucketExists) {
    console.log(`✓ Bucket "${bucketName}" already exists`);
    return;
  }

  console.log(`Creating bucket "${bucketName}"...`);
  const { error } = await supabase.storage.createBucket(bucketName, {
    public: isPublic,
    fileSizeLimit: 52428800, // 50MB
  });

  if (error) {
    console.error(`❌ Error creating bucket "${bucketName}":`, error.message);
    throw error;
  }

  console.log(`✓ Created bucket "${bucketName}"`);
}

async function uploadFile(bucketName, filePath, storagePath, retries = 3) {
  const fileBuffer = fs.readFileSync(filePath);
  const contentType = filePath.endsWith('.png') ? 'image/png' :
                     filePath.endsWith('.mp3') ? 'audio/mpeg' :
                     filePath.endsWith('.wav') ? 'audio/wav' :
                     'audio/mpeg'; // Default to audio for radio-music bucket

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { error } = await supabase.storage
        .from(bucketName)
        .upload(storagePath, fileBuffer, {
          contentType,
          upsert: true,
        });

      if (error) {
        if (attempt === retries) {
          console.error(`\n  ❌ Failed to upload ${storagePath} after ${retries} attempts:`, error.message);
          return false;
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }

      return true;
    } catch (err) {
      if (attempt === retries) {
        console.error(`\n  ❌ Failed to upload ${storagePath} after ${retries} attempts:`, err.message);
        return false;
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  return false;
}

async function uploadDirectory(bucketName, localDir, storagePrefix = '') {
  const items = fs.readdirSync(localDir);
  let uploadedCount = 0;
  let totalCount = 0;

  for (const item of items) {
    // Skip system files
    if (item === '.DS_Store' || item.startsWith('._')) {
      continue;
    }

    const localPath = path.join(localDir, item);
    const stat = fs.statSync(localPath);

    if (stat.isDirectory()) {
      const newPrefix = storagePrefix ? `${storagePrefix}/${item}` : item;
      const result = await uploadDirectory(bucketName, localPath, newPrefix);
      uploadedCount += result.uploaded;
      totalCount += result.total;
    } else {
      const storagePath = storagePrefix ? `${storagePrefix}/${item}` : item;
      totalCount++;

      const success = await uploadFile(bucketName, localPath, storagePath);
      if (success) {
        uploadedCount++;
        process.stdout.write('.');
      }
    }
  }

  return { uploaded: uploadedCount, total: totalCount };
}

async function main() {
  console.log('🚀 Starting storage migration...\n');
  console.log(`Source: ${BACKUP_DIR}`);
  console.log(`Target: ${supabaseUrl}\n`);

  try {
    // Create buckets
    await createBucketIfNotExists('players', true);
    await createBucketIfNotExists('radio-music', true);

    // Upload players
    console.log('\n📤 Uploading player images...');
    const playersDir = path.join(BACKUP_DIR, 'players');
    if (fs.existsSync(playersDir)) {
      const playersResult = await uploadDirectory('players', playersDir);
      console.log(`\n✓ Uploaded ${playersResult.uploaded}/${playersResult.total} player images`);
    } else {
      console.log('⚠️  Players directory not found');
    }

    // Upload radio-music
    console.log('\n📤 Uploading radio music files...');
    const radioDir = path.join(BACKUP_DIR, 'radio-music');
    if (fs.existsSync(radioDir)) {
      const radioResult = await uploadDirectory('radio-music', radioDir);
      console.log(`\n✓ Uploaded ${radioResult.uploaded}/${radioResult.total} radio music files`);
    } else {
      console.log('⚠️  Radio-music directory not found');
    }

    console.log('\n✅ Storage migration complete!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
