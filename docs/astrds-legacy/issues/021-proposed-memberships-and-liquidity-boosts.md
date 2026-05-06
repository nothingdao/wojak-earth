# Issue #21: Proposed: memberships and liquidity boosts

- Source: https://github.com/nothingdao/astrds/issues/21
- State: OPEN
- Labels: proposed, area:economy, area:social, type:design, priority:medium, needs-decision
- Assignees: none
- Created: 2026-04-29T21:41:25Z
- Updated: 2026-04-30T01:39:15Z

## Body

## Summary

Add paid memberships and optional liquidity boosts as separate economy/support features for ASTRDS.

This is split out from #14 so #14 can focus on chat, rooms, groups, permissions, and social messaging.

## Goals

- Create a recurring/support revenue primitive separate from Insert Quarter.
- Give supporters visible non-gameplay status/cosmetic privileges.
- Let players voluntarily support the ASTRDS/SOL pool through a clearly labeled liquidity boost flow.
- Keep all benefits non-pay-to-win.
- Keep liquidity boosts clearly separate from player-owned LP positions.

## Non-goals

- Do not require membership to play.
- Do not give members gameplay advantages affecting score/emissions.
- Do not describe liquidity boosts as yield, LP ownership, or an investment product.
- Do not build player-owned Meteora LP positions in this first phase.

## Product concepts

### Membership

Paid app/game membership:

```text
monthly SOL payment
→ active membership window
→ badge + social/cosmetic privileges
```

Membership can optionally be used as one input to app permissions, but chat/group permissions are tracked in #14.

### Boost Liquidity

Voluntary support flow:

```text
player sends SOL
→ buyback vault / liquidity queue
→ future liquidity crank
→ permanently locked ASTRDS/SOL liquidity
```

Required UX language:

```text
You receive no LP tokens.
You cannot withdraw this SOL.
This permanently supports the ASTRDS pool.
```

Boosting may grant membership time, badges, or cosmetic/social recognition, but must not be described as yield.

### Player-owned LP — later / out of scope

A separate future feature could allow real player-owned LP positions:

```text
player supplies ASTRDS + SOL
→ player owns Meteora position
→ player may earn fees
→ player can remove liquidity
```

Out of scope here.

## Suggested Convex schema

```ts
memberships: defineTable({
  walletAddress: v.string(),
  tier: v.union(
    v.literal('member'),
    v.literal('founder')
  ),
  status: v.union(v.literal('active'), v.literal('expired')),
  startedAt: v.number(),
  expiresAt: v.number(),
  paymentTxSignature: v.string(),
  amountLamports: v.number(),
  source: v.union(
    v.literal('membership_payment'),
    v.literal('liquidity_boost'),
    v.literal('admin_grant')
  ),
})
  .index('by_wallet', ['walletAddress'])
  .index('by_status', ['status'])
```

```ts
liquidityBoosts: defineTable({
  walletAddress: v.string(),
  txSignature: v.string(),
  amountLamports: v.number(),
  boostedAt: v.number(),
  grantsMembershipUntil: v.optional(v.number()),
})
  .index('by_wallet', ['walletAddress'])
  .index('by_tx', ['txSignature'])
```

Possible helpers:

```ts
getMembership(walletAddress)
recordMembershipPayment(...)
recordLiquidityBoost(...)
getMembershipBadge(walletAddress)
```

## On-chain options

### Option A: Plain SOL transfer + Convex verification

Fastest path.

- Membership payment is a normal SOL transfer to configured treasury/operator wallet.
- Convex verifies transaction and records membership.

Pros:
- simple
- no program upgrade required

Cons:
- less semantically explicit on-chain
- transaction verification must infer intent from amount/destination

### Option B: Anchor `membership_payment` instruction

Cleaner path.

```rust
pub fn membership_payment(ctx: Context<MembershipPayment>, amount: u64) -> Result<()>
```

Transfers SOL to membership treasury/operator destination.

Pros:
- explicit instruction semantics
- easier Convex verification
- better explorer readability

Cons:
- requires program change/deploy

### Option C: Anchor `boost_liquidity` instruction

For liquidity boosts.

```rust
pub fn boost_liquidity(ctx: Context<BoostLiquidity>, amount: u64) -> Result<()>
```

Transfers SOL from player to `buyback_vault` PDA / liquidity queue.

Pros:
- reuses existing crank pipeline
- explicit support transaction
- easy to track boosters

Cons:
- must be very clear this is not LP ownership

## UI proposal

### Account → Membership

Show:

```text
Status: Member until <date>
Tier: Member / Founder
Renew: <amount> SOL / month
Badge preview
```

Actions:

```text
Buy Membership
Renew Membership
```

### Economy → Boost Liquidity

Show:

```text
Boost Liquidity
[ 0.01 ] SOL [Send to Liquidity Queue]

This sends SOL to the protocol liquidity queue.
The next crank converts queued SOL into permanently locked ASTRDS/SOL liquidity.
You do not receive LP tokens and cannot withdraw this SOL.
```

Stats:

```text
Total Boosted
Recent Boosters
Your Boosted SOL
Pending Crank SOL
```

## Suggested implementation phases

### Phase 1 — Membership foundation

- Add Convex `memberships` table.
- Add query/helper for active membership.
- Add dev/admin grant for local testing.
- Show membership badge in Account/Header/Chat where relevant.

### Phase 2 — Membership payment

- Add membership purchase UI in Account.
- Add payment verification and membership extension.
- Prefer Anchor `membership_payment` instruction if explicit on-chain semantics are desired.

### Phase 3 — Boost Liquidity

- Add `liquidityBoosts` table.
- Add boost transaction flow.
- Route SOL to existing buyback/liquidity queue.
- Record boost in Convex after tx verification.
- Show boosters in Economy tab.
- Optionally grant membership time based on boost amount.

### Phase 4 — Polish / social status

- Badges in Header / Account / Chat.
- Booster leaderboard.
- Cosmetic flair: name color, ship trail, profile frame.

## Open questions

- Membership price and duration?
- Should liquidity boosts grant membership time automatically?
- Should membership revenue go to operational wallet, operator wallet, treasury, or split by weights?
- Should membership be represented only in Convex or also with an on-chain account/NFT later?
- What badge/tier names fit the ASTRDS tone?


## Comments

### whaleen — 2026-04-29T21:42:27Z

Split from #14. Chat/social rooms and permissions remain tracked there; this issue tracks membership payments, supporter status, and liquidity boosts.

