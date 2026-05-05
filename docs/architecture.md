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

- **Solana/on-chain** is canonical for wallet assets, token balances, NFTs, and ownership.
- **Convex** stores realtime game data, transient/ephemeral accounting, sessions, scores, story/progression state, and cached/indexed convenience data.
- **server/earth** performs privileged operations: Earth minting, R2 writes, payment verification, bridge operations, and ASTRDS authoritative WebSocket gameplay.
- **Clients** render UI and request actions; they do not decide economy-critical outcomes.

## ASTRDS

ASTRDS must remain server-authoritative for anti-cheat/security. The frontend sends input and renders snapshots. The server owns simulation, game session state, and reward authority. Convex persists sessions, config, scores, claims, and related realtime state.

## Earth

Earth gameplay requires a minted Earth character. Earth should be authoritative to the extent needed to prevent cheating: normal game state and progression should be validated through Convex/server-controlled logic, while privileged blockchain/storage/payment operations stay in `server/earth`.

## NPC engine

`server/earth-npc-engine` is intentionally not launch-path yet. It was moved from the Earth app because the target runtime is Railway. It still requires migration away from legacy assumptions before production use.
