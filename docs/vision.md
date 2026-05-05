# Vision

Earth is the parent world/hub for the nothingdao game universe. ASTRDS remains accessible as a standalone game at its own URL, but it participates in the same wallet-based universe.

## Identity model

1. **Wallet profile** — a pragmatic shared profile containing what Earth and ASTRDS currently require. On-chain wallet state remains canonical.
2. **Earth character** — a minted Earth character NFT is required to play Earth. A wallet can exist before it has an Earth character.
3. **Game activity** — each game records its own sessions, scores, progression, rewards, and transient accounting in Convex.

ASTRDS does not require an Earth character. Earth gameplay does. Earth-character-gated ASTRDS benefits may be added later, but are not launch-critical.

## On-chain asset layer

On-chain data is king. A wallet is a wallet. Earth and ASTRDS share the same Solana asset layer; either game may read and use wallet-held tokens/NFTs when design calls for it. Convex must not be treated as the source of truth for token/NFT ownership.

## NPCs

NPCs are first-class wallet-backed, minted Earth characters controlled by automation. The NPC engine is intended for both progression/load testing and autonomous launch-time world population. NPCs must use the same authoritative action validation as human players.
