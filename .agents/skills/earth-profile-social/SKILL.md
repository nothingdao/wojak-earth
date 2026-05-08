---
name: earth-profile-social
description: Work on Earth/ASTRDS wallet profiles, identity, chat, groups, DMs, permissions, presence, or spectating. Use for social/profile issues such as #26 and #27.
---

# Earth Profile and Social

Earth is the parent world/hub, but ASTRDS remains standalone-accessible. Wallet identity is shared across both.

## Identity model

- A wallet is the shared identity anchor.
- A wallet can exist without an Earth character.
- Earth gameplay requires an active minted Earth character NFT.
- ASTRDS does not require an Earth character.
- Earth-character-gated ASTRDS benefits may be added later, but are not launch-critical.

## Shared wallet profile

Use `docs/profile.md` as the canonical profile reference.

Current lookup pattern:

```ts
api.profiles.getByWallet({ walletAddress })
api.profiles.getManyByWallets({ walletAddresses })
api.profiles.getAvatarUrls({ walletAddresses })
```

The profile may include:

- `walletAddress`
- optional display metadata/avatar
- optional active Earth character pointer and cached NFT display fields
- derived ASTRDS stats from session/score tables

Convex NFT fields are display/workflow pointers, not proof of ownership. Verify from chain when ownership matters.

## Social design constraints

When designing chat, groups, DMs, permissions, or spectating:

- Make wallet/profile concepts Earth-wide when they span both games.
- Keep ASTRDS-only gameplay UX scoped to `apps/astrds` unless it creates reusable infrastructure.
- Preserve server-authoritative gameplay for spectating; spectators should receive snapshots/readonly state, not influence simulation.
- Permission decisions that affect economy/progression must be server/Convex-authoritative.
- Avoid Supabase and Netlify Functions.

## Files to inspect

```txt
docs/profile.md
docs/vision.md
docs/architecture.md
convex/profiles.ts
convex/chat.ts
convex/earth/chat.ts
apps/astrds/src/components/common/PlayerProfile.tsx
apps/astrds/src/types/chat.ts
apps/earth/src/hooks/usePlayerCharacter.ts
```

## Validation

Run relevant app/backend builds and Convex deployment:

```bash
npx convex dev --once
pnpm --filter earth-2089 build
pnpm --filter solana-asteroids build
pnpm --filter earth-server build
```
