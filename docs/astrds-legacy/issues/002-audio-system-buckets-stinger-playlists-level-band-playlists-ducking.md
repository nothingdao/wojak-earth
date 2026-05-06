# Issue #2: Audio system: buckets, stinger playlists, level band playlists, ducking

- Source: https://github.com/nothingdao/astrds/issues/2
- State: CLOSED
- Labels: none
- Assignees: none
- Created: 2026-04-17T20:55:57Z
- Updated: 2026-04-29T22:39:21Z
- Closed: 2026-04-29T22:39:11Z

## Body

## Overview

Expand the audio system to support the full framework documented in `docs/audio.md`. All design decisions are captured there — this issue tracks implementation.

## Volume Channels

Add a fourth `stingers` channel alongside master / music / sfx.

- `AudioTypes.ts` — add `VOLUME_CHANNELS.STINGERS = 'stingers'`
- `AudioService.ts` — include `stingers` in volume calculation for stinger playback
- `AudioConfig.ts` — add `stingers` default volume
- Expose in settings UI alongside existing sliders

## SFX Buckets

Replace single-sound SFX with named pools. One sound picked at random per trigger using shuffle-without-replacement (no repeats until pool exhausted, then re-shuffle).

- Add `sfxBuckets` map to `SoundMap.ts`
- Add `audioManager.playFromSfxBucket(bucketId)` to `AudioManager`
- Wire asteroid destroy buckets by size (requires size to be passed through collision handler):
  - `asteroidDestroyLarge`
  - `asteroidDestroyMedium`
  - `asteroidDestroySmall`
- Wire `spaceTokenCollect` bucket (distinct from ASTRDS collect)
- Wire `personalBest` and `newTopScore` buckets on game over screen

## Stinger Playlists

Voice clips and dramatic audio that play over music on the `stingers` channel and duck the `music` channel while playing. Each event has its own named playlist. Shuffle-without-replacement, same as SFX buckets.

- Add `stingerPlaylists` map to `SoundMap.ts`
- Add `audioManager.playFromStingerPlaylist(playlistId)` to `AudioManager`
- Migrate existing `levelAdvanceStingers` pool to `stingerPlaylists.levelAdvance`
- Add placeholder playlists: `streak`, `personalBest`, `newTopScore`

## Stinger Ducking

Global duck config — applies to all stinger playback, no per-stinger settings.

- Add `stingerDuck` config to `SoundMap.ts`:
  ```ts
  stingerDuck: {
    targetVolume: 0.3,
    duckMs: 200,
    holdMs: 0,
    restoreMs: 800,
  }
  ```
- `AudioManager.playFromStingerPlaylist()` ducks music on play, listens for `ended` event, restores
- PAUSED state uses same duck curve but holds until state returns to PLAYING

## Level Band Playlists

Replace `LevelBand.music: string` with `LevelBand.playlist: string[]`.

- Update `LevelBand` type in `SoundMap.ts`
- `AudioManager` tracks current playlist state: shuffled order + current index
- On band enter: shuffle playlist, start track 1
- On track `ended` event: advance to next in shuffled order
- On full rotation: re-shuffle and loop
- On band change: re-shuffle new band's playlist, start fresh
- Single-track playlist: loop that track (set `loop: true`)

## Streak Trigger (TBD)

Reserved in event table. Define threshold and mechanic when voice clips exist for the moment. Candidates: kill streak (N asteroids without damage), time burst, or score milestone.

## Asset Storage

- SFX stay in `public/sounds/`
- Music files > ~500KB move to Cloudflare R2
- Paths in `AudioConfig.ts` support full URLs for external assets

## Reference

See `docs/audio.md` for full architecture, event trigger table, and design rationale.

## Comments

### whaleen — 2026-04-27T03:41:47Z

Implementation pass started. Added stingers volume channel and default volume; moved JOI clips to stingers category; expanded SoundMap with sfxBuckets, stingerPlaylists, global stingerDuck config, and levelBands playlists. AudioService now emits musicEnded, supports music duck/restore, and plays one-shot SFX/stingers with cloned audio elements so overlapping effects work. AudioManager now owns shuffle-without-replacement for SFX buckets/stinger playlists, stinger ducking, pause duck/restore, and level-band playlist rotation. Wired asteroid destroy buckets by radius, space token collect bucket, and game-over personal best / #1 score bucket+stinger hooks. Settings UI automatically exposes stingers channel. pnpm build passes.

### whaleen — 2026-04-27T03:49:24Z

Added an Admin → Sound tab as a runtime sound map inspector/test bench. It shows SFX buckets, stinger playlists, stinger duck config, level-band music playlists, and all registered AudioConfig assets. Each bucket/playlist/asset has test playback controls, using AudioManager for bucket/playlist tests so shuffle and stinger ducking are exercised. This is intentionally read-only for now; mappings still live in SoundMap.ts and assets in AudioConfig.ts. pnpm build passes.

### whaleen — 2026-04-27T03:54:15Z

Docs updated in docs/audio.md with current implementation status. Captured that the core audio framework is now in place: stingers channel, SFX buckets, stinger playlists, global duck/restore, level-band playlists, admin Sound tab, and current wiring for asteroid destroy, space-token collect, level advance, personal best, and #1 rank events. Keeping this issue open because the next major phase is sound-library growth: adding enough variants per bucket/playlist to create a seemingly never-repeating soundscape, plus future streak design and additional event-specific assets.

### whaleen — 2026-04-29T22:39:09Z

Drift audit: the audio framework implementation is now in place.\n\nCurrent code has:\n-  volume channel in / and surfaced through volume settings\n- SFX buckets in  with shuffle-without-replacement via \n- asteroid destroy buckets wired by asteroid radius in \n- , , and  buckets wired\n- stinger playlists + global music ducking implemented\n- level band music playlists implemented ()\n- SoundManager runtime inspector/test bench\n\nRemaining work is content/polish rather than core framework: more variant assets, dedicated personal-best/top-score clips, and defining/wiring an actual streak mechanic if desired. Closing this framework issue; future asset/streak work can be separate.

### whaleen — 2026-04-29T22:39:10Z

Closing: framework shipped; remaining work is asset/streak polish.

### whaleen — 2026-04-29T22:39:21Z

Correction to the previous shell-mangled comment: drift audit shows the audio framework implementation is now in place.

Current code has:
- `stingers` volume channel in `AudioTypes` / `AudioConfig` and surfaced through volume settings
- SFX buckets in `SoundMap.ts` with shuffle-without-replacement via `AudioManager.playFromSfxBucket()`
- asteroid destroy buckets wired by asteroid radius in `ServerGameScreen`
- `spaceTokenCollect`, `personalBest`, and `newTopScore` buckets wired
- stinger playlists + global music ducking implemented
- level band music playlists implemented (`LevelBand.playlist: string[]`)
- SoundManager runtime inspector/test bench

Remaining work is content/polish rather than core framework: more variant assets, dedicated personal-best/top-score clips, and defining/wiring an actual streak mechanic if desired. Future asset/streak work can be separate.

