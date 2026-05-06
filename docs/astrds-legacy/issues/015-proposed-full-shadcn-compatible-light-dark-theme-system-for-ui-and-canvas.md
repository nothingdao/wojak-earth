# Issue #15: Proposed: full shadcn-compatible light/dark theme system for UI and canvas

- Source: https://github.com/nothingdao/astrds/issues/15
- State: CLOSED
- Labels: enhancement, proposed
- Assignees: none
- Created: 2026-04-27T02:31:50Z
- Updated: 2026-04-27T03:31:09Z
- Closed: 2026-04-27T03:31:09Z

## Body

## Summary

Add a full light/dark theme system for ASTRDS that respects shadcn's CSS variable model and also themes the actual game canvas.

The target architecture:

```text
style.css = source of truth
shadcn vars = base UI contract
ASTRDS vars = game/canvas/chart extensions
Tailwind = CSS var utility mapping
Canvas = cached CSS var reader
Components = semantic classes only
```

## Goals

- Add persistent light/dark theme state.
- Apply `theme-dark` / `theme-light` at the document root.
- Add an in-game/app-shell theme toggle.
- Make the live game canvas theme-aware.
- Keep shadcn variables as the base UI contract.
- Add ASTRDS-specific variables only for game/canvas/chart/domain visuals.
- Remove hardcoded visual color values from components and canvas renderers over time.

## Non-goals

- Do not replace shadcn's theme model.
- Do not scatter `dark:` / `light:` class pairs across the app.
- Do not keep duplicate JS color palettes as the long-term source of truth.
- Do not make theme changes affect gameplay mechanics.

## Design principles

Generic UI should use shadcn tokens/classes:

```text
bg-background
text-foreground
bg-card
text-card-foreground
text-muted-foreground
border-border
bg-primary
text-primary-foreground
```

ASTRDS-specific UI may use semantic project tokens:

```text
text-tx-primary
bg-surface-panel
border-edge-subtle
```

Canvas/domain visuals should use CSS variables read through a cached JS token reader:

```text
--canvas-background
--canvas-ship-stroke
--canvas-ship-fill
--canvas-asteroid-stroke
--canvas-pill
--canvas-token
--canvas-particle
--chart-liquidity
--chart-circulating
--chart-unmined
```

## Acceptance criteria

### Functional

- Theme toggle switches between light and dark mode.
- Selected theme persists after refresh.
- Theme class is applied to `document.documentElement`.
- UI updates immediately when toggled.
- Active game canvas updates immediately when toggled.

### shadcn compatibility

- Existing shadcn variables remain intact:
  - `--background`
  - `--foreground`
  - `--card`
  - `--popover`
  - `--primary`
  - `--secondary`
  - `--muted`
  - `--accent`
  - `--destructive`
  - `--border`
  - `--input`
  - `--ring`
- Generic UI uses shadcn semantic classes where appropriate.
- ASTRDS-specific tokens extend shadcn rather than replacing it.

### Canvas

- No raw visual color literals in canvas render code after migration.
- Canvas tokens are read from CSS variables and cached.
- Light mode canvas uses high-contrast off-white / dark-line styling.
- Dark mode canvas preserves existing black-space / neon-vector feel.

### Code hygiene

Eventually these should only find allowed hits in theme definitions or generated/third-party files:

```bash
rg "text-white|bg-black|border-white|text-black|bg-white|border-black" app/src
rg "#[0-9a-fA-F]{3,8}" app/src
rg "rgba\(|rgb\(" app/src
```

Allowed long-term color literal location:

```text
app/src/styles/style.css
```

## Suggested implementation phases

### Phase 1 — Theme infrastructure

- Add Zustand theme store.
- Add theme root controller.
- Add app-shell theme toggle.
- Add missing canvas/chart/status CSS variables to `style.css`.

### Phase 2 — Canvas token reader

- Convert `designTokens.ts` into a typed cached CSS-variable reader.
- Add cache invalidation/update on theme changes.
- Keep temporary backward-compatible exports if needed during migration.

### Phase 3 — Server canvas renderer

- Update `renderServerSnapshot.ts` to consume canvas tokens instead of hardcoded colors/static palette.
- Pass/update theme token cache from `ServerGameScreen`.

### Phase 4 — Legacy entity renderers

- Update entity draw methods to read canvas tokens.
- Remove static `entityColors` usage.

### Phase 5 — UI token cleanup

Prioritize:

- Header/app shell
- Game HUD
- Wallet modal
- Title / Ready / Game Over
- Tokenomics / Account / Chat / Help overlays

## Notes

The preferred architecture is CSS-variable-first:

```text
CSS variables are the source of truth.
Tailwind maps CSS vars for React UI.
Canvas reads the same CSS vars through a cached typed reader.
```


## Comments

### whaleen — 2026-04-27T02:39:34Z

Implementation started. Completed first slice: persistent Zustand theme store, root ThemeController, no-flash index.html bootstrap, Header ThemeToggle, CSS canvas variables for dark/light, cached CSS-var canvas token reader in designTokens.ts, server canvas renderer tokenized for core shapes/background, and initial legacy entity renderer tokenization. Build passes with pnpm build. Remaining work: migrate all hardcoded UI colors screen-by-screen, fully remove legacy entityColors usage, handle server-sent pickup colors/theme mapping, add chart/status tokens, and complete audit so raw visual colors only live in style.css.

### whaleen — 2026-04-27T02:47:15Z

Second slice completed. Tokenized more of the core shell and gameplay UI: OverlayManager, custom wallet modal, wallet dropdown, GameHUD, GameLayout/GameStateManager, PauseOverlay, LevelTransition, AudioWidget, VolumeControl, Kbd, shared Button/MenuButton variants, GameTitle, and shadcn Dialog overlay. Removed remaining entityColors consumers; legacy canvas entities now call getCanvasTokens(). Legacy game-blue/game-green/game-red Tailwind names are now theme-aware aliases, not fixed hexes. Build still passes with pnpm build. Next major pass should migrate actual screens/overlays: Title, Ready, GameOver, Account, Tokenomics, Leaderboard, Help, Chat, SendToSpace, SoundSettings, and token/account panels.

### whaleen — 2026-04-27T02:59:58Z

Third slice completed. Ran a broad semantic-token migration across app/src screens/components and removed remaining raw color utility usage outside theme definitions. Title/Ready animations now use CSS var glow tokens; Tokenomics donut/sparkline colors now use CSS vars; Admin chart colors now use CSS vars; chat/loading spinners, wallet helpers, sound controls, token/account/mining/gameover/dev surfaces were moved off hardcoded Tailwind color utilities. tokenColors.ts now reads deterministic token colors from CSS vars so space-token colors can be theme-specific; engineStore legacy canvas clear now uses getCanvasTokens(). Audit command now has no hits outside style.css/IDL: rg hardcoded colors and legacy text-white/bg-black/game-* patterns over app/src. pnpm build passes.

### whaleen — 2026-04-27T03:07:29Z

Bugfix from light-mode QA: bullets were invisible because server snapshots still send historical protocol colors like #fff, and the renderer was trusting snapshot.color directly. Added CSS-backed protocol color resolution in designTokens.ts (resolveCanvasColor) mapping old snapshot literals to current theme canvas vars. renderServerSnapshot now resolves bullet and pickup colors at draw time, so bullets use --canvas-bullet in light mode. Also added CSS-var-backed space token palette entries to CanvasTokens, restored a protocol palette only for matching server snapshots, and updated floating text / active pool matching so themed token colors don't break collection display. pnpm build passes.

### whaleen — 2026-04-27T03:14:41Z

Light/dark QA fix: title background image was still set by ScreenContainer, but the new theme-aware title gradients used opaque from-background/to-background stops, effectively covering the image. Relaxed those gradients to use translucent background stops so /assets/title.png is visible again while still theme-tinting the screen. pnpm build passes.

### whaleen — 2026-04-27T03:20:27Z

Asset theme support added: ScreenContainer now uses the new per-theme background assets: title-dark/title-light, ready-dark/ready-light, and end-game-dark/end-game-light. It reads the active theme from themeStore and swaps the background image per screen. pnpm build passes.

### whaleen — 2026-04-27T03:25:44Z

Visual polish from screenshot QA: fixed GameOver double-panel effect by rendering GameOverScreen in fullscreen ScreenContainer mode and keeping only the inner result panel. Also removed the Header's bg-background class so the top nav area is transparent over title/gameover backgrounds and the art reaches the top of the viewport. pnpm build passes.

### whaleen — 2026-04-27T03:27:21Z

Follow-up visual fix: removed ScreenContainer's full-screen tint overlays for INITIAL and GAME_OVER. Those screens already have their own foreground/gradient/panel treatments, and the generic overlay was making the themed background art too faint, especially in light mode. READY keeps its overlay. pnpm build passes.

### whaleen — 2026-04-27T03:31:07Z

Docs updated after theme completion. Added current theme system details to docs/status.md, docs/architecture.md, and docs/spec.md: persistent light/dark state, shadcn-compatible CSS variable source of truth, cached canvas token reader, protocol color resolution for server snapshots, and per-theme screen background assets. Closing as complete.

### whaleen — 2026-04-27T03:31:08Z

Completed and documented. Theme system is shipped: persistent UI/canvas light/dark mode, shadcn-compatible CSS vars, per-theme screen art, semantic color migration, server snapshot color resolution, and passing production build.
