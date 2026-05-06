# Issue #37: Audio system: event coverage, level-range stingers, and sound settings UI

- Source: https://github.com/nothingdao/astrds/issues/37
- State: OPEN
- Labels: none
- Assignees: none
- Created: 2026-05-02T16:09:07Z
- Updated: 2026-05-02T16:09:07Z

## Body

## Overview

Issue #2 landed the core audio framework — AudioManager, SFX buckets, stinger playlists, level band playlists, ducking. This issue picks up what's left: wiring all known game events to sound slots, introducing level-aware stingers, and building a Sound Settings UI that makes the whole map visible and testable.

---

## Event Trigger Audit

### Wired and working
| Event | How | Notes |
|---|---|---|
| Asteroid destroy (L/M/S) | `sfxBuckets` via snapshot presenter | All three sizes point to the same single `explosion` asset — needs variants |
| Ship thrust loop | `audioService.playSoundLoop` | Working |
| Ship destroyed | `audioService.playSound("explosion")` | Direct call, bypasses SoundMap |
| Mine hit / Mine destroy | `audioService.playSound("explosion")` | Direct call, same asset as ship death |
| Bullet fired | `audioService.playSound("shoot")` | Direct call in `Bullet.ts` |
| Pill collected | `audioService.playSound("collect")` | Direct call in `engineStore` |
| ASTRDS token collected | `audioService.playSound("collect")` | Same sound as pill |
| Ship pickup collected | `audioService.playSound("collect")` | Same sound as pill |
| Space token collected | `sfxBuckets.spaceTokenCollect` | Wired — one placeholder asset |
| Level advance stinger | `stingerPlaylists.levelAdvance` | Working — 4 JOI clips, shuffled |
| Personal best | `sfxBuckets.personalBest` + `stingerPlaylists.personalBest` | Wired — placeholder assets only |
| New top score | `sfxBuckets.newTopScore` + `stingerPlaylists.newTopScore` | Wired — placeholder assets only |
| Countdown pings | Direct `playSound` in ReadyScreen | Working |
| Quarter insert | Direct `playSound` in ReadyScreen | Working |
| Game over | State machine entry + `levelStore` direct call | Redundant dual-fire, worth cleaning |
| State music transitions | `AudioManager` via `SOUND_MAP.screens` | Working |

### Not wired
| Event | Trigger Location | Priority |
|---|---|---|
| Wallet connected | wallet adapter / auth flow | medium |
| Space deposit sent | `SendToSpaceOverlay` | medium |
| Space token claim | `SpaceTokenClaim` | medium |
| Chat message received | chat store | low |
| UI button click | component level | low |

### Architecture inconsistency
Several entity files (`Asteroid.ts`, `Bullet.ts`, `Ship.ts`) call `audioService.playSound()` directly instead of routing through `SnapshotSoundEffect` → `ServerGameScreen` → `playSnapshotSound`. The snapshot presenter is the right path for game-loop sounds — it keeps audio decisions client-side and decoupled from server logic. Direct calls in entity files should be removed once fully replaced.

---

## SFX Differentiation

These events currently share assets and should eventually split:

| Bucket | Current | Should become |
|---|---|---|
| `asteroidDestroyLarge` | `explosion` | deep, heavy asteroid bust |
| `asteroidDestroyMedium` | `explosion` | mid-weight crunch |
| `asteroidDestroySmall` | `explosion` | tight crack or pop |
| `collect` (pill) | `collect` | satisfying pill collect |
| `collect` (ASTRDS token) | same as pill | coin / token clink |
| `collect` (ship pickup) | same as pill | power-up whoosh |
| `spaceTokenCollect` | 1 placeholder | dedicated space-deposit sound |
| `explosion` (ship / mine) | asteroid explosion | distinct ship death sting |

No code changes needed until assets exist — buckets and slots are already defined. When an asset is ready, register it in `AudioConfig.ts` and add the ID to the bucket.

---

## Level-Range Stingers

Currently stingers only know about events (`levelAdvance`, `personalBest`), not about level context. A `levelAdvance` stinger at level 1 plays the same clip as one at level 40.

Proposal: add a `levelStingers` map to `SoundMap.ts` — same structure as `levelBands` for music, but for stinger playlists. When a stinger event fires, `AudioManager` checks the current level band and picks from the band-appropriate stinger playlist.

```ts
levelStingers: {
  levelAdvance: [
    { from: 1,  to: 10,  playlist: ['joi-lets-fly', 'joi-whoa', 'joi-space', 'joi-helmet'] },
    { from: 11, to: 999, playlist: [/* more intense clips */] },
  ],
}
```

This is additive — existing flat `stingerPlaylists.levelAdvance` can remain as the fallback when no level-range entry matches.

---

## The "Streak" Concept

A `streak` stinger slot exists in both `sfxBuckets` and `stingerPlaylists` from the original design. The name is functional but generic. Before wiring a trigger, define what the moment actually is:

**Options:**
- **Kill burst** — N asteroids destroyed within X seconds. Rewards tempo.
- **Damage-free run** — N asteroids destroyed without getting hit. Rewards skill.
- **Score milestone** — every N points. Rewards persistence.

The slot is reserved and costs nothing. Recommend leaving it unimplemented until there are voice clips that feel right for a specific moment, then name the trigger after the moment rather than forcing the mechanic to fit "streak." The implementation is a single call to `audioManager.playFromStingerPlaylist('streak')` (or whatever it gets renamed to) at the appropriate collision/score check point.

---

## Sound Settings UI

The admin overlay already has a `SoundManager` tab that shows all buckets, playlists, and assets with test buttons. The goal is a player-accessible version in the regular Sound Settings panel.

**Add to `SoundSettings.tsx`:**

- **SFX Buckets panel** — shows each bucket ID, lists its registered asset IDs, test button that calls `audioManager.playFromSfxBucket(id)`
- **Stinger Playlists panel** — shows each playlist, lists clips, test button that fires a real stinger (with ducking, to test the full experience)
- **Level Band panel** — shows bands by level range, lists the playlist for each, test button per band
- **Stinger duck config** — read-only display of `targetVolume`, `duckMs`, `holdMs`, `restoreMs`

The settings UI remains read-only — `SoundMap.ts` and `AudioConfig.ts` are the source of truth. The UI is for visibility and testing, not editing.

The admin `SoundManager.tsx` can be refactored into a shared component that both panels consume, rather than duplicating the logic.

---

## Volume Channels UI

`docs/audio.md` documents `master` toggling via `[m]` — this is stale, the key is `[H]`. The doc should be updated.

The `SoundSettings` keyboard shortcuts panel should also surface the `AudioWidget`'s per-channel mute buttons (music / SFX) now that those exist.

---

## File Size / Asset Storage

Any music asset over ~500KB should live on R2, not in `public/sounds/`. Enforce this as a PR checklist item when adding new music. See `docs/audio.md` for R2 setup.
