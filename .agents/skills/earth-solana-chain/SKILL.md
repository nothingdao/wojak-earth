---
name: earth-solana-chain
description: Work on Solana, Anchor programs, wallets, token/NFT ownership, ASTRDS Token-2022, Earth character minting, or migration from @solana/web3.js to @anza-xyz/kit.
---

# Earth Solana Chain

On-chain data is king. A wallet is a wallet.

## Canonical principle

- Solana/on-chain state is canonical for wallet assets, token balances, NFTs, custody, settlement, and ownership.
- Convex can cache display/convenience references but must not be treated as proof of token/NFT ownership.
- Use chain verification when ownership affects authorization, economy, or gameplay access.

## References to read

Before chain work, read:

```txt
docs/chain.md
docs/economy.md
docs/architecture.md
docs/env-vars.md
```

## Current Solana model

- Earth character NFT minting routes through `server/earth`.
- Earth gameplay requires a minted Earth character NFT.
- ASTRDS is a Token-2022 token on devnet.
- ASTRDS fixed-supply/emission-vault hardening is tracked by issue #28 unless superseded.
- ASTRDS Insert Quarter, emission settlement, claims, deposits, and liquidity flows are handled by the Space Vault Program.

## Library direction

Workspace standard: Solana projects should migrate from `@solana/web3.js` to `@anza-xyz/kit` over time.

- Prefer `@anza-xyz/kit` for new Solana code where feasible.
- Do not start broad migrations unless the issue asks for it; phase migration under issue #33.
- Avoid adding new `@solana/web3.js` usage unless required by wallet adapters, Anchor, Metaplex, or local compatibility.

## Secrets and env vars

Private keys are stored as JSON byte arrays, never base58 strings. Never commit secrets.

Relevant env docs:

- Railway: `TREASURY_KEYPAIR_SECRET`, `SERVER_KEYPAIR_SECRET`, `SOLANA_RPC_URL`
- Convex: `PROGRAM_AUTHORITY_PRIVATE_KEY`, `SETTLEMENT_PAYER_PRIVATE_KEY`, `SOLANA_RPC_ENDPOINT`
- Netlify frontends: public `VITE_*` values only

## Validation

Run relevant builds/tests:

```bash
pnpm --filter earth-2089 build
pnpm --filter solana-asteroids build
pnpm --filter earth-server build
npx convex dev --once
```

If programs are touched, use the appropriate Anchor/Cargo tests for `programs/` and document exact commands in the GitHub issue.
