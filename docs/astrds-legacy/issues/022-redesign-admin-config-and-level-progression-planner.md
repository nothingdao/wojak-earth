# Issue #22: Redesign admin config and level progression planner

- Source: https://github.com/nothingdao/astrds/issues/22
- State: CLOSED
- Labels: none
- Assignees: none
- Created: 2026-04-29T21:55:01Z
- Updated: 2026-04-29T22:33:44Z
- Closed: 2026-04-29T22:33:44Z

## Body

## Summary

Audit and redesign the Admin → Config / Level Bands sections so every gameplay setting is either clearly wired to the game server or clearly marked as preview/mock. The goal is a real progression planner that shows what players will experience per level/level range.

Current problem:

- Config tab has some real settings that are wired.
- Level Bands tab is currently mock/local-only.
- Many active gameplay constants are hardcoded and not visible in admin UI.
- Progression needs to support curves, budgets, and chaos/randomized modes rather than only fixed per-level values.
- Space token ranges are depositor-authored and should be visualized alongside game progression, not edited in progression config.

## Current wired config

These settings are currently persisted in Convex and consumed by frontend/server paths:

```text
quarterUsd
powerupSpawnDelayMs
shipPickupSpawnDelayMs
maxPowerupsOnScreen
powerupDurationMs
maxLives
tierBreakpointsUsd
pillsPerTier
astrdsPerPill
applyToRunning — partial
```

Important caveat: the game server currently fetches emission tier before refreshing latest config on session hello, so tier admin changes may not reliably apply to new sessions immediately. Fix order should be:

```text
refresh config → fetch emission tier → lock tier for session
```

## Current hardcoded / missing admin settings

### Asteroids

```text
initial large asteroid count: 2
large asteroid radius: 40
medium asteroid radius: 20
small asteroid radius: 10
split behavior: large → 2 medium, medium → 2 small, small → destroyed
asteroid count increment: +1 per level
max starting asteroid count: 10
asteroid velocity range
asteroid speed by size
asteroid speed by level
score per asteroid size
```

### Ship tuning

```text
starting lives
ship radius
rotation speed
acceleration
inertia
respawn invulnerability duration
```

### Bullet tuning

```text
normal bullet speed
rapid-fire bullet speed
normal fire delay
rapid fire delay
bullet radius
rapid bullet radius
bullet power
collision forgiveness / swept collision visual padding
```

### Pickups

```text
ASTRDS pill spawn interval
space token opportunity interval
space token spawn chance
pickup TTL
pickup radius
ship pickup radius
ship pickup max on screen
powerup type policy / combo-only behavior
```

## Target admin organization

### Config tab: global/session constants

Should include wired global tunings:

```text
Quarter price
Apply to running sessions
ASTRDS emission tiers
Ship tuning
Bullet tuning
Pickup tuning
Powerup duration
Pickup TTL
Base space-token opportunity interval/chance
```

### Level Bands tab: progression planner

Should become a real persisted progression planner, not mock/local-only.

Controls should define level-range policies and generate a level-by-level preview.

## Progression design

A level band should define policies, not only fixed values.

Example:

```ts
{
  fromLevel: 1,
  toLevel: 10,

  asteroids: {
    mode: 'linear',
    from: 2,
    to: 7,
    max: 10,
  },

  asteroidSpeed: {
    mode: 'linear',
    from: 1.0,
    to: 1.4,
  },

  shipPickups: {
    mode: 'budget',
    count: 3,
    distribution: 'even',
  },

  powerups: {
    mode: 'budget',
    count: 12,
    distribution: 'random',
  },

  maxLives: {
    mode: 'fixed',
    value: 5,
  },

  chaos: {
    enabled: false,
  },
}
```

## Policy modes

Support at least:

```ts
type CurveMode = 'fixed' | 'linear' | 'step' | 'randomRange'
type BudgetDistribution = 'even' | 'random' | 'early' | 'late' | 'manual'
```

### Fixed

```ts
{ mode: 'fixed', value: 5 }
```

Good for max lives, durations, TTLs.

### Linear

```ts
{ mode: 'linear', from: 2, to: 8 }
```

Good for asteroid count and speed curves.

### Step/classic arcade

```ts
{ mode: 'step', start: 2, increment: 1, cap: 10 }
```

Represents current behavior:

```text
L1: 2
L2: 3
...
L9+: 10
```

### Budget per range

```ts
{ mode: 'budget', count: 3, distribution: 'even' }
```

Required for cases like:

```text
Levels 1–10: only 3 extra ships total
```

### Random range / chaos

```ts
{ mode: 'randomRange', min: 4, max: 9, seedMode: 'session' }
```

Randomness should remain server-authoritative and debuggable.

## Ship pickup behavior change

Ship pickups should move away from pure timer-only spawning.

Current:

```text
spawn every N seconds if no ship pickup on screen
```

Needed:

```text
band/level grants ship pickup budget
server distributes allowed opportunities across levels
within an allowed level, timing can still be controlled
```

Example:

```text
L1–10 ship budget: 3, distribution even
→ allowed on L2, L5, L9
```

## Powerup behavior

Powerups should support either:

```text
fixed interval
budget per band
random budget per level/range
chaos burst
```

Examples:

```text
L1–5: 1 powerup per level
L6–15: 8 powerups across range
L16+: random 0–2 per level
```

## Space token visualization

Space token level ranges are depositor-authored, not admin-authored.

Deposits define:

```text
minLevel
maxLevel
tokensPerPill
remainingAmount
```

Admin progression UI should visualize active deposit availability by level but not edit it from level bands.

Example timeline:

```text
Levels:  1 2 3 4 5 6 7 8 9 10
BONK     █████
JUP          ██████████
SEND     █████████████████
```

Generated per-level preview should include:

```text
available token symbols
estimated pickups remaining
levels covered
```

## Required preview UI

Every progression edit should produce a generated per-level preview table/timeline.

Example:

```text
Level | Large asteroids | Speed | Ships | Powerups | Max Lives | ASTRDS | Space Tokens
1     | 2               | 1.00x | 0      | 1        | 5         | tier   | BONK, SEND
2     | 3               | 1.04x | 1      | 1        | 5         | tier   | BONK, SEND
3     | 3               | 1.08x | 0      | 0        | 5         | tier   | BONK, JUP
...
10    | 7               | 1.40x | 1      | 1        | 5         | tier   | JUP
```

Admin should be able to visualize:

```text
what happens at each level
what ramps over time
where resources are scarce/dense
where depositor token ranges overlap with difficulty
```

## Implementation phases

### Phase 1 — audit/clarity

- Clearly mark Level Bands as mock/local-only until wired, or disable misleading editing.
- Add “Actual current progression” preview based on current hardcoded rules.
- Show which config fields are live vs not live.
- Fix game server config fetch order before emission tier lock.

### Phase 2 — expose global tuning

Add persisted/admin UI controls for:

```text
ship tuning
bullet tuning
pickup tuning
base asteroid constants
space token opportunity interval/chance
ASTRDS pill interval
```

### Phase 3 — persisted progression config

Add Convex schema + server client support for real progression bands/policies.

### Phase 4 — server enforcement

Update `shared/game/simulation.ts` to derive per-level behavior from progression config.

### Phase 5 — visualization polish

- Timeline chart
- Per-level preview table
- Space-token availability overlay
- Warnings for impossible/weird configs
- Maybe export/import presets

## Acceptance criteria

- Admin UI clearly distinguishes live settings from mock/preview settings.
- All live gameplay constants have an admin-visible representation or deliberate hardcoded note.
- Level Bands are persisted and consumed by game server before being presented as authoritative.
- Admin can define a 10-level range with exactly 3 ship pickups total.
- Admin can define asteroid count/speed curves over a level range.
- Admin can see per-level expected asteroid count, speed, ship pickups, powerups, max lives, ASTRDS emission info, and available space tokens.
- Space token availability is visualized from active deposits but remains depositor-controlled.


## Comments

### whaleen — 2026-04-29T22:33:42Z

Implemented and documented.\n\nShipped:\n- Live Convex-backed admin config for economy, ship, bullet, asteroid, pickup, and Space Token opportunity tuning.\n- Persisted Level Bands consumed by the game server via shared progression policies.\n- Curve/budget resolver in shared/game/progression.ts with table + chart previews.\n- Read-only Space Token availability overlays from active depositor-authored ranges.\n- Server hello order fixed: refresh config → apply/reset simulation → fetch/lock emission tier.\n- Docs updated: AGENTS.md, docs/status.md, docs/architecture.md, docs/spec.md.\n\nValidated:\n- pnpm --dir app exec tsc --noEmit\n- pnpm --dir server exec tsc --noEmit

### whaleen — 2026-04-29T22:33:43Z

Closing as implemented and documented.
