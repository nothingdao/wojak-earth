# Architecture

## Monorepo shape

```txt
apps/
  earth/      Earth frontend, static Netlify site
  astrds/     ASTRDS frontend, static Netlify site
server/
  earth/      Unified Railway runtime for Earth + ASTRDS
  earth-npc-engine/  Future continuous NPC/simulation service, pending migration
convex/       Shared Convex backend for both games
packages/     Shared TypeScript packages
programs/     Solana/Anchor programs
```

## Authority model

- **Solana/on-chain** is canonical for wallet assets, token balances, NFTs, custody, payment receipts, and ownership.
- **Convex** stores wallet profile metadata, realtime game data, fast in-game ledgers, sessions, scores, story/progression state, and cached/indexed convenience data. Convex balances that can be withdrawn must be backed by on-chain vault custody.
- **server/earth** performs privileged operations: Earth NFT/media production, R2 writes, payment/receipt verification, bridge authorization, and ASTRDS authoritative WebSocket gameplay.
- **Clients** render UI and request actions; they do not decide economy-critical outcomes.

## ASTRDS

ASTRDS must remain server-authoritative for anti-cheat/security. The frontend sends input and renders snapshots. The server owns simulation, game session state, and reward authority. Convex persists sessions, config, scores, claims, and related realtime state.

## Earth

Earth gameplay requires a minted Earth character NFT. The planned Earth Vault Program is separate from the ASTRDS Space Vault Program and owns Earth payment, issuance, escrow, and bridge edges. `server/earth` should continue to own character image generation, R2 writes, NFT metadata, and initial NFT mint orchestration after verifying Earth Vault receipts.

EARTH is intended to be a transferable Token-2022 wallet token and also the fast in-game balance. To avoid wallet signatures for every travel, market, crafting, or story action, in-game EARTH is tracked by Convex/server logic but must be backed by EARTH held in Earth Vault escrow. Wallet signatures should be required only for character mint payment, buying EARTH, depositing wallet EARTH into game escrow, and withdrawing EARTH back to wallet.

## NPC engine

`server/earth-npc-engine` is intentionally not launch-path yet. It was moved from the Earth app because the target runtime is Railway. It still requires migration away from legacy assumptions before production use.
