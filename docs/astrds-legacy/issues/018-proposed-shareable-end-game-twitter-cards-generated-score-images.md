# Issue #18: Proposed: shareable end-game Twitter cards / generated score images

- Source: https://github.com/nothingdao/astrds/issues/18
- State: OPEN
- Labels: enhancement, proposed, area:frontend, area:social, priority:low
- Assignees: none
- Created: 2026-04-27T04:13:06Z
- Updated: 2026-04-30T01:39:08Z

## Body

## Summary

Add shareable end-game score cards for ASTRDS: generated images showing a player's game-over stats that can be downloaded/copied/shared, with a future path toward true Twitter/X/Open Graph cards that unfurl from a URL.

This is proposed/exploratory for now. The immediate value is making the end-game result feel like a collectible social object.

## Product idea

At game over, show a share action:

```text
[Share Score]
```

The generated card could include:

```text
ASTRDS
GAME OVER

Score: 12,450
Level: 8
ASTRDS mined: 42
Pills collected: 9
Space tokens collected: 3
Rank: #7

astrds.ndao.computer
```

Possible visual styles:

- Matches current light/dark theme.
- Uses the corresponding end-game background art.
- Uses game typography / vector arcade framing.
- Includes wallet short address or player avatar if available.
- Includes referral/link CTA later if referral codes ship.

## Goals

- Give players a satisfying social artifact after each run.
- Let players share scores without taking a manual screenshot.
- Support both light/dark visual modes.
- Keep first implementation compatible with current static Netlify frontend.
- Provide a future path to real Twitter/X/Discord unfurl cards.

## Non-goals for first version

- No server-side OG image rendering required in Phase 1.
- No mainnet-specific claims.
- No financial/yield language.
- No automatic posting to X/Twitter.

## Current architecture constraints

Current app hosting is static Netlify. Convex handles backend state/actions, but Convex is not ideal as a dynamic image renderer for crawler-facing social cards.

A true Twitter/X card requires a publicly reachable URL that returns HTML with tags like:

```html
<meta property="og:title" content="ASTRDS — 12,450 points" />
<meta property="og:description" content="Level 8 · 42 ASTRDS mined" />
<meta property="og:image" content="https://astrds.ndao.computer/api/og/abc123.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="https://astrds.ndao.computer/api/og/abc123.png" />
```

A pure client-side React route generally will not be enough for crawlers.

## Phase 1 — Client-generated share image

Generate a PNG in the browser from game-over stats.

Possible approaches:

### Option A: Canvas renderer

Create a dedicated canvas function:

```ts
renderShareCard(canvas, stats, theme)
```

Pros:
- no extra DOM screenshot dependency
- precise, reliable output
- can reuse theme tokens from `designTokens.ts`
- works with static hosting

Cons:
- layout is manual
- custom text wrapping needed

### Option B: DOM → image

Use a hidden React component and a package like `html-to-image`.

Pros:
- faster to style with existing CSS/Tailwind
- easier layout iteration

Cons:
- additional dependency
- font/image loading quirks
- can be brittle across browsers

Recommended Phase 1 approach: **canvas renderer** for reliability.

GameOver UI actions:

```text
Share Score
Copy image
Download PNG
Copy share text
```

Share text example:

```text
I scored 12,450 in ASTRDS and mined 42 $ASTRDS 🚀
https://astrds.ndao.computer
```

Implementation files likely involved:

```text
app/src/screens/gameover/GameOverScreen.tsx
app/src/lib/shareCards.ts
app/src/lib/designTokens.ts
app/src/stores/themeStore.ts
```

## Phase 2 — Share records

Store shareable stats in Convex so the card has a stable ID.

Proposed schema:

```ts
shareCards: defineTable({
  walletAddress: v.string(),
  gameSessionId: v.optional(v.id('gameSessions')),
  score: v.number(),
  level: v.number(),
  astrdsEarned: v.number(),
  pillsCollected: v.optional(v.number()),
  spaceTokensCollected: v.optional(v.number()),
  rank: v.optional(v.number()),
  theme: v.union(v.literal('dark'), v.literal('light')),
  createdAt: v.number(),
})
  .index('by_wallet', ['walletAddress'])
  .index('by_game_session', ['gameSessionId'])
```

Convex functions:

```ts
shareCards.create
shareCards.get
shareCards.getByGameSession
```

Share URL:

```text
https://astrds.ndao.computer/s/<shareId>
```

In Phase 2, this URL may still show a client-rendered share page, but it gives us stable share records and analytics.

## Phase 3 — Real OG/Twitter/X cards

Add server-rendered HTML + image route.

Potential routes:

```text
/s/:shareId
/api/og/:shareId.png
```

Possible render backends:

- Netlify Function with `satori`/`resvg` or `@vercel/og`-style renderer
- Small dedicated Node image-render service
- Cloudflare Worker + image rendering library if suitable
- Pre-generated PNG uploaded to Convex/R2, plus server-rendered HTML route for metadata

Recommended architecture for true cards:

```text
Convex shareCards table = source of stats
Netlify/edge/server route = returns crawler-readable HTML metadata
OG image endpoint = renders PNG from share stats and theme
```

## Card contents

Minimum:

- ASTRDS logo/title
- Score
- Level reached
- ASTRDS mined
- Game-over label
- Site URL

Nice-to-have:

- Player avatar
- Short wallet address
- Rank / personal best marker
- Space token symbols collected
- Theme-specific background art
- QR code or referral code later

## Theme support

Cards should respect the active theme:

```text
dark → deep-space style
light → moon-dust style
```

Use existing theme infrastructure:

```text
style.css CSS vars
getCanvasTokens()
themeStore mode
/assets/end-game-dark.png
/assets/end-game-light.png
```

## Privacy / safety

- Use short wallet address by default.
- Do not expose full wallet address unless user opts in.
- Do not include exact claimable token balances beyond what game-over UI already shows.
- Avoid financial language beyond gameplay stats.

## Acceptance criteria — Phase 1

- GameOver screen has a `Share Score` action.
- Player can generate a PNG score card.
- Player can download the PNG.
- Player can copy share text.
- Card includes score, level, ASTRDS mined, and site URL.
- Card respects light/dark theme.
- Works without server functions.

## Acceptance criteria — Future OG phase

- Share URL exists for a game result.
- URL returns crawler-readable OG/Twitter metadata.
- `og:image` points to a generated image endpoint or stored PNG.
- X/Twitter, Discord, and Telegram unfurl the card.
- Share records are tied to a real game session where possible.

## Open questions

- Should cards be generated for every game automatically or only when player clicks Share?
- Should the card use the current active theme or always use a canonical brand theme?
- Should the card include player avatar?
- Should shared cards be public forever?
- Should players be able to delete/hide share cards?
- Should referral codes eventually be embedded in share links?

