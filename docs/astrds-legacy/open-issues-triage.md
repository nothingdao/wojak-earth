# ASTRDS Open Issues — Initial Monorepo Triage

Imported from `nothingdao/astrds`. This is a first-pass triage guide, not canonical Earth planning.

| # | Title | Initial bucket | Notes |
|---:|---|---|---|
| [5](https://github.com/nothingdao/astrds/issues/5) | Economy: harden emission model and migrate economic state on-chain | economy/on-chain design | Needs rewrite against Earth shared economy, Convex, server/earth, and current Solana program model. |
| [10](https://github.com/nothingdao/astrds/issues/10) | Assess and phase migration from @solana/web3.js to @solana/kit | infra/migration | Workspace standard prefers `@anza-xyz/kit`; assess after monorepo dependencies settle. |
| [14](https://github.com/nothingdao/astrds/issues/14) | Build chat rooms, groups, DMs, mentions, and social permissions | social/product feature | Decide whether this belongs to standalone ASTRDS, Earth-wide identity/social, or both. |
| [17](https://github.com/nothingdao/astrds/issues/17) | Proposed: referral codes and referral fee sharing | economy/on-chain design | Needs rewrite against Earth shared economy, Convex, server/earth, and current Solana program model. |
| [18](https://github.com/nothingdao/astrds/issues/18) | Proposed: shareable end-game Twitter cards / generated score images | social/product feature | Decide whether this belongs to standalone ASTRDS, Earth-wide identity/social, or both. |
| [20](https://github.com/nothingdao/astrds/issues/20) | Add live game spectating | social/product feature | Decide whether this belongs to standalone ASTRDS, Earth-wide identity/social, or both. |
| [21](https://github.com/nothingdao/astrds/issues/21) | Proposed: memberships and liquidity boosts | economy/on-chain design | Needs rewrite against Earth shared economy, Convex, server/earth, and current Solana program model. |
| [33](https://github.com/nothingdao/astrds/issues/33) | Economy: migrate ASTRDS to fixed-supply emission vault | economy/on-chain design | Needs rewrite against Earth shared economy, Convex, server/earth, and current Solana program model. |
| [34](https://github.com/nothingdao/astrds/issues/34) | Tests: Anchor coverage for ASTRDS emission vault | validation/tests | Re-check paths in Earth monorepo; likely still relevant if matching code remains. |
| [35](https://github.com/nothingdao/astrds/issues/35) | Tests: Vitest coverage for emission claim-path and settlement derivation | validation/tests | Re-check paths in Earth monorepo; likely still relevant if matching code remains. |
| [36](https://github.com/nothingdao/astrds/issues/36) | Tests: server finalize/disconnect settlement coverage | validation/tests | Re-check paths in Earth monorepo; likely still relevant if matching code remains. |
| [37](https://github.com/nothingdao/astrds/issues/37) | Audio system: event coverage, level-range stingers, and sound settings UI | ASTRDS UX/audio | Likely ASTRDS-specific; reconcile with planned R2 `astrds-audio` storage. |
