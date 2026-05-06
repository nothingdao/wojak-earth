# Issue #17: Proposed: referral codes and referral fee sharing

- Source: https://github.com/nothingdao/astrds/issues/17
- State: OPEN
- Labels: enhancement, proposed, area:economy, area:social, type:design, priority:medium, needs-decision
- Assignees: none
- Created: 2026-04-27T04:07:43Z
- Updated: 2026-04-30T01:39:06Z

## Body

## Summary

Explore and design a referral code system for ASTRDS where players can share a code/link and receive a portion of future insert-quarter fees from referred players.

This is exploratory/proposed only. The goal is to design a referral system that fits the existing devnet game-payment architecture without making Insert Quarter unreliable or confusing.

## Current payment architecture

Current Insert Quarter flow:

```text
TitleScreen / AuthService
→ buildGamePaymentTransaction(connection, player, lamports)
→ on-chain `game_payment(amount)`
→ payment split by VaultConfig.payment_weights:
   operational_wallet
   operator_wallet
   buyback_vault PDA
→ frontend confirms tx
→ Convex verifyPayment creates verified session
→ game can start
```

Relevant files:

```text
programs/space-vault-program/src/lib.rs
app/src/lib/spaceVault.ts
app/src/auth/AuthService.ts
app/convex/verifyPayment.ts
app/convex/schema.ts
app/convex/gameSessions.ts
```

Important current constraint:

```text
game_payment is intentionally boring/reliable.
Meteora/liquidity work happens later via crank_liquidity.
```

Referral design should preserve this reliability.

## Product idea

A player can create/share a referral code:

```text
https://astrds.ndao.computer/?ref=NEBG
```

A new player who enters through that code is attributed to the referrer. The referrer can receive a portion of future play fees from that referred wallet.

Possible UI:

```text
Account → Referrals
Your code: NEBG
Share link: https://astrds.ndao.computer/?ref=NEBG
Referred players: 12
Referral earnings: 0.042 SOL
```

## Design goals

- Do not make Insert Quarter fragile.
- Do not allow self-referrals.
- Make attribution clear and auditable.
- Keep the system devnet-only until economy design is finalized.
- Make the game itself the referral dashboard.
- Avoid mainnet claims/yield language until legal/economy framing is decided.

## Non-goals for first version

- No multi-level referrals.
- No transferable referral codes.
- No guaranteed income claims.
- No automatic recurring subscription/referral model yet.
- No mainnet rollout yet.

## Open design question: on-chain payout vs accrued payout

There are two plausible approaches.

---

## Option A — Accrued referral rewards in Convex, paid manually/periodically

The Insert Quarter on-chain transaction stays exactly as-is.

Flow:

```text
player pays normal game_payment
→ Convex records verified payment
→ Convex detects player has referrer
→ Convex records referralReward owed
→ operator/admin periodically pays rewards from operator/treasury wallet
```

Pros:

- No on-chain program change.
- Insert Quarter stays simple and battle-tested.
- Easy to iterate on rates, caps, fraud rules.
- Easy to support retroactive admin adjustments during devnet.

Cons:

- Referral payout is not atomic with the player payment.
- Requires trusted off-chain accounting / periodic payout.
- Less transparent than direct on-chain split.

Good first prototype if we mainly want to validate UX and spam/fraud behavior.

---

## Option B — Direct on-chain referral split during Insert Quarter

Add a new instruction, e.g.:

```rust
pub fn game_payment_with_referrer(ctx, amount: u64, referral_bps: u16) -> Result<()>
```

Accounts:

```text
player signer
vault_config
operational_wallet
operator_wallet
buyback_vault
referrer_wallet
system_program
```

Payment split could be:

```text
operational_amount = configured operational_bps
buyback_amount = configured buyback_bps
operator_gross = configured operator_bps
referral_amount = operator_gross * referral_bps / 10_000
operator_net = operator_gross - referral_amount
```

This preserves the existing global split while carving referral payment out of the operator share.

Pros:

- Referrer gets paid atomically at Insert Quarter.
- More transparent on-chain.
- No later payout process needed.

Cons:

- Requires Anchor program change/deploy/IDL sync.
- Adds one more writable account to Insert Quarter.
- Need strong client/server validation that the passed referrer wallet matches Convex attribution.
- More edge cases: missing referrer, self-referral, code changes, wallet ownership.

Recommended only after the attribution model is stable.

---

## Recommended phased approach

### Phase 1 — Attribution only

Add referral-code primitives without changing payment splits.

Convex tables:

```ts
referralCodes: defineTable({
  code: v.string(),
  ownerWalletAddress: v.string(),
  createdAt: v.number(),
  status: v.union(v.literal('active'), v.literal('disabled')),
})
  .index('by_code', ['code'])
  .index('by_owner', ['ownerWalletAddress'])
```

```ts
referralAttributions: defineTable({
  referredWalletAddress: v.string(),
  referrerWalletAddress: v.string(),
  code: v.string(),
  attributedAt: v.number(),
  source: v.union(v.literal('url'), v.literal('manual'), v.literal('admin')),
})
  .index('by_referred', ['referredWalletAddress'])
  .index('by_referrer', ['referrerWalletAddress'])
```

Rules:

- First valid attribution wins.
- Cannot refer yourself.
- Code owner must be active.
- Attribution happens when wallet connects or when player confirms referral before first game.

UI:

```text
Account → Referrals
- create/view referral code
- copy share link
- show referred wallet count
- show pending design note: rewards not enabled yet
```

### Phase 2 — Off-chain/accrued devnet rewards

Add reward accounting after each verified Insert Quarter.

Schema:

```ts
referralRewards: defineTable({
  referredWalletAddress: v.string(),
  referrerWalletAddress: v.string(),
  gameSessionId: v.optional(v.id('gameSessions')),
  paymentTxSignature: v.string(),
  paymentLamports: v.number(),
  rewardLamports: v.number(),
  rewardBps: v.number(),
  status: v.union(v.literal('pending'), v.literal('paid'), v.literal('cancelled')),
  createdAt: v.number(),
  paidTxSignature: v.optional(v.string()),
  paidAt: v.optional(v.number()),
})
  .index('by_referrer_status', ['referrerWalletAddress', 'status'])
  .index('by_payment_tx', ['paymentTxSignature'])
```

Convex `verifyPayment` would:

1. Create verified session as today.
2. Look up attribution by payer wallet.
3. If present, insert `referralRewards` pending row.

This needs stronger payment verification than the current stub. Today `verifyPayment` trusts the already-confirmed frontend tx signature. Before reward accounting, it should parse tx instructions/balances enough to verify:

- payer wallet
- program id / `game_payment` instruction
- amount paid
- operational/operator/buyback destinations

### Phase 3 — Direct on-chain split

After devnet reward UX is validated, add an Anchor instruction for direct referral payout.

Possible route:

- Keep existing `game_payment` unchanged for no-referral players.
- Add `game_payment_with_referrer` instead of trying to make referrer optional in the existing instruction.
- Referral bps should probably be capped on-chain by config or constant.
- Carve referral out of operator share, not buyback or operational, unless economy design says otherwise.

Frontend:

```ts
buildGamePaymentTransaction({ referrer?: PublicKey })
```

If a valid referrer exists, build the referral instruction; otherwise build the current instruction.

Convex still records attribution and reward stats for dashboarding, even if payout is on-chain.

## Referral rate questions

Open questions:

- What referral percentage?
  - Example: 5–10% of operator share, not 5–10% of total payment.
- Is referral lifetime permanent or time-limited?
  - lifetime, first 30 days, first N games, etc.
- Should the referred player get a discount or bonus?
  - Be careful: discounts reduce quarter economics and may affect buyback.
- Should reward eligibility require membership or recent play?
- Should referral payouts have a minimum threshold?

## Abuse considerations

- Self-referral should be blocked.
- Wallet farming is possible; paid play cost limits abuse somewhat.
- Do not give gameplay/emission advantage for referrals in first version.
- Codes should be disable-able by admin.
- Attribution should be visible to the referred player before payment.
- Consider only attributing before the referred wallet's first paid game.

## Suggested first implementation

Start with Phase 1 only:

```text
Referral code table
→ URL param capture (?ref=CODE)
→ first-touch wallet attribution
→ Account referrals panel
→ no rewards yet
```

Then add Phase 2 devnet reward accounting after payment verification is strengthened.

## Acceptance criteria for Phase 1

- Player can create or view their referral code.
- Player can copy a referral link.
- Visiting `?ref=CODE` stores pending referral locally.
- On wallet connect, app can attribute wallet to the referrer if valid.
- Self-referral is rejected.
- Existing attribution cannot be overwritten by a new code.
- Account screen shows referral stats.
- No payment split changes yet.

