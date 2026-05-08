# Shared Wallet Profile

The shared profile primitive is wallet-keyed and intentionally minimal. It gives Earth and ASTRDS one lookup pattern for cross-game identity without making Convex canonical for on-chain ownership.

## Canonical model

- `walletAddress` is the identity anchor. A wallet can play ASTRDS without an Earth character.
- `walletProfiles` stores editable convenience metadata only: optional `displayName`, optional avatar storage reference, and timestamps.
- Earth character data remains in `earth_characters`; a profile query may include an optional active character pointer plus cached NFT mint fields for display. NFT ownership must still be verified from chain when ownership matters.
- ASTRDS stats are derived from ASTRDS session/score tables at query time; they are not duplicated into the profile row.

## Lookup pattern

- Use `api.profiles.getByWallet({ walletAddress })` for a single wallet in either app.
- Use `api.profiles.getManyByWallets({ walletAddresses })` or `api.profiles.getAvatarUrls({ walletAddresses })` for lists such as leaderboards, chat, and spectating.
- Earth gameplay remains gated by `api.earth.characters.getFullByWallet`; the shared profile is for identity/display context, not permission to play Earth.

## Current fields returned

```ts
{
  walletAddress: string
  displayName: string | null
  avatarUrl: string | null
  earthCharacter: null | {
    id: Id<'earth_characters'>
    name: string
    imageUrl: string | null
    nftAddress: string | null
    tokenId: string | null
  }
  astrds: {
    gamesPlayed: number
    bestScore: number | null
  }
  updatedAt: number | null
}
```
