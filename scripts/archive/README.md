# Archived Scripts

This directory contains one-time scripts that were used during development and are kept for historical reference.

## Story System Scripts

**Story Database Population:**
- `populate-male-story.js` - Original story population script
- `populate-male-story-id-based.js` - Updated version using ID-based chaining

**Story Testing:**
- `test-story-editor.js` - Test script for story editor functionality
- `test-story-flags.js` - Test script for story flags system
- `test-story-flags-simple.js` - Simplified story flags testing

## Database Migrations

**Schema Changes:**
- `create-story-flags-table.js` - Created the story flags tracking table
- `remove-event-key-constraint.js` - Removed NOT NULL constraint from event_key

**Data Transformations:**
- `update-consequences-chaining.js` - Updated consequences with event chaining
- `update-consequences-with-ids.js` - Migrated from event_key to database IDs

## Supabase Migration (Nov 2024)

**Migration to New Project:**
- `migrate-storage.js` - Migrated storage buckets (players, radio-music) from old to new Supabase project
- `update-image-urls.js` - Updated all character image URLs to point to new Supabase project

These scripts were used when migrating from `sudufmmkfuawomvlrkha` to `jnqmbveckrymyyoddsuw` after the original project was paused for 90+ days of inactivity.

---

**Note:** These scripts are archived and should not be run again unless you understand their purpose and implications. They are kept for documentation and potential future reference.
