# Issue #6: Game server phase 1: refactor entities into update() + render()

- Source: https://github.com/nothingdao/astrds/issues/6
- State: CLOSED
- Labels: none
- Assignees: none
- Created: 2026-04-23T21:28:21Z
- Updated: 2026-04-23T21:39:26Z
- Closed: 2026-04-23T21:39:26Z

## Body

## Context

All game entities (`Ship`, `Asteroid`, `Bullet`, `Bullet`, `Pill`, `Token`, `Particle`, `ShipPickup`) currently have physics logic and canvas rendering interleaved inside a single `render()` method. This makes the logic impossible to run in Node.js without a canvas.

This is a prerequisite for the game server (issue #4). The refactor is mechanical and the same pattern applies to every entity.

## Pattern

Every entity gets split into two methods:

```ts
update(dt: number): void  // pure physics — position, velocity, rotation, lifetime, screen wrapping
render(ctx: CanvasRenderingContext2D): void  // drawing only — reads state set by update()
```

`engineStore` game loop then calls `entity.update(dt)` before `entity.render(ctx)` each frame.

## Files to refactor

- [ ] `app/src/game/Ship.ts`
- [ ] `app/src/game/Asteroid.ts`
- [ ] `app/src/game/Bullet.ts`
- [ ] `app/src/game/Particle.ts`
- [ ] `app/src/game/Pill.ts`
- [ ] `app/src/game/Token.ts`
- [ ] `app/src/game/ShipPickup.ts`
- [ ] `app/src/stores/engineStore.ts` — decouple collision detection and spawn logic from RAF loop

## Acceptance criteria

- Game plays correctly in the browser after refactor (golden path test)
- No physics logic inside any `render()` method
- `update()` methods have zero canvas/DOM imports or references
- `engineStore` calls `update()` then `render()` — never interleaved

## Notes

- `gameData.ts` is already clean — no changes needed
- `Particle` is mostly visual but still stateful — still needs the split
- Do not change game behaviour, only structure
- This sets up phase 2 (local game server) where `update()` logic moves server-side

## Related

- #4 Game server: authoritative server-side game loop

## Comments

### whaleen — 2026-04-23T21:39:25Z

Implemented by Codex. All entities have clean update()/render() split, engineStore runs update-then-render pipeline with frame-time delta. One note for phase 2: entity update() methods still read screen dimensions from useEngineStore — will need to be replaced with passed-in parameters when logic moves to Node.
